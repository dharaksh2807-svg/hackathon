-- FairShift Phase 0; apply with Supabase SQL migrations. No data-changing public RPC.
-- Currency: INR, stored as integer paise; times: timestamptz (UTC on the API wire).
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  sector text NOT NULL CHECK (sector IN ('construction', 'campus')),
  currency_code text NOT NULL DEFAULT 'INR' CHECK (currency_code = 'INR'),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata' CHECK (timezone = 'Asia/Kolkata'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sector_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  pay_basis text NOT NULL CHECK (pay_basis IN ('HOURLY', 'PER_SHIFT')),
  rate_minor integer NOT NULL CHECK (rate_minor BETWEEN 0 AND 2147483647),
  overtime_after_minutes integer NOT NULL CHECK (overtime_after_minutes BETWEEN 0 AND 1440),
  overtime_multiplier_bps integer NOT NULL CHECK (overtime_multiplier_bps BETWEEN 10000 AND 30000),
  fixed_allowance_minor integer NOT NULL CHECK (fixed_allowance_minor BETWEEN 0 AND 2147483647),
  weekend_bonus_minor integer NOT NULL CHECK (weekend_bonus_minor BETWEEN 0 AND 2147483647),
  CHECK ((pay_basis = 'HOURLY' AND overtime_after_minutes > 0) OR (pay_basis = 'PER_SHIFT' AND overtime_after_minutes = 0)),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.worker_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('WORKER', 'EMPLOYER')),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, auth_user_id),
  UNIQUE (id, organization_id)
);
CREATE INDEX memberships_auth_idx ON public.worker_memberships(auth_user_id, organization_id);

CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  worker_membership_id uuid NOT NULL,
  site_label text NOT NULL CHECK (length(trim(site_label)) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'CHECKED_IN', 'COMPLETED')),
  scheduled_start_at timestamptz NOT NULL,
  scheduled_end_at timestamptz NOT NULL,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  unpaid_break_minutes integer NOT NULL DEFAULT 0 CHECK (unpaid_break_minutes BETWEEN 0 AND 1440),
  weekend_eligible boolean NOT NULL DEFAULT false,
  -- Immutable snapshot: historical pay must never change when organization config changes.
  rule_version integer NOT NULL CHECK (rule_version >= 1),
  pay_basis text NOT NULL CHECK (pay_basis IN ('HOURLY', 'PER_SHIFT')),
  rate_minor integer NOT NULL CHECK (rate_minor BETWEEN 0 AND 2147483647),
  overtime_after_minutes integer NOT NULL CHECK (overtime_after_minutes BETWEEN 0 AND 1440),
  overtime_multiplier_bps integer NOT NULL CHECK (overtime_multiplier_bps BETWEEN 10000 AND 30000),
  fixed_allowance_minor integer NOT NULL CHECK (fixed_allowance_minor BETWEEN 0 AND 2147483647),
  weekend_bonus_minor integer NOT NULL CHECK (weekend_bonus_minor BETWEEN 0 AND 2147483647),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shifts_membership_org_fk FOREIGN KEY (worker_membership_id, organization_id)
    REFERENCES public.worker_memberships(id, organization_id),
  CHECK (scheduled_start_at < scheduled_end_at),
  CHECK (checked_out_at IS NULL OR (checked_in_at IS NOT NULL AND checked_out_at > checked_in_at)),
  CHECK (
    (status = 'PLANNED' AND checked_in_at IS NULL AND checked_out_at IS NULL)
    OR (status = 'CHECKED_IN' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL)
    OR (status = 'COMPLETED' AND checked_in_at IS NOT NULL AND checked_out_at IS NOT NULL)
  )
);
CREATE INDEX shifts_org_time_idx ON public.shifts(organization_id, scheduled_start_at DESC);
CREATE INDEX shifts_worker_time_idx ON public.shifts(worker_membership_id, scheduled_start_at DESC);
CREATE UNIQUE INDEX shifts_id_org_uk ON public.shifts(id, organization_id);

