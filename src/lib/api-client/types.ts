/**
 * Clean frontend types and domain view models for FairShift.
 * Aligns 1:1 with frozen schemas in @/lib/contracts.ts.
 */

import type {
  Sector,
  Role,
  Membership,
  Shift,
  Dispute,
  EarningsBreakdown,
  MeResponse,
  ShiftsResponse,
  ShiftResponse,
  EarningsResponse,
  DisputesResponse,
  DisputeResponse,
  DashboardResponse,
  RecordedPayResponse,
  ResolveDisputeResponse,
  CreateDisputeRequest,
  ResolveDisputeRequest,
  SetRecordedPayRequest,
} from "../contracts.ts";

export type {
  Sector,
  Role,
  Membership,
  Shift,
  Dispute,
  EarningsBreakdown,
  MeResponse,
  ShiftsResponse,
  ShiftResponse,
  EarningsResponse,
  DisputesResponse,
  DisputeResponse,
  DashboardResponse,
  RecordedPayResponse,
  ResolveDisputeResponse,
  CreateDisputeRequest,
  ResolveDisputeRequest,
  SetRecordedPayRequest,
  CheckoutRequest,
};

export type ShiftStatus = Shift["status"]; // "PLANNED" | "CHECKED_IN" | "COMPLETED"
export type ComparisonStatus = Shift["comparisonStatus"]; // "MATCHED" | "UNDERPAID" | "OVERPAID" | "NOT_RECORDED"
export type DisputeStatus = Dispute["status"]; // "OPEN" | "APPROVED" | "REJECTED"

export interface SectorDefinition {
  sector: Sector;
  name: string;
  badgeLabel: string;
  payBasis: "HOURLY" | "PER_SHIFT";
  payBasisLabel: string;
  baseRateMinor: number;
  baseRateFormatted: string;
  overtimeThresholdMinutes: number;
  overtimeMultiplierBps: number;
  fixedAllowanceMinor: number;
  weekendBonusMinor: number;
  rulesSummary: string;
  siteLabelPlaceholder: string;
  terms: {
    workforceLabel: string;
    siteLabel: string;
    payUnit: string;
    discrepancyExample: string;
  };
}

export const SECTOR_DEFINITIONS: Record<Sector, SectorDefinition> = {
  construction: {
    sector: "construction",
    name: "Civil Construction & Field Works",
    badgeLabel: "Construction Sector",
    payBasis: "HOURLY",
    payBasisLabel: "Hourly + Overtime (1.5x >8h)",
    baseRateMinor: 12_000, // ₹120.00 / hr
    baseRateFormatted: "₹120.00 / hour",
    overtimeThresholdMinutes: 480, // 8 hours
    overtimeMultiplierBps: 15_000, // 1.5x
    fixedAllowanceMinor: 5_000, // ₹50.00 daily site allowance
    weekendBonusMinor: 0,
    rulesSummary: "Hourly rate of ₹120/h up to 8h. Overtime at 1.5× rate (₹180/h) for every minute past 8h. Mandatory ₹50 fixed site hazard allowance.",
    siteLabelPlaceholder: "e.g., Site A — Masonry, Tower 3 Foundation",
    terms: {
      workforceLabel: "Construction Trades & Artisans",
      siteLabel: "Job Site / Deck",
      payUnit: "hour",
      discrepancyExample: "9h shift with missing overtime (+30m = ₹90) and unapplied ₹50 site allowance creates an underpayment of ₹60.",
    },
  },
  campus: {
    sector: "campus",
    name: "Higher Education Facilities & Support",
    badgeLabel: "Campus Facilities Sector",
    payBasis: "PER_SHIFT",
    payBasisLabel: "Flat Shift + Weekend Differential",
    baseRateMinor: 65_000, // ₹650.00 / shift
    baseRateFormatted: "₹650.00 / shift",
    overtimeThresholdMinutes: 0,
    overtimeMultiplierBps: 10_000,
    fixedAllowanceMinor: 0,
    weekendBonusMinor: 5_000, // ₹50.00 weekend premium (Saturday/Sunday)
    rulesSummary: "Fixed flat stipend of ₹650 per shift regardless of hours. ₹50 weekend duty bonus applies strictly on Saturday and Sunday shifts.",
    siteLabelPlaceholder: "e.g., Central Library — Housekeeping, East Hostel Sanitation",
    terms: {
      workforceLabel: "Campus Support & Housekeeping Staff",
      siteLabel: "Building / Department",
      payUnit: "shift",
      discrepancyExample: "Saturday housekeeping shift recorded as standard weekday ₹650 omitting the ₹50 weekend duty premium.",
    },
  },
};

export interface DemoPersona {
  id: string;
  email: string;
  name: string;
  role: Role;
  sector: Sector;
  organizationId: string;
  organizationName: string;
  membershipId: string;
  avatarInitials: string;
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "demo-worker-construction",
    email: "fairshift-construction-worker@example.test",
    name: "Rajesh Kumar (Masonry Lead)",
    role: "WORKER",
    sector: "construction",
    organizationId: "10000000-0000-4000-8000-000000000001",
    organizationName: "Demo North Construction Site",
    membershipId: "30000000-0000-4000-8000-000000000001",
    avatarInitials: "RK",
    description: "Trades worker on hourly wages + overtime and site hazard allowances.",
  },
  {
    id: "demo-employer-construction",
    email: "fairshift-construction-employer@example.test",
    name: "Suresh Sharma (Site Operations Manager)",
    role: "EMPLOYER",
    sector: "construction",
    organizationId: "10000000-0000-4000-8000-000000000001",
    organizationName: "Demo North Construction Site",
    membershipId: "30000000-0000-4000-8000-000000000002",
    avatarInitials: "SS",
    description: "Site manager tracking contractor rosters, pay discrepancies, and overtime disputes.",
  },
  {
    id: "demo-worker-campus",
    email: "fairshift-campus-worker@example.test",
    name: "Sunita Devi (Facilities Staff)",
    role: "WORKER",
    sector: "campus",
    organizationId: "10000000-0000-4000-8000-000000000002",
    organizationName: "Demo College Facilities",
    membershipId: "30000000-0000-4000-8000-000000000003",
    avatarInitials: "SD",
    description: "College facilities worker on flat shift rate + weekend duty premiums.",
  },
  {
    id: "demo-employer-campus",
    email: "fairshift-campus-employer@example.test",
    name: "Dr. Ananya Sen (Campus Operations Director)",
    role: "EMPLOYER",
    sector: "campus",
    organizationId: "10000000-0000-4000-8000-000000000002",
    organizationName: "Demo College Facilities",
    membershipId: "30000000-0000-4000-8000-000000000004",
    avatarInitials: "AS",
    description: "Campus administrator managing facilities contracts and student center shifts.",
  },
];
