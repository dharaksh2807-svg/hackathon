-- Development synthetic fixtures only. Apply AFTER the initial migration.
-- To create memberships / shifts, first provision four synthetic Auth users with
-- EXACT email addresses below using Supabase Auth Admin tooling (no real identities).
-- Do not commit passwords or keys; do not run in production.
BEGIN;
INSERT INTO public.organizations(id, name, sector) VALUES
('10000000-0000-4000-8000-000000000001', 'Demo North Construction Site', 'construction'),
('10000000-0000-4000-8000-000000000002', 'Demo College Facilities', 'campus')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sector_configs(id, organization_id, version, pay_basis, rate_minor,
  overtime_after_minutes, overtime_multiplier_bps, fixed_allowance_minor, weekend_bonus_minor) VALUES
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 1, 'HOURLY', 12000, 480, 15000, 5000, 0),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 1, 'PER_SHIFT', 65000, 0, 10000, 0, 5000)
ON CONFLICT (id) DO NOTHING;

DO $seed$
DECLARE
  cw uuid; ce uuid; sw uuid; se uuid;
BEGIN
  SELECT id INTO cw FROM auth.users WHERE email = 'fairshift-construction-worker@example.test';
  SELECT id INTO ce FROM auth.users WHERE email = 'fairshift-construction-employer@example.test';
  SELECT id INTO sw FROM auth.users WHERE email = 'fairshift-campus-worker@example.test';
  SELECT id INTO se FROM auth.users WHERE email = 'fairshift-campus-employer@example.test';
  IF cw IS NULL OR ce IS NULL OR sw IS NULL OR se IS NULL THEN
    RAISE NOTICE 'Org configurations seeded; worker/demo shifts skipped. First create four synthetic Auth users (see seed.sql), then rerun seed.sql.';
    RETURN;
  END IF;

  INSERT INTO public.worker_memberships(id, organization_id, auth_user_id, role, display_name) VALUES
    ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', cw, 'WORKER', 'Demo Construction Worker'),
    ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', ce, 'EMPLOYER', 'Demo Site Manager'),
    ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', sw, 'WORKER', 'Demo Campus Worker'),
    ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', se, 'EMPLOYER', 'Demo Facilities Manager')
  ON CONFLICT (id) DO NOTHING;

  -- 2026-10-23 (Friday), construction: 9 hours present minus 30m break = 510m paid.
  -- Expected: 96000 base + 9000 overtime + 5000 allowance = 110000 paise.
  INSERT INTO public.shifts(id, organization_id, worker_membership_id, site_label, status,
    scheduled_start_at, scheduled_end_at, checked_in_at, checked_out_at, unpaid_break_minutes,
    weekend_eligible, rule_version, pay_basis, rate_minor, overtime_after_minutes,
    overtime_multiplier_bps, fixed_allowance_minor, weekend_bonus_minor) VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001', 'Site A — Masonry', 'COMPLETED',
    '2026-10-23T02:30:00Z', '2026-10-23T11:30:00Z', '2026-10-23T02:30:00Z', '2026-10-23T11:30:00Z',
    30, false, 1, 'HOURLY', 12000, 480, 15000, 5000, 0),
  -- 2026-10-24 (Saturday), campus: flat shift + 5000 weekend premium = 70000 paise.
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003', 'Library — Housekeeping', 'COMPLETED',
    '2026-10-24T03:30:00Z', '2026-10-24T11:30:00Z', '2026-10-24T03:30:00Z', '2026-10-24T11:30:00Z',
    0, true, 1, 'PER_SHIFT', 65000, 0, 10000, 0, 5000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.recorded_pay(id, organization_id, shift_id, amount_minor, entered_by_membership_id) VALUES
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001', 104000, '30000000-0000-4000-8000-000000000002'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000002', 65000, '30000000-0000-4000-8000-000000000004')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.disputes(id, organization_id, shift_id, opened_by_membership_id, reason) VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
    'Overtime and site allowance seem missing from recorded pay.'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003',
    'My Saturday weekend allowance was not included in the pay record.')
  ON CONFLICT (id) DO NOTHING;
END;
$seed$;
COMMIT;
