/**
 * Canonical typed fixtures for FairShift frontend development and offline demonstration.
 * Exactly reflects the database seed definitions from supabase/seed.sql and API_CONTRACT.md.
 */

import type {
  Shift,
  Dispute,
  Membership,
  EarningsResponse,
  DashboardResponse,
} from "./types.ts";

export const FIXTURE_ORGS = {
  construction: {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Demo North Construction Site",
    sector: "construction" as const,
  },
  campus: {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Demo College Facilities",
    sector: "campus" as const,
  },
};

export const FIXTURE_MEMBERSHIPS: Membership[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    organizationId: FIXTURE_ORGS.construction.id,
    organizationName: FIXTURE_ORGS.construction.name,
    sector: "construction",
    role: "WORKER",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    organizationId: FIXTURE_ORGS.construction.id,
    organizationName: FIXTURE_ORGS.construction.name,
    sector: "construction",
    role: "EMPLOYER",
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    organizationId: FIXTURE_ORGS.campus.id,
    organizationName: FIXTURE_ORGS.campus.name,
    sector: "campus",
    role: "WORKER",
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    organizationId: FIXTURE_ORGS.campus.id,
    organizationName: FIXTURE_ORGS.campus.name,
    sector: "campus",
    role: "EMPLOYER",
  },
];

/**
 * Construction Shifts:
 * Hourly base ₹120.00 (12,000 paise/hr)
 * Overtime after 8h (480m) at 1.5x (15,000 bps = ₹180.00/hr)
 * Fixed site hazard allowance: ₹50.00 (5,000 paise)
 */
