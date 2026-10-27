/** Explicit synthetic adapter for fixture tests only. Never selected by the application. */
import type { FairShiftApiClient } from "./client.ts";
import { ApiError } from "./client.ts";
import type { Shift, Dispute, MeResponse, ShiftsResponse, ShiftResponse, EarningsResponse, DisputesResponse, DisputeResponse, DashboardResponse, RecordedPayResponse, ResolveDisputeResponse, CreateDisputeRequest, ResolveDisputeRequest, Sector, AddWorkerRequest, OrgWorker, AddWorkerResponse, OrgWorkersResponse } from "./types.ts";
import {
  FIXTURE_ORGS,
  FIXTURE_MEMBERSHIPS,
  FIXTURE_CONSTRUCTION_SHIFTS,
  FIXTURE_CAMPUS_SHIFTS,
  FIXTURE_DISPUTES,
} from "./fixtures.ts";

/**
 * Stateful Demo Adapter:
 * Uses deep copies of synthetic fixtures so frontend interactions (check-in, checkout, dispute creation,
 * employer pay recording, and dispute approval/rejection) simulate realistic state changes.
 */
export class DemoApiClient implements FairShiftApiClient {
  readonly isDemo = true;
  private shifts: Shift[];
  private disputes: Dispute[];
  private activeUserId = "demo-worker-construction";

  constructor() {
    this.shifts = [
      ...JSON.parse(JSON.stringify(FIXTURE_CONSTRUCTION_SHIFTS)),
      ...JSON.parse(JSON.stringify(FIXTURE_CAMPUS_SHIFTS)),
    ];
    this.disputes = JSON.parse(JSON.stringify(FIXTURE_DISPUTES));
  }

  setActiveUser(userId: string) {
    this.activeUserId = userId;
  }

  async getMe(): Promise<MeResponse> {
    return {
      data: {
        user: {
          id: "30000000-0000-4000-8000-000000000001",
          email: "fairshift-construction-worker@example.test",
        },
        memberships: FIXTURE_MEMBERSHIPS,
      },
    };
  }

