import type { z } from "zod";
/**
 * Typed FairShift API client.
 * Connects to the frozen REST endpoints specified in docs/API_CONTRACT.md.
 * Uses same-origin authenticated HTTP requests; failures never select synthetic data.
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
  Sector,
  AddWorkerRequest,
  AddWorkerResponse,
  OrgWorkersResponse,
} from "./types.ts";

import {
  ErrorResponseSchema,
  MeResponseSchema,
  ShiftsResponseSchema,
  ShiftResponseSchema,
  EarningsResponseSchema,
  DisputesResponseSchema,
  DisputeResponseSchema,
  DashboardResponseSchema,
  RecordedPayResponseSchema,
  ResolveDisputeResponseSchema,
  AddWorkerResponseSchema,
  OrgWorkersResponseSchema,
} from "../contracts.ts";

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
  listOrgWorkers(params: { orgId: string }): Promise<OrgWorkersResponse>;
  addWorker(req: AddWorkerRequest): Promise<AddWorkerResponse>;
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

  private async request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body) headers.set("content-type", "application/json");

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin",
        cache: "no-store",
      });

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const parsedError = ErrorResponseSchema.safeParse(json);
        const error = parsedError.success ? parsedError.data.error : undefined;
        throw new ApiError(
          error?.code || (res.status === 404 ? "NOT_FOUND" : "SERVER_ERROR"),
          error?.message || `Request failed with status ${res.status}`,
          res.status,
          error?.requestId
        );
      }

      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError("INVALID_RESPONSE", "The server returned an invalid response. Please retry.", 502);
      }
      return parsed.data;
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
    return this.request("/api/me", MeResponseSchema, { method: "GET" });
  }

  async getWorkerShifts(params: { orgId: string; from?: string; to?: string; limit?: number; offset?: number }): Promise<ShiftsResponse> {
    const query = new URLSearchParams({ orgId: params.orgId });
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    return this.request(`/api/worker/shifts?${query.toString()}`, ShiftsResponseSchema, { method: "GET" });
  }

  async getWorkerEarnings(params: { orgId: string; month: string }): Promise<EarningsResponse> {
    const query = new URLSearchParams({ orgId: params.orgId, month: params.month });
    return this.request(`/api/worker/earnings?${query.toString()}`, EarningsResponseSchema, { method: "GET" });
  }

  async checkIn(shiftId: string): Promise<ShiftResponse> {
    return this.request(`/api/worker/shifts/${encodeURIComponent(shiftId)}/check-in`, ShiftResponseSchema, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async checkOut(shiftId: string, unpaidBreakMinutes: number): Promise<ShiftResponse> {
    return this.request(`/api/worker/shifts/${encodeURIComponent(shiftId)}/check-out`, ShiftResponseSchema, {
      method: "POST",
      body: JSON.stringify({ unpaidBreakMinutes }),
    });
  }

  async getDisputes(params: { orgId: string; status?: "OPEN" | "APPROVED" | "REJECTED"; limit?: number; offset?: number }): Promise<DisputesResponse> {
    const query = new URLSearchParams({ orgId: params.orgId });
    if (params.status) query.set("status", params.status);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    return this.request(`/api/disputes?${query.toString()}`, DisputesResponseSchema, { method: "GET" });
  }

  async createDispute(req: CreateDisputeRequest): Promise<DisputeResponse> {
    return this.request("/api/disputes", DisputeResponseSchema, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async getEmployerDashboard(params: { orgId: string; month: string; sector?: Sector }): Promise<DashboardResponse> {
    const query = new URLSearchParams({ orgId: params.orgId, month: params.month });
    if (params.sector) query.set("sector", params.sector);
    return this.request(`/api/employer/dashboard?${query.toString()}`, DashboardResponseSchema, { method: "GET" });
  }

  async setRecordedPay(shiftId: string, amountMinor: number): Promise<RecordedPayResponse> {
    return this.request(`/api/employer/shifts/${encodeURIComponent(shiftId)}/recorded-pay`, RecordedPayResponseSchema, {
      method: "PUT",
      body: JSON.stringify({ amountMinor }),
    });
  }

  async resolveDispute(disputeId: string, req: ResolveDisputeRequest): Promise<ResolveDisputeResponse> {
    return this.request(`/api/employer/disputes/${encodeURIComponent(disputeId)}/resolve`, ResolveDisputeResponseSchema, {
      method: "PATCH",
      body: JSON.stringify(req),
    });
  }

  async listOrgWorkers(params: { orgId: string }): Promise<OrgWorkersResponse> {
    const query = new URLSearchParams({ orgId: params.orgId });
    return this.request(`/api/employer/workers?${query.toString()}`, OrgWorkersResponseSchema, { method: "GET" });
  }

  async addWorker(req: AddWorkerRequest): Promise<AddWorkerResponse> {
    return this.request("/api/employer/workers", AddWorkerResponseSchema, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }
}

/**
 * Singleton live client instance.
 */
let currentClient: FairShiftApiClient = new HttpApiClient();

export function getApiClient(): FairShiftApiClient {
  return currentClient;
}

export function setApiClient(client: FairShiftApiClient) {
  currentClient = client;
}
