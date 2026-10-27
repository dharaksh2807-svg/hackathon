-- Apply after 001. Public RPCs are executable ONLY by the trusted server.
BEGIN;

CREATE UNIQUE INDEX shifts_one_checked_in_per_membership
  ON public.shifts(worker_membership_id) WHERE status = 'CHECKED_IN';
ALTER TABLE public.shifts ADD CONSTRAINT shift_rule_basis_check CHECK (
  (pay_basis = 'HOURLY' AND overtime_after_minutes > 0) OR
  (pay_basis = 'PER_SHIFT' AND overtime_after_minutes = 0));
ALTER TABLE public.shifts ADD CONSTRAINT completed_paid_minutes_check CHECK (
  status <> 'COMPLETED' OR
  floor(extract(epoch FROM (checked_out_at - checked_in_at))/60) - unpaid_break_minutes BETWEEN 1 AND 1440);
ALTER TABLE public.disputes ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Provisioning stays admin-only. All newly inserted shifts copy the current rule;
-- later configuration edits cannot rewrite an existing shift's earnings.
CREATE FUNCTION private.snapshot_shift_rule() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE c public.sector_configs; worker_role text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.organization_id, NEW.worker_membership_id, NEW.scheduled_start_at,
      NEW.scheduled_end_at, NEW.weekend_eligible, NEW.rule_version, NEW.pay_basis,
      NEW.rate_minor, NEW.overtime_after_minutes, NEW.overtime_multiplier_bps,
      NEW.fixed_allowance_minor, NEW.weekend_bonus_minor)
      IS DISTINCT FROM ROW(OLD.organization_id, OLD.worker_membership_id, OLD.scheduled_start_at,
      OLD.scheduled_end_at, OLD.weekend_eligible, OLD.rule_version, OLD.pay_basis,
      OLD.rate_minor, OLD.overtime_after_minutes, OLD.overtime_multiplier_bps,
      OLD.fixed_allowance_minor, OLD.weekend_bonus_minor) THEN
      RAISE EXCEPTION 'INVALID_STATE';
    END IF;
    RETURN NEW;
  END IF;
  SELECT role INTO worker_role FROM public.worker_memberships
    WHERE id = NEW.worker_membership_id AND organization_id = NEW.organization_id;
  IF worker_role IS DISTINCT FROM 'WORKER' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO c FROM public.sector_configs WHERE organization_id = NEW.organization_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  NEW.rule_version := c.version;
  NEW.pay_basis := c.pay_basis;
  NEW.rate_minor := c.rate_minor;
  NEW.overtime_after_minutes := c.overtime_after_minutes;
  NEW.overtime_multiplier_bps := c.overtime_multiplier_bps;
  NEW.fixed_allowance_minor := c.fixed_allowance_minor;
  NEW.weekend_bonus_minor := c.weekend_bonus_minor;
  NEW.weekend_eligible := extract(isodow FROM NEW.scheduled_start_at AT TIME ZONE 'Asia/Kolkata') IN (6,7);
  RETURN NEW;
END;
$$;
CREATE TRIGGER snapshot_shift_rule BEFORE INSERT OR UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION private.snapshot_shift_rule();

CREATE TABLE public.dispute_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  shift_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('OPEN','APPROVED','REJECTED')),
  actor_membership_id uuid NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (shift_id, organization_id) REFERENCES public.shifts(id, organization_id),
  FOREIGN KEY (actor_membership_id, organization_id) REFERENCES public.worker_memberships(id, organization_id)
);
CREATE INDEX dispute_history_dispute_idx ON public.dispute_history(dispute_id, created_at, id);
ALTER TABLE public.dispute_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY dispute_history_read ON public.dispute_history FOR SELECT TO authenticated
  USING (private.can_read_shift(organization_id, shift_id));
REVOKE ALL ON public.dispute_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dispute_history TO authenticated, service_role;
GRANT INSERT ON public.dispute_history TO service_role;
-- Preserve any Phase 0 disputes on upgrade as well as fresh seed data.
INSERT INTO public.dispute_history(dispute_id, organization_id, shift_id, status, actor_membership_id, explanation, created_at)
SELECT id, organization_id, shift_id, 'OPEN', opened_by_membership_id, NULL, created_at FROM public.disputes;
INSERT INTO public.dispute_history(dispute_id, organization_id, shift_id, status, actor_membership_id, explanation, created_at)
SELECT id, organization_id, shift_id, status, resolved_by_membership_id, resolution_explanation, resolved_at
FROM public.disputes WHERE status <> 'OPEN';

