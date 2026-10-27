import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { DashboardQuery, DisputesQuery, MonthQuery, ResolveDisputeRequest, Role, ShiftsQuery } from "../lib/contracts";
import { ApiError, databaseError } from "./errors";
import { DisputeRowSchema, MembershipRowSchema, OrganizationRowSchema, disputeOutput, monthBounds, payOutput, shiftOutput, totals } from "./model";

export type Actor = { authUserId: string; email: string | null };
export const SHIFT_SELECT = "id,organization_id,worker_membership_id,site_label,status,scheduled_start_at,scheduled_end_at,checked_in_at,checked_out_at,unpaid_break_minutes,weekend_eligible,rule_version,pay_basis,rate_minor,overtime_after_minutes,overtime_multiplier_bps,fixed_allowance_minor,weekend_bonus_minor,recorded_pay(amount_minor)";
const MEMBER_SELECT = "id,organization_id,auth_user_id,role";
const DISPUTE_SELECT = "id,organization_id,shift_id,opened_by_membership_id,reason,status,resolution_explanation,resolved_by_membership_id,created_at,resolved_at";
function result<T>(reply: { data: T; error: { code?: string; message?: string } | null }): T {
  if (reply.error) throw databaseError(reply.error);
  return reply.data;
}
function paging(limit: number, offset: number, length: number) {
  return { limit, offset, nextOffset: length > limit ? offset + limit : null };
}

/** Created per verified request. Privileged queries always include actor/org/owner scopes.
 * userDb is used only to discover a path target under end-user RLS before privileged access.
 */
export class FairShiftService {
  private readonly actor: Actor;
  private readonly db: SupabaseClient;
  private readonly userDb: SupabaseClient;
  constructor(actor: Actor, db: SupabaseClient, userDb: SupabaseClient) {
    this.actor = actor;
    this.db = db;
    this.userDb = userDb;
  }

  async membership(orgId: string, role?: Role) {
    const raw = result(await this.db.from("worker_memberships").select(MEMBER_SELECT)
      .eq("auth_user_id", this.actor.authUserId).eq("organization_id", orgId).maybeSingle());
    if (!raw) throw new ApiError("FORBIDDEN", 403, "Organization access denied");
    const member = MembershipRowSchema.parse(raw);
    if (role && member.role !== role) throw new ApiError("FORBIDDEN", 403, "Organization role required");
    const organization = result(await this.db.from("organizations").select("id,name,sector").eq("id", orgId).maybeSingle());
    if (!organization) throw new ApiError("NOT_FOUND", 404, "Organization not found");
    return { member, organization: OrganizationRowSchema.parse(organization) };
  }

  async shiftAccess(shiftId: string, role: Role) {
    const target = result(await this.userDb.from("shifts").select("id,organization_id,worker_membership_id")
      .eq("id", shiftId).maybeSingle());
    if (!target) throw new ApiError("NOT_FOUND", 404, "Shift not found");
    const row = z.object({ id: z.string(), organization_id: z.string(), worker_membership_id: z.string() }).parse(target);
    const scope = await this.membership(row.organization_id, role);
    if (role === "WORKER" && scope.member.id !== row.worker_membership_id) {
      throw new ApiError("NOT_FOUND", 404, "Shift not found");
    }
    return scope;
  }

  private async rpc(name: string, args: Record<string, unknown>) {
    return result(await this.db.rpc(name, { ...args, p_actor_user_id: this.actor.authUserId }));
  }

  async me() {
    const members = z.array(MembershipRowSchema).parse(result(await this.db.from("worker_memberships")
      .select(MEMBER_SELECT).eq("auth_user_id", this.actor.authUserId).order("id")));
    const memberships = await Promise.all(members.map(async m => {
      const org = OrganizationRowSchema.parse(result(await this.db.from("organizations")
        .select("id,name,sector").eq("id", m.organization_id).single()));
      return { id: m.id, organizationId: org.id, organizationName: org.name, sector: org.sector, role: m.role };
    }));
    return { data: { user: { id: this.actor.authUserId, email: this.actor.email }, memberships } };
  }

  async shifts(q: ShiftsQuery) {
    if (q.from && q.to && Date.parse(q.from) > Date.parse(q.to)) throw new ApiError("VALIDATION_ERROR", 400, "from must not exceed to");
    const { member, organization } = await this.membership(q.orgId, "WORKER");
    let query = this.db.from("shifts").select(SHIFT_SELECT).eq("organization_id", q.orgId)
      .eq("worker_membership_id", member.id);
    if (q.from) query = query.gte("scheduled_start_at", q.from);
    if (q.to) query = query.lte("scheduled_start_at", q.to);
    const rows = result(await query.order("scheduled_start_at", { ascending: false }).order("id", { ascending: false })
      .range(q.offset, q.offset + q.limit)) ?? [];
    return { data: rows.slice(0, q.limit).map(r => shiftOutput(r, organization.sector)), paging: paging(q.limit, q.offset, rows.length) };
  }