  async getWorkerShifts(params: { orgId: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<ShiftsResponse> {
    const orgShifts = this.shifts.filter((s) => s.organizationId === params.orgId);
    return {
      data: orgShifts,
      paging: {
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
        nextOffset: null,
      },
    };
  }

  async getWorkerEarnings(params: { orgId: string; month: string }): Promise<EarningsResponse> {
    const sector = params.orgId === FIXTURE_ORGS.construction.id ? "construction" : "campus";
    const completed = this.shifts.filter((s) => s.organizationId === params.orgId && s.status === "COMPLETED");
    const recorded = completed.filter((s) => s.recordedAmountMinor !== null);
    const underpaid = completed.filter((s) => s.comparisonStatus === "UNDERPAID");

    const totalExpectedMinor = completed.reduce((acc, s) => acc + (s.earnings?.expectedMinor ?? 0), 0);
    const totalRecordedMinor = recorded.reduce((acc, s) => acc + (s.recordedAmountMinor ?? 0), 0);

    return {
      data: {
        organizationId: params.orgId,
        sector,
        month: params.month,
        currency: "INR",
        totalExpectedMinor,
        totalRecordedMinor,
        recordedCount: recorded.length,
        completedCount: completed.length,
        underpaidCount: underpaid.length,
        shifts: completed,
      },
    };
  }

  async checkIn(shiftId: string): Promise<ShiftResponse> {
    const shift = this.shifts.find((s) => s.id === shiftId);
    if (!shift) throw new ApiError("NOT_FOUND", "Shift not found", 404);
    if (shift.status !== "PLANNED") {
      throw new ApiError("INVALID_STATE", "Only PLANNED shifts can be checked into", 409);
    }

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
    shift.status = "CHECKED_IN";
    shift.checkedInAt = nowIso;

    return { data: { ...shift } };
  }

  async checkOut(shiftId: string, unpaidBreakMinutes: number): Promise<ShiftResponse> {
    const shift = this.shifts.find((s) => s.id === shiftId);
    if (!shift) throw new ApiError("NOT_FOUND", "Shift not found", 404);
    if (shift.status !== "CHECKED_IN") {
      throw new ApiError("INVALID_STATE", "Only CHECKED_IN shifts can be checked out", 409);
    }

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
    shift.status = "COMPLETED";
    shift.checkedOutAt = nowIso;
    shift.unpaidBreakMinutes = unpaidBreakMinutes;

    // Deterministic client calculation matching contract
    if (shift.sector === "construction") {
      // 8h regular = 96,000 paise + 5,000 allowance = 101,000 paise
      shift.earnings = {
        workedMinutes: 480,
        regularMinor: 96_000,
        overtimeMinor: 0,
        fixedAllowanceMinor: 5_000,
        weekendBonusMinor: 0,
        expectedMinor: 101_000,
      };
    } else {
      shift.earnings = {
        workedMinutes: 480,
        regularMinor: 65_000,
        overtimeMinor: 0,
        fixedAllowanceMinor: 0,
        weekendBonusMinor: 0,
        expectedMinor: 65_000,
      };
    }

    shift.comparisonStatus = "NOT_RECORDED";
    shift.differenceMinor = null;

    return { data: { ...shift } };
  }

  async getDisputes(params: { orgId: string; status?: "OPEN" | "APPROVED" | "REJECTED"; limit?: number; offset?: number }): Promise<DisputesResponse> {
    let list = this.disputes.filter((d) => d.organizationId === params.orgId);
    if (params.status) {
      list = list.filter((d) => d.status === params.status);
    }

    return {
      data: list,
      paging: {
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
        nextOffset: null,
      },
    };
  }

  async createDispute(req: CreateDisputeRequest): Promise<DisputeResponse> {
    const shift = this.shifts.find((s) => s.id === req.shiftId);
    if (!shift) throw new ApiError("NOT_FOUND", "Referenced shift not found", 404);
    if (shift.status !== "COMPLETED") {
      throw new ApiError("INVALID_STATE", "Disputes can only be raised for COMPLETED shifts", 409);
    }

    const existing = this.disputes.find((d) => d.shiftId === req.shiftId && d.status === "OPEN");
    if (existing) {
      throw new ApiError("DUPLICATE_DISPUTE", "An active dispute already exists for this shift", 409);
    }

    const newDispute: Dispute = {
      id: `60000000-0000-4000-8000-${String(this.disputes.length + 1).padStart(12, "0")}`,
      organizationId: shift.organizationId,
      shiftId: shift.id,
      openedByMembershipId: shift.workerMembershipId,
      reason: req.reason,
      status: "OPEN",
      resolutionExplanation: null,
      resolvedByMembershipId: null,
      createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
      resolvedAt: null,
    };

    this.disputes.unshift(newDispute);
    return { data: newDispute };
  }

  async getEmployerDashboard(params: { orgId: string; month: string; sector?: Sector }): Promise<DashboardResponse> {
    const sector = params.sector ?? (params.orgId === FIXTURE_ORGS.construction.id ? "construction" : "campus");
    const shifts = this.shifts.filter((s) => s.organizationId === params.orgId);
    const completed = shifts.filter((s) => s.status === "COMPLETED");
    const recorded = completed.filter((s) => s.recordedAmountMinor !== null);
    const underpaid = completed.filter((s) => s.comparisonStatus === "UNDERPAID");
    const openDisputes = this.disputes.filter((d) => d.organizationId === params.orgId && d.status === "OPEN").length;

    const totalExpectedMinor = completed.reduce((acc, s) => acc + (s.earnings?.expectedMinor ?? 0), 0);
    const totalRecordedMinor = recorded.reduce((acc, s) => acc + (s.recordedAmountMinor ?? 0), 0);

    return {
      data: {
        organizationId: params.orgId,
        sector,
        month: params.month,
        currency: "INR",
        workerCount: 1,
        totalShifts: shifts.length,
        completedShifts: completed.length,
        underpaidShifts: underpaid.length,
        openDisputes,
        totalExpectedMinor,
        totalRecordedMinor,
        recordedCount: recorded.length,
        recentShifts: shifts.slice(0, 20),
      },
    };
  }

  async setRecordedPay(shiftId: string, amountMinor: number): Promise<RecordedPayResponse> {
    const shift = this.shifts.find((s) => s.id === shiftId);
    if (!shift) throw new ApiError("NOT_FOUND", "Shift not found", 404);
    if (shift.status !== "COMPLETED") {
      throw new ApiError("INVALID_STATE", "Recorded pay can only be assigned to COMPLETED shifts", 409);
    }

    shift.recordedAmountMinor = amountMinor;
    if (shift.earnings) {
      const diff = shift.earnings.expectedMinor - amountMinor;
      shift.differenceMinor = diff;
      shift.comparisonStatus = diff > 0 ? "UNDERPAID" : diff < 0 ? "OVERPAID" : "MATCHED";
    }

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
    return {
      data: {
        shiftId,
        amountMinor,
        enteredAt: nowIso,
      },
    };
  }

  async resolveDispute(disputeId: string, req: ResolveDisputeRequest): Promise<ResolveDisputeResponse> {
    const dispute = this.disputes.find((d) => d.id === disputeId);
    if (!dispute) throw new ApiError("NOT_FOUND", "Dispute not found", 404);
    if (dispute.status !== "OPEN") {
      throw new ApiError("INVALID_STATE", "This dispute has already been adjudicated", 409);
    }

    const shift = this.shifts.find((s) => s.id === dispute.shiftId);
    if (!shift) throw new ApiError("NOT_FOUND", "Target shift missing", 404);

    const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
    dispute.status = req.decision;
    dispute.resolutionExplanation = req.explanation;
    dispute.resolvedByMembershipId = "30000000-0000-4000-8000-000000000002";
    dispute.resolvedAt = nowIso;

    let finalAmount = shift.recordedAmountMinor ?? 0;

    if (req.decision === "APPROVED" && req.correctedRecordedAmountMinor !== undefined) {
      finalAmount = req.correctedRecordedAmountMinor;
      shift.recordedAmountMinor = finalAmount;
      if (shift.earnings) {
        const diff = shift.earnings.expectedMinor - finalAmount;
        shift.differenceMinor = diff;
        shift.comparisonStatus = diff > 0 ? "UNDERPAID" : diff < 0 ? "OVERPAID" : "MATCHED";
      }
    }

    return {
      data: {
        dispute: { ...dispute },
        recordedPay: {
          shiftId: shift.id,
          amountMinor: finalAmount,
          enteredAt: nowIso,
        },
      },
    };
  }

  private orgWorkers = new Map<string, OrgWorker[]>([
    [
      FIXTURE_ORGS.construction.id,
      [
        {
          membershipId: "30000000-0000-4000-8000-000000000001",
          authUserId: "20000000-0000-4000-8000-000000000001",
          organizationId: FIXTURE_ORGS.construction.id,
          role: "WORKER",
          displayName: "Ramesh Kumar (Mason)",
          workerEmail: "fairshift-construction-worker@example.test",
          joinedAt: "2026-09-01T08:00:00.000Z",
        },
        {
          membershipId: "30000000-0000-4000-8000-000000000003",
          authUserId: "20000000-0000-4000-8000-000000000003",
          organizationId: FIXTURE_ORGS.construction.id,
          role: "WORKER",
          displayName: "Suresh Patel (Helper)",
          workerEmail: "suresh.patel@example.test",
          joinedAt: "2026-09-15T08:00:00.000Z",
        },
      ],
    ],
    [
      FIXTURE_ORGS.campus.id,
      [
        {
          membershipId: "30000000-0000-4000-8000-000000000004",
          authUserId: "20000000-0000-4000-8000-000000000004",
          organizationId: FIXTURE_ORGS.campus.id,
          role: "WORKER",
          displayName: "Priya Sharma (Dining)",
          workerEmail: "fairshift-campus-worker@example.test",
          joinedAt: "2026-09-01T08:00:00.000Z",
        },
      ],
    ],
  ]);

  async listOrgWorkers(params: { orgId: string }): Promise<OrgWorkersResponse> {
    const workers = this.orgWorkers.get(params.orgId) ?? [];
    return { data: [...workers] };
  }

  async addWorker(req: AddWorkerRequest): Promise<AddWorkerResponse> {
    const workers = this.orgWorkers.get(req.orgId) ?? [];
    if (workers.some((w) => w.workerEmail?.toLowerCase() === req.workerEmail.toLowerCase())) {
      throw new ApiError("CONFLICT", "This worker is already a member of your organization", 409);
    }

    const ts = Date.now();
    const newMembershipId = `99${String(ts).slice(-10)}-0000-4000-8000-${String(ts).padStart(12, "0").slice(-12)}`;
    const newAuthUserId = `88${String(ts).slice(-10)}-0000-4000-8000-${String(ts).padStart(12, "0").slice(-12)}`;
    const joinedAt = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");

    const newWorker: OrgWorker = {
      membershipId: newMembershipId,
      authUserId: newAuthUserId,
      organizationId: req.orgId,
      role: "WORKER",
      displayName: req.workerName,
      workerEmail: req.workerEmail,
      joinedAt,
    };

    this.orgWorkers.set(req.orgId, [...workers, newWorker]);

    return {
      data: {
        membershipId: newMembershipId,
        authUserId: newAuthUserId,
        displayName: req.workerName,
        workerEmail: req.workerEmail,
        isNewUser: true,
      },
    };
  }
}