export const FIXTURE_CONSTRUCTION_SHIFTS: Shift[] = [
  {
    // Canonical seed shift 1: Friday 23 Oct 2026. 9 hours elapsed, 30m unpaid break = 510m paid.
    // 480m regular (8h * 12000 = 96000 paise)
    // 30m overtime (0.5h * 18000 = 9000 paise)
    // Fixed allowance: 5000 paise
    // Expected = 110,000 paise (₹1,100.00)
    // Recorded = 104,000 paise (₹1,040.00)
    // Difference = +6,000 paise (+₹60.00) UNDERPAID
    id: "40000000-0000-4000-8000-000000000001",
    organizationId: FIXTURE_ORGS.construction.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000001",
    sector: "construction",
    siteLabel: "Site A — Masonry & Scaffold Assembly",
    status: "COMPLETED",
    scheduledStartAt: "2026-10-23T02:30:00.000Z", // 08:00 IST
    scheduledEndAt: "2026-10-23T11:30:00.000Z", // 17:00 IST
    checkedInAt: "2026-10-23T02:30:00.000Z",
    checkedOutAt: "2026-10-23T11:30:00.000Z",
    unpaidBreakMinutes: 30,
    earnings: {
      workedMinutes: 510,
      regularMinor: 96_000,
      overtimeMinor: 9_000,
      fixedAllowanceMinor: 5_000,
      weekendBonusMinor: 0,
      expectedMinor: 110_000,
    },
    recordedAmountMinor: 104_000,
    comparisonStatus: "UNDERPAID",
    differenceMinor: 6_000,
  },
  {
    // Construction shift 2: Standard 8h shift on Monday 20 Oct 2026.
    // 8h worked, 0m break = 480m paid.
    // Expected: 96,000 + 0 + 5,000 = 101,000 paise (₹1,010.00)
    // Recorded: 101,000 paise -> MATCHED
    id: "40000000-0000-4000-8000-000000000011",
    organizationId: FIXTURE_ORGS.construction.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000001",
    sector: "construction",
    siteLabel: "Site B — Foundation Concrete Pour",
    status: "COMPLETED",
    scheduledStartAt: "2026-10-20T02:30:00.000Z",
    scheduledEndAt: "2026-10-20T10:30:00.000Z",
    checkedInAt: "2026-10-20T02:30:00.000Z",
    checkedOutAt: "2026-10-20T10:30:00.000Z",
    unpaidBreakMinutes: 0,
    earnings: {
      workedMinutes: 480,
      regularMinor: 96_000,
      overtimeMinor: 0,
      fixedAllowanceMinor: 5_000,
      weekendBonusMinor: 0,
      expectedMinor: 101_000,
    },
    recordedAmountMinor: 101_000,
    comparisonStatus: "MATCHED",
    differenceMinor: 0,
  },
  {
    // Construction shift 3: Shift completed yesterday. Pay not yet entered by employer.
    id: "40000000-0000-4000-8000-000000000012",
    organizationId: FIXTURE_ORGS.construction.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000001",
    sector: "construction",
    siteLabel: "Tower 2 — Rebar Tying",
    status: "COMPLETED",
    scheduledStartAt: "2026-10-26T02:30:00.000Z",
    scheduledEndAt: "2026-10-26T11:00:00.000Z",
    checkedInAt: "2026-10-26T02:30:00.000Z",
    checkedOutAt: "2026-10-26T11:00:00.000Z",
    unpaidBreakMinutes: 30,
    earnings: {
      workedMinutes: 480,
      regularMinor: 96_000,
      overtimeMinor: 0,
      fixedAllowanceMinor: 5_000,
      weekendBonusMinor: 0,
      expectedMinor: 101_000,
    },
    recordedAmountMinor: null,
    comparisonStatus: "NOT_RECORDED",
    differenceMinor: null,
  },
  {
    // Construction shift 4: In-progress shift (Checked-in, waiting for checkout)
    id: "40000000-0000-4000-8000-000000000013",
    organizationId: FIXTURE_ORGS.construction.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000001",
    sector: "construction",
    siteLabel: "Site C — Excavation & Trenching",
    status: "CHECKED_IN",
    scheduledStartAt: "2026-10-27T02:30:00.000Z", // Today 08:00 IST
    scheduledEndAt: "2026-10-27T11:30:00.000Z",
    checkedInAt: "2026-10-27T02:31:15.000Z",
    checkedOutAt: null,
    unpaidBreakMinutes: 0,
    earnings: null,
    recordedAmountMinor: null,
    comparisonStatus: "NOT_RECORDED",
    differenceMinor: null,
  },
  {
    // Construction shift 5: Planned shift for tomorrow (ready for check-in)
    id: "40000000-0000-4000-8000-000000000014",
    organizationId: FIXTURE_ORGS.construction.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000001",
    sector: "construction",
    siteLabel: "Site A — Perimeter Shoring",
    status: "PLANNED",
    scheduledStartAt: "2026-10-28T02:30:00.000Z",
    scheduledEndAt: "2026-10-28T11:00:00.000Z",
    checkedInAt: null,
    checkedOutAt: null,
    unpaidBreakMinutes: 0,
    earnings: null,
    recordedAmountMinor: null,
    comparisonStatus: "NOT_RECORDED",
    differenceMinor: null,
  },
];

/**
 * Campus Facilities Shifts:
 * Flat per-shift base ₹650.00 (65,000 paise)
 * Weekend bonus ₹50.00 (5,000 paise) on Saturday and Sunday
 */