  private async monthShifts(orgId: string, month: string, workerId?: string) {
    const [from, to] = monthBounds(month);
    const rows: unknown[] = [];
    // PostgREST commonly caps responses at 1000. Fetch bounded pages until exhausted,
    // rather than silently truncating earnings or counting only the first page.
    for (let offset = 0; ;) {
      let query = this.db.from("shifts").select(SHIFT_SELECT).eq("organization_id", orgId)
        .gte("scheduled_start_at", from).lt("scheduled_start_at", to);
      if (workerId) query = query.eq("worker_membership_id", workerId).eq("status", "COMPLETED");
      const page = result(await query.order("scheduled_start_at", { ascending: false }).order("id", { ascending: false })
        .range(offset, offset + 499)) ?? [];
      rows.push(...page);
      if (page.length === 0) break;
      offset += page.length;
    }
    return rows;
  }

  async earnings(q: MonthQuery) {
    const { member, organization } = await this.membership(q.orgId, "WORKER");
    const shifts = (await this.monthShifts(q.orgId, q.month, member.id)).map(r => shiftOutput(r, organization.sector));
    return { data: { organizationId: q.orgId, sector: organization.sector, month: q.month, currency: "INR", ...totals(shifts), shifts } };
  }

  async attendance(shiftId: string, breakMinutes?: number) {
    const { organization } = await this.shiftAccess(shiftId, "WORKER");
    const row = await this.rpc(breakMinutes === undefined ? "fairshift_check_in" : "fairshift_check_out",
      { p_shift_id: shiftId, ...(breakMinutes === undefined ? {} : { p_unpaid_break_minutes: breakMinutes }) });
    return { data: shiftOutput(row, organization.sector) };
  }

  async disputes(q: DisputesQuery) {
    const { member } = await this.membership(q.orgId);
    let query = this.db.from("disputes").select(DISPUTE_SELECT).eq("organization_id", q.orgId);
    if (member.role === "WORKER") query = query.eq("opened_by_membership_id", member.id);
    if (q.status) query = query.eq("status", q.status);
    const rows = result(await query.order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(q.offset, q.offset + q.limit)) ?? [];
    return { data: rows.slice(0, q.limit).map(disputeOutput), paging: paging(q.limit, q.offset, rows.length) };
  }

  async createDispute(shiftId: string, reason: string) {
    await this.shiftAccess(shiftId, "WORKER");
    return { data: disputeOutput(await this.rpc("fairshift_create_dispute", { p_shift_id: shiftId, p_reason: reason })) };
  }

  async dashboard(q: DashboardQuery) {
    const { organization } = await this.membership(q.orgId, "EMPLOYER");
    if (q.sector && q.sector !== organization.sector) throw new ApiError("VALIDATION_ERROR", 400, "Sector does not match organization");
    const [raw, workers, disputes] = await Promise.all([
      this.monthShifts(q.orgId, q.month),
      this.db.from("worker_memberships").select("id", { count: "exact", head: true }).eq("organization_id", q.orgId).eq("role", "WORKER"),
      this.db.from("disputes").select("id", { count: "exact", head: true }).eq("organization_id", q.orgId).eq("status", "OPEN"),
    ]);
    result(workers); result(disputes);
    const shifts = raw.map(r => shiftOutput(r, organization.sector));
    const sum = totals(shifts);
    return { data: { organizationId: q.orgId, sector: organization.sector, month: q.month, currency: "INR",
      workerCount: workers.count ?? 0, totalShifts: shifts.length, completedShifts: sum.completedCount,
      underpaidShifts: sum.underpaidCount, openDisputes: disputes.count ?? 0,
      totalExpectedMinor: sum.totalExpectedMinor, totalRecordedMinor: sum.totalRecordedMinor,
      recordedCount: sum.recordedCount, recentShifts: shifts.slice(0, 20) } };
  }

  async recordPay(shiftId: string, amountMinor: number) {
    await this.shiftAccess(shiftId, "EMPLOYER");
    return { data: payOutput(await this.rpc("fairshift_record_pay", { p_shift_id: shiftId, p_amount_minor: amountMinor })) };
  }

  async resolveDispute(disputeId: string, body: ResolveDisputeRequest) {
    const raw = result(await this.userDb.from("disputes").select(DISPUTE_SELECT).eq("id", disputeId).maybeSingle());
    if (!raw) throw new ApiError("NOT_FOUND", 404, "Dispute not found");
    const target = DisputeRowSchema.parse(raw);
    await this.membership(target.organization_id, "EMPLOYER");
    const value: unknown = await this.rpc("fairshift_resolve_dispute", { p_dispute_id: disputeId, p_decision: body.decision,
      p_explanation: body.explanation, p_corrected_amount_minor: body.decision === "APPROVED" ? body.correctedRecordedAmountMinor : null });
    const resolved = z.object({ dispute: z.unknown(), recordedPay: z.unknown() }).parse(value);
    return { data: { dispute: disputeOutput(resolved.dispute), recordedPay: payOutput(resolved.recordedPay) } };
  }
}