CREATE TABLE public.recorded_pay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL UNIQUE,
  amount_minor integer NOT NULL CHECK (amount_minor BETWEEN 0 AND 2147483647),
  entered_by_membership_id uuid NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recorded_pay_shift_org_fk FOREIGN KEY (shift_id, organization_id)
    REFERENCES public.shifts(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT recorded_pay_employer_org_fk FOREIGN KEY (entered_by_membership_id, organization_id)
    REFERENCES public.worker_memberships(id, organization_id)
);
CREATE INDEX recorded_pay_org_idx ON public.recorded_pay(organization_id);

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL,
  opened_by_membership_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'APPROVED', 'REJECTED')),
  resolution_explanation text,
  resolved_by_membership_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT disputes_shift_org_fk FOREIGN KEY (shift_id, organization_id)
    REFERENCES public.shifts(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT disputes_worker_org_fk FOREIGN KEY (opened_by_membership_id, organization_id)
    REFERENCES public.worker_memberships(id, organization_id),
  CONSTRAINT disputes_employer_org_fk FOREIGN KEY (resolved_by_membership_id, organization_id)
    REFERENCES public.worker_memberships(id, organization_id),
  CHECK (
    (status = 'OPEN' AND resolution_explanation IS NULL AND resolved_by_membership_id IS NULL AND resolved_at IS NULL)
    OR (status IN ('APPROVED', 'REJECTED') AND resolution_explanation IS NOT NULL
        AND length(trim(resolution_explanation)) BETWEEN 10 AND 2000
        AND resolved_by_membership_id IS NOT NULL AND resolved_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX disputes_one_open_per_shift_idx ON public.disputes(shift_id) WHERE status = 'OPEN';
CREATE INDEX disputes_org_status_idx ON public.disputes(organization_id, status, created_at DESC);

-- Security-definer predicates bypass self-referential RLS on the membership table.
-- Private schema is intentionally not in PostgREST's exposed schemas.
CREATE FUNCTION private.is_member(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.worker_memberships m
                WHERE m.organization_id = p_org AND m.auth_user_id = (SELECT auth.uid()));
$$;
CREATE FUNCTION private.is_employer(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.worker_memberships m
                WHERE m.organization_id = p_org AND m.auth_user_id = (SELECT auth.uid()) AND m.role = 'EMPLOYER');
$$;
CREATE FUNCTION private.owns_worker_membership(p_org uuid, p_member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.worker_memberships m
                WHERE m.organization_id = p_org AND m.id = p_member
                  AND m.auth_user_id = (SELECT auth.uid()) AND m.role = 'WORKER');
$$;
CREATE FUNCTION private.can_read_shift(p_org uuid, p_shift uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.is_employer(p_org) OR EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.id = p_shift AND s.organization_id = p_org
      AND private.owns_worker_membership(p_org, s.worker_membership_id)
  );
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sector_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recorded_pay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_read ON public.organizations FOR SELECT TO authenticated
  USING (private.is_member(id));
CREATE POLICY config_read ON public.sector_configs FOR SELECT TO authenticated
  USING (private.is_member(organization_id));
CREATE POLICY memberships_read ON public.worker_memberships FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));
CREATE POLICY shifts_read ON public.shifts FOR SELECT TO authenticated
  USING (private.is_employer(organization_id) OR private.owns_worker_membership(organization_id, worker_membership_id));
CREATE POLICY recorded_pay_read ON public.recorded_pay FOR SELECT TO authenticated
  USING (private.can_read_shift(organization_id, shift_id));
CREATE POLICY disputes_read ON public.disputes FOR SELECT TO authenticated
  USING (private.is_employer(organization_id) OR private.owns_worker_membership(organization_id, opened_by_membership_id));

-- No browser/client write policies. Only authorized server routes with service role may mutate.
REVOKE ALL ON TABLE public.organizations, public.sector_configs, public.worker_memberships,
  public.shifts, public.recorded_pay, public.disputes FROM anon, authenticated;
GRANT SELECT ON TABLE public.organizations, public.sector_configs, public.worker_memberships,
  public.shifts, public.recorded_pay, public.disputes TO authenticated;
GRANT ALL ON TABLE public.organizations, public.sector_configs, public.worker_memberships,
  public.shifts, public.recorded_pay, public.disputes TO service_role;
COMMIT;