export const FIXTURE_CAMPUS_SHIFTS: Shift[] = [
  {
    // Canonical seed shift 2: Saturday 24 Oct 2026.
    // Flat rate = 65,000 paise
    // Weekend bonus = 5,000 paise
    // Expected = 70,000 paise (₹700.00)
    // Recorded = 65,000 paise (₹650.00)
    // Difference = +5,000 paise (+₹50.00) UNDERPAID
    id: "40000000-0000-4000-8000-000000000002",
    organizationId: FIXTURE_ORGS.campus.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000003",
    sector: "campus",
    siteLabel: "Main Library — Weekend Deep Clean & Housekeeping",
    status: "COMPLETED",
    scheduledStartAt: "2026-10-24T03:30:00.000Z", // Saturday 09:00 IST
    scheduledEndAt: "2026-10-24T11:30:00.000Z", // 17:00 IST
    checkedInAt: "2026-10-24T03:30:00.000Z",
    checkedOutAt: "2026-10-24T11:30:00.000Z",
    unpaidBreakMinutes: 0,
    earnings: {
      workedMinutes: 480,
      regularMinor: 65_000,
      overtimeMinor: 0,
      fixedAllowanceMinor: 0,
      weekendBonusMinor: 5_000,
      expectedMinor: 70_000,
    },
    recordedAmountMinor: 65_000,
    comparisonStatus: "UNDERPAID",
    differenceMinor: 5_000,
  },
  {
    // Campus shift 2: Wednesday weekday shift (no weekend bonus).
    // Expected: 65,000 paise (₹650.00)
    // Recorded: 65,000 paise -> MATCHED
    id: "40000000-0000-4000-8000-000000000021",
    organizationId: FIXTURE_ORGS.campus.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000003",
    sector: "campus",
    siteLabel: "Student Center — Cafeteria Floor Sanitation",
    status: "COMPLETED",
    scheduledStartAt: "2026-10-21T03:30:00.000Z",
    scheduledEndAt: "2026-10-21T11:30:00.000Z",
    checkedInAt: "2026-10-21T03:30:00.000Z",
    checkedOutAt: "2026-10-21T11:30:00.000Z",
    unpaidBreakMinutes: 0,
    earnings: {
      workedMinutes: 480,
      regularMinor: 65_000,
      overtimeMinor: 0,
      fixedAllowanceMinor: 0,
      weekendBonusMinor: 0,
      expectedMinor: 65_000,
    },
    recordedAmountMinor: 65_000,
    comparisonStatus: "MATCHED",
    differenceMinor: 0,
  },
  {
    // Campus shift 3: Sunday shift resolved earlier in the month
    id: "40000000-0000-4000-8000-000000000022",
    organizationId: FIXTURE_ORGS.campus.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000003",
    sector: "campus",
    siteLabel: "Science Complex — Laboratory Waste Disposal",
    status: "COMPLETED",
    scheduledStartAt: "2026-10-18T03:30:00.000Z", // Sunday
    scheduledEndAt: "2026-10-18T11:30:00.000Z",
    checkedInAt: "2026-10-18T03:30:00.000Z",
    checkedOutAt: "2026-10-18T11:30:00.000Z",
    unpaidBreakMinutes: 0,
    earnings: {
      workedMinutes: 480,
      regularMinor: 65_000,
      overtimeMinor: 0,
      fixedAllowanceMinor: 0,
      weekendBonusMinor: 5_000,
      expectedMinor: 70_000,
    },
    recordedAmountMinor: 70_000, // Adjusted after dispute
    comparisonStatus: "MATCHED",
    differenceMinor: 0,
  },
  {
    // Campus shift 4: Planned shift for tomorrow
    id: "40000000-0000-4000-8000-000000000023",
    organizationId: FIXTURE_ORGS.campus.id,
    workerMembershipId: "30000000-0000-4000-8000-000000000003",
    sector: "campus",
    siteLabel: "Auditorium — Convocation Preparation",
    status: "PLANNED",
    scheduledStartAt: "2026-10-28T03:30:00.000Z",
    scheduledEndAt: "2026-10-28T11:30:00.000Z",
    checkedInAt: null,
    checkedOutAt: null,
    unpaidBreakMinutes: 0,
    earnings: null,
    recordedAmountMinor: null,
    comparisonStatus: "NOT_RECORDED",
    differenceMinor: null,
  },
];

