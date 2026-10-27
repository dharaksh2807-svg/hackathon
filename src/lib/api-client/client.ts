/**
 * Typed FairShift API client.
 * Connects to the frozen REST endpoints specified in docs/API_CONTRACT.md.
 * Provides both a live HTTP adapter and an explicit Demo Adapter for offline review.
 */

import type {
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
  Shift,
  Dispute,
  Sector,
} from "./types.ts";

import {
  FIXTURE_ORGS,
  FIXTURE_MEMBERSHIPS,
  FIXTURE_CONSTRUCTION_SHIFTS,
  FIXTURE_CAMPUS_SHIFTS,
  FIXTURE_DISPUTES,
  getFixtureWorkerEarnings,
  getFixtureEmployerDashboard,
} from "./fixtures.ts";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string;

  constructor(code: string, message: string, status = 400, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export interface FairShiftApiClient {
  readonly isDemo: boolean;
  getMe(): Promise<MeResponse>;
  getWorkerShifts(params: { orgId: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<ShiftsResponse>;
  getWorkerEarnings(params: { orgId: string; month: string }): Promise<EarningsResponse>;
  checkIn(shiftId: string): Promise<ShiftResponse>;
  checkOut(shiftId: string, unpaidBreakMinutes: number): Promise<ShiftResponse>;
  getDisputes(params: { orgId: string; status?: "OPEN" | "APPROVED" | "REJECTED"; limit?: number; offset?: number }): Promise<DisputesResponse>;
  createDispute(req: CreateDisputeRequest): Promise<DisputeResponse>;
  getEmployerDashboard(params: { orgId: string; month: string; sector?: Sector }): Promise<DashboardResponse>;
  setRecordedPay(shiftId: string, amountMinor: number): Promise<RecordedPayResponse>;
  resolveDispute(disputeId: string, req: ResolveDisputeRequest): Promise<ResolveDisputeResponse>;
}

/**
 * Live HTTP client communicating with /api route handlers.
 */
export class HttpApiClient implements FairShiftApiClient {
  readonly isDemo = false;
  private readonly baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const error = json?.error;
        throw new ApiError(
          error?.code || (res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR"),
          error?.message || `Request failed with status ${res.status}`,
          res.status,
          error?.requestId
        );
      }

      return json as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        "NETWORK_ERROR",
        err instanceof Error ? err.message : "Failed to connect to FairShift API endpoint",
        0
      );
    }
  }

  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>("/api/me", { method: "GET" });
  }

  async getWorkerShifts(params: { orgId: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<ShiftsResponse> {
    const query = new URLSearchParams({ orgId: params.orgId });
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    return this.request<ShiftsResponse>(`/api/worker/shifts?${query.toString()}`, { method: "GET" });
  }

  async getWorkerEarnings(params: { orgId: string; month: string }): Promise<EarningsResponse> {
    const query = new URLSearchParams({ orgId: params.orgId, month: params.month });
    return this.request<EarningsResponse>(`/api/worker/earnings?${query.toString()}`, { method: "GET" });
  }

  async checkIn(shiftId: string): Promise<ShiftResponse> {
    return this.request<ShiftResponse>(`/api/worker/shifts/${encodeURIComponent(shiftId)}/check-in`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async checkOut(shiftId: string, unpaidBreakMinutes: number): Promise<ShiftResponse> {
    return this.request<ShiftResponse>(`/api/worker/shifts/${encodeURIComponent(shiftId)}/check-out`, {
      method: "POST",
      body: JSON.stringify({ unpaidBreakMinutes }),
    });
  }

  async getDisputes(params: { orgId: string; status?: "OPEN" | "APPROVED" | "REJECTED"; limit?: number; offset?: number }): Promise<DisputesResponse> {
    const query = new URLSearchParams({ orgId: params.orgId });
    if (params.status) query.set("status", params.status);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    return this.request<DisputesResponse>(`/api/disputes?${query.toString()}`, { method: "GET" });
  }

  async createDispute(req: CreateDisputeRequest): Promise<DisputeResponse> {
    return this.request<DisputeResponse>("/api/disputes", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async getEmployerDashboard(params: { orgId: string; month: string; sector?: Sector }): Promise<DashboardResponse> {
    const query = new URLSearchParams({ orgId: params.orgId, month: params.month });
    if (params.sector) query.set("sector", params.sector);
    return this.request<DashboardResponse>(`/api/employer/dashboard?${query.toString()}`, { method: "GET" });
  }

  async setRecordedPay(shiftId: string, amountMinor: number): Promise<RecordedPayResponse> {
    return this.request<RecordedPayResponse>(`/api/employer/shifts/${encodeURIComponent(shiftId)}/recorded-pay`, {
      method: "PUT",
      body: JSON.stringify({ amountMinor }),
    });
  }

  async resolveDispute(disputeId: string, req: ResolveDisputeRequest): Promise<ResolveDisputeResponse> {
    return this.request<ResolveDisputeResponse>(`/api/employer/disputes/${encodeURIComponent(disputeId)}/resolve`, {
      method: "PATCH",
      body: JSON.stringify(req),
    });
  }
}

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
}

/**
 * Singleton client instance with toggleable fallback to demo adapter.
 */
let currentClient: FairShiftApiClient = new DemoApiClient();

export function getApiClient(): FairShiftApiClient {
  return currentClient;
}

export function setApiClient(client: FairShiftApiClient) {
  currentClient = client;
}