-- AFTER is required because the history FK references the newly created dispute.
CREATE FUNCTION private.append_dispute_history() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.dispute_history(dispute_id, organization_id, shift_id, status, actor_membership_id, explanation)
  VALUES (NEW.id, NEW.organization_id, NEW.shift_id, NEW.status,
    CASE WHEN NEW.status = 'OPEN' THEN NEW.opened_by_membership_id ELSE NEW.resolved_by_membership_id END,
    NEW.resolution_explanation);
  RETURN NEW;
END;
$$;
CREATE FUNCTION private.audit_dispute() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.status <> 'OPEN' OR NEW.status = 'OPEN' OR
    ROW(NEW.organization_id, NEW.shift_id, NEW.opened_by_membership_id, NEW.reason, NEW.created_at)
    IS DISTINCT FROM ROW(OLD.organization_id, OLD.shift_id, OLD.opened_by_membership_id, OLD.reason, OLD.created_at)) THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER audit_dispute BEFORE INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION private.audit_dispute();
CREATE TRIGGER append_dispute_history AFTER INSERT OR UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION private.append_dispute_history();

-- Row locks keep a membership/role valid throughout each transaction.
CREATE FUNCTION private.actor_membership(p_actor uuid, p_org uuid, p_role text)
RETURNS public.worker_memberships LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE m public.worker_memberships;
BEGIN
  SELECT * INTO m FROM public.worker_memberships
    WHERE auth_user_id = p_actor AND organization_id = p_org FOR SHARE;
  IF NOT FOUND OR m.role <> p_role THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN m;
END;
$$;
CREATE FUNCTION private.actor_shift(p_actor uuid, p_shift uuid, p_role text)
RETURNS public.shifts LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE s public.shifts; m public.worker_memberships;
BEGIN
  SELECT sh.* INTO s FROM public.shifts sh WHERE sh.id = p_shift AND EXISTS (
    SELECT 1 FROM public.worker_memberships wm WHERE wm.organization_id = sh.organization_id AND wm.auth_user_id = p_actor);
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  m := private.actor_membership(p_actor, s.organization_id, p_role);
  IF p_role = 'WORKER' AND m.id <> s.worker_membership_id THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT * INTO s FROM public.shifts WHERE id = p_shift AND organization_id = m.organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN s;
END;
$$;

CREATE FUNCTION public.fairshift_check_in(p_actor_user_id uuid, p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.shifts;
BEGIN
  -- Serializes attendance for this identity, including memberships in other orgs.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_user_id::text, 0));
  s := private.actor_shift(p_actor_user_id, p_shift_id, 'WORKER');
  IF s.status <> 'PLANNED' OR EXISTS (
    SELECT 1 FROM public.shifts sh JOIN public.worker_memberships m ON m.id = sh.worker_membership_id
    WHERE m.auth_user_id = p_actor_user_id AND sh.status = 'CHECKED_IN') THEN
    RAISE EXCEPTION 'INVALID_STATE';
  END IF;
  UPDATE public.shifts SET status = 'CHECKED_IN', checked_in_at = date_trunc('milliseconds', clock_timestamp())
    WHERE id = s.id RETURNING * INTO s;
  RETURN to_jsonb(s);