export const FIXTURE_DISPUTES: Dispute[] = [
  {
    // Construction dispute matching seed.sql
    id: "60000000-0000-4000-8000-000000000001",
    organizationId: FIXTURE_ORGS.construction.id,
    shiftId: "40000000-0000-4000-8000-000000000001",
    openedByMembershipId: "30000000-0000-4000-8000-000000000001",
    reason: "Overtime and site allowance seem missing from recorded pay.",
    status: "OPEN",
    resolutionExplanation: null,
    resolvedByMembershipId: null,
    createdAt: "2026-10-24T05:00:00.000Z",
    resolvedAt: null,
  },
  {
    // Campus dispute matching seed.sql
    id: "60000000-0000-4000-8000-000000000002",
    organizationId: FIXTURE_ORGS.campus.id,
    shiftId: "40000000-0000-4000-8000-000000000002",
    openedByMembershipId: "30000000-0000-4000-8000-000000000003",
    reason: "My Saturday weekend allowance was not included in the pay record.",
    status: "OPEN",
    resolutionExplanation: null,
    resolvedByMembershipId: null,
    createdAt: "2026-10-25T04:15:00.000Z",
    resolvedAt: null,
  },
  {
    // Resolved historical dispute
    id: "60000000-0000-4000-8000-000000000003",
    organizationId: FIXTURE_ORGS.campus.id,
    shiftId: "40000000-0000-4000-8000-000000000022",
    openedByMembershipId: "30000000-0000-4000-8000-000000000003",
    reason: "Sunday shift was marked without the statutory weekend bonus.",
    status: "APPROVED",
    resolutionExplanation: "Verified biometric gate logs and confirmed Sunday attendance roster. Corrected recorded amount from ₹650 to ₹700 (+₹50 weekend bonus).",
    resolvedByMembershipId: "30000000-0000-4000-8000-000000000004",
    createdAt: "2026-10-19T06:30:00.000Z",
    resolvedAt: "2026-10-19T09:45:00.000Z",
  },
];

export function getFixtureWorkerEarnings(sector: "construction" | "campus", month = "2026-10"): EarningsResponse["data"] {
  const shifts = sector === "construction" ? FIXTURE_CONSTRUCTION_SHIFTS : FIXTURE_CAMPUS_SHIFTS;
  const completed = shifts.filter((s) => s.status === "COMPLETED");
  const recorded = completed.filter((s) => s.recordedAmountMinor !== null);
  const underpaid = completed.filter((s) => s.comparisonStatus === "UNDERPAID");

  const totalExpectedMinor = completed.reduce((acc, s) => acc + (s.earnings?.expectedMinor ?? 0), 0);
  const totalRecordedMinor = recorded.reduce((acc, s) => acc + (s.recordedAmountMinor ?? 0), 0);

  return {
    organizationId: sector === "construction" ? FIXTURE_ORGS.construction.id : FIXTURE_ORGS.campus.id,
    sector,
    month,
    currency: "INR",
    totalExpectedMinor,
    totalRecordedMinor,
    recordedCount: recorded.length,
    completedCount: completed.length,
    underpaidCount: underpaid.length,
    shifts: completed,
  };
}

export function getFixtureEmployerDashboard(sector: "construction" | "campus", month = "2026-10"): DashboardResponse["data"] {
  const shifts = sector === "construction" ? FIXTURE_CONSTRUCTION_SHIFTS : FIXTURE_CAMPUS_SHIFTS;
  const orgId = sector === "construction" ? FIXTURE_ORGS.construction.id : FIXTURE_ORGS.campus.id;
  const openDisputes = FIXTURE_DISPUTES.filter((d) => d.organizationId === orgId && d.status === "OPEN").length;

  const completed = shifts.filter((s) => s.status === "COMPLETED");
  const recorded = completed.filter((s) => s.recordedAmountMinor !== null);
  const underpaid = completed.filter((s) => s.comparisonStatus === "UNDERPAID");

  const totalExpectedMinor = completed.reduce((acc, s) => acc + (s.earnings?.expectedMinor ?? 0), 0);
  const totalRecordedMinor = recorded.reduce((acc, s) => acc + (s.recordedAmountMinor ?? 0), 0);

  return {
    organizationId: orgId,
    sector,
    month,
    currency: "INR",
    workerCount: 1, // Single active demo worker per org in seed
    totalShifts: shifts.length,
    completedShifts: completed.length,
    underpaidShifts: underpaid.length,
    openDisputes,
    totalExpectedMinor,
    totalRecordedMinor,
    recordedCount: recorded.length,
    recentShifts: shifts.slice(0, 20),
  };
}