END;
$$;
CREATE FUNCTION public.fairshift_check_out(p_actor_user_id uuid, p_shift_id uuid, p_unpaid_break_minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.shifts; ended timestamptz; paid numeric;
BEGIN
  s := private.actor_shift(p_actor_user_id, p_shift_id, 'WORKER');
  IF s.status <> 'CHECKED_IN' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  ended := date_trunc('milliseconds', clock_timestamp());
  paid := floor(extract(epoch FROM (ended - s.checked_in_at))/60) - p_unpaid_break_minutes;
  IF p_unpaid_break_minutes IS NULL OR p_unpaid_break_minutes NOT BETWEEN 0 AND 1440 OR paid NOT BETWEEN 1 AND 1440 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  UPDATE public.shifts SET status = 'COMPLETED', checked_out_at = ended,
    unpaid_break_minutes = p_unpaid_break_minutes WHERE id = s.id RETURNING * INTO s;
  RETURN to_jsonb(s);
END;
$$;
CREATE FUNCTION public.fairshift_create_dispute(p_actor_user_id uuid, p_shift_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.shifts; d public.disputes;
BEGIN
  s := private.actor_shift(p_actor_user_id, p_shift_id, 'WORKER');
  IF s.status <> 'COMPLETED' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF EXISTS (SELECT 1 FROM public.disputes WHERE shift_id = s.id AND status = 'OPEN') THEN
    RAISE EXCEPTION 'DUPLICATE_DISPUTE';
  END IF;
  INSERT INTO public.disputes(organization_id, shift_id, opened_by_membership_id, reason)
    VALUES (s.organization_id, s.id, s.worker_membership_id, trim(p_reason)) RETURNING * INTO d;
  RETURN to_jsonb(d);
END;
$$;
CREATE FUNCTION public.fairshift_record_pay(p_actor_user_id uuid, p_shift_id uuid, p_amount_minor integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.shifts; m public.worker_memberships; p public.recorded_pay;
BEGIN
  s := private.actor_shift(p_actor_user_id, p_shift_id, 'EMPLOYER');
  m := private.actor_membership(p_actor_user_id, s.organization_id, 'EMPLOYER');
  IF s.status <> 'COMPLETED' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF p_amount_minor IS NULL OR p_amount_minor < 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  INSERT INTO public.recorded_pay(organization_id, shift_id, amount_minor, entered_by_membership_id, entered_at)
    VALUES (s.organization_id, s.id, p_amount_minor, m.id, clock_timestamp())
    ON CONFLICT (shift_id) DO UPDATE SET amount_minor = EXCLUDED.amount_minor,
      entered_by_membership_id = EXCLUDED.entered_by_membership_id, entered_at = EXCLUDED.entered_at RETURNING * INTO p;
  RETURN to_jsonb(p);
END;
$$;
CREATE FUNCTION public.fairshift_resolve_dispute(p_actor_user_id uuid, p_dispute_id uuid,
  p_decision text, p_explanation text, p_corrected_amount_minor integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE d public.disputes; s public.shifts; m public.worker_memberships; p public.recorded_pay;
BEGIN
  SELECT ds.* INTO d FROM public.disputes ds WHERE ds.id = p_dispute_id AND EXISTS (
    SELECT 1 FROM public.worker_memberships wm WHERE wm.auth_user_id = p_actor_user_id AND wm.organization_id = ds.organization_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  -- Lock shift before dispute, consistently with creation/pay writes.
  s := private.actor_shift(p_actor_user_id, d.shift_id, 'EMPLOYER');
  m := private.actor_membership(p_actor_user_id, d.organization_id, 'EMPLOYER');
  SELECT * INTO d FROM public.disputes WHERE id = p_dispute_id AND organization_id = s.organization_id FOR UPDATE;
  IF d.status <> 'OPEN' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('APPROVED','REJECTED') OR p_explanation IS NULL
    OR length(trim(p_explanation)) NOT BETWEEN 10 AND 2000 OR
    (p_decision = 'APPROVED' AND (p_corrected_amount_minor IS NULL OR p_corrected_amount_minor < 0)) OR
    (p_decision = 'REJECTED' AND p_corrected_amount_minor IS NOT NULL) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  SELECT * INTO p FROM public.recorded_pay WHERE shift_id = s.id AND organization_id = s.organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF p_decision = 'APPROVED' THEN
    UPDATE public.recorded_pay SET amount_minor = p_corrected_amount_minor,
      entered_by_membership_id = m.id, entered_at = clock_timestamp() WHERE id = p.id RETURNING * INTO p;
  END IF;
  UPDATE public.disputes SET status = p_decision, resolution_explanation = trim(p_explanation),
    resolved_by_membership_id = m.id, resolved_at = clock_timestamp()
    WHERE id = d.id RETURNING * INTO d;
  RETURN jsonb_build_object('dispute', to_jsonb(d), 'recordedPay', to_jsonb(p));
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fairshift_check_in(uuid,uuid), public.fairshift_check_out(uuid,uuid,integer),
  public.fairshift_create_dispute(uuid,uuid,text), public.fairshift_record_pay(uuid,uuid,integer),
  public.fairshift_resolve_dispute(uuid,uuid,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fairshift_check_in(uuid,uuid), public.fairshift_check_out(uuid,uuid,integer),
  public.fairshift_create_dispute(uuid,uuid,text), public.fairshift_record_pay(uuid,uuid,integer),
  public.fairshift_resolve_dispute(uuid,uuid,text,text,integer) TO service_role;
COMMIT;
