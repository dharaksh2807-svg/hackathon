/** FairShift API v1. All API JSON uses camelCase; SQL storage uses snake_case. */
import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const UtcIsoSchema = z.string().datetime({ offset: false }).regex(/Z$/, "UTC timestamp required");
export const SectorSchema = z.enum(["construction", "campus"]);
export const RoleSchema = z.enum(["WORKER", "EMPLOYER"]);
export const ShiftStatusSchema = z.enum(["PLANNED", "CHECKED_IN", "COMPLETED"]);
export const DisputeStatusSchema = z.enum(["OPEN", "APPROVED", "REJECTED"]);
export const ComparisonStatusSchema = z.enum(["MATCHED", "UNDERPAID", "OVERPAID", "NOT_RECORDED"]);
export const MoneyMinorSchema = z.number().int().nonnegative().max(2_147_483_647);
export const SignedMoneyMinorSchema = z.number().int().min(-2_147_483_647).max(2_147_483_647);
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");
export const ReasonSchema = z.string().trim().min(10).max(1000);
export const ExplanationSchema = z.string().trim().min(10).max(2000);
export const OrganizationQuerySchema = z.object({ orgId: UuidSchema }).strict();
export const MonthQuerySchema = OrganizationQuerySchema.extend({ month: MonthSchema }).strict();
export const ShiftsQuerySchema = OrganizationQuerySchema.extend({
  from: UtcIsoSchema.optional(),
  to: UtcIsoSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
}).strict();
export const DisputesQuerySchema = OrganizationQuerySchema.extend({
  status: DisputeStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
}).strict();
export const DashboardQuerySchema = MonthQuerySchema.extend({ sector: SectorSchema.optional() }).strict();
export const EmptyBodySchema = z.object({}).strict();
export const CheckoutRequestSchema = z.object({ unpaidBreakMinutes: z.number().int().min(0).max(1_440) }).strict();
export const CreateDisputeRequestSchema = z.object({ shiftId: UuidSchema, reason: ReasonSchema }).strict();
export const SetRecordedPayRequestSchema = z.object({ amountMinor: MoneyMinorSchema }).strict();
export const WorkerNameSchema = z.string().trim().min(1).max(100);
export const AddWorkerRequestSchema = z.object({
  orgId: UuidSchema,
  workerName: WorkerNameSchema,
  workerEmail: z.string().email().max(254),
}).strict();
export const OrgWorkerSchema = z.object({
  membershipId: UuidSchema,
  authUserId: UuidSchema,
  organizationId: UuidSchema,
  role: RoleSchema,
  displayName: z.string(),
  workerEmail: z.string().email().nullable(),
  joinedAt: z.string(), // ISO timestamp; may include tz offset from Supabase
}).strict();
export const AddWorkerResponseSchema = z.object({
  data: z.object({
    membershipId: UuidSchema,
    authUserId: UuidSchema,
    displayName: z.string(),
    workerEmail: z.string(),
    isNewUser: z.boolean(),
  }).strict(),
}).strict();
export const OrgWorkersResponseSchema = z.object({
  data: z.array(OrgWorkerSchema),
}).strict();

export const ResolveDisputeRequestSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVED"), explanation: ExplanationSchema, correctedRecordedAmountMinor: MoneyMinorSchema }).strict(),
  z.object({ decision: z.literal("REJECTED"), explanation: ExplanationSchema }).strict(),
]);

export const ErrorCodeSchema = z.enum([
  "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "INVALID_STATE",
  "DUPLICATE_DISPUTE", "CONFLICT", "RATE_LIMITED", "SERVER_ERROR", "NOT_IMPLEMENTED",
]);
export const ErrorResponseSchema = z.object({ error: z.object({ code: ErrorCodeSchema, message: z.string(), requestId: z.string().optional() }).strict() }).strict();
export const MembershipSchema = z.object({
  id: UuidSchema, organizationId: UuidSchema, organizationName: z.string(),
  sector: SectorSchema, role: RoleSchema,
}).strict();
export const MeResponseSchema = z.object({ data: z.object({
  user: z.object({ id: UuidSchema, email: z.string().email().nullable() }).strict(),
  memberships: z.array(MembershipSchema),
}).strict() }).strict();

export const EarningsBreakdownSchema = z.object({
  workedMinutes: z.number().int().min(1).max(1_440),
  regularMinor: MoneyMinorSchema, overtimeMinor: MoneyMinorSchema,
  fixedAllowanceMinor: MoneyMinorSchema, weekendBonusMinor: MoneyMinorSchema,
  expectedMinor: MoneyMinorSchema,
}).strict();
export const ShiftSchema = z.object({
  id: UuidSchema, organizationId: UuidSchema, workerMembershipId: UuidSchema,
  sector: SectorSchema, siteLabel: z.string(), status: ShiftStatusSchema,
  scheduledStartAt: UtcIsoSchema, scheduledEndAt: UtcIsoSchema,
  checkedInAt: UtcIsoSchema.nullable(), checkedOutAt: UtcIsoSchema.nullable(),
  unpaidBreakMinutes: z.number().int().min(0).max(1_440),
  earnings: EarningsBreakdownSchema.nullable(),
  recordedAmountMinor: MoneyMinorSchema.nullable(),
  comparisonStatus: ComparisonStatusSchema,
  differenceMinor: SignedMoneyMinorSchema.nullable(),
}).strict();
export const ShiftsResponseSchema = z.object({ data: z.array(ShiftSchema), paging: z.object({
  limit: z.number().int(), offset: z.number().int(), nextOffset: z.number().int().nullable(),
}).strict() }).strict();
export const ShiftResponseSchema = z.object({ data: ShiftSchema }).strict();
export const EarningsResponseSchema = z.object({ data: z.object({
  organizationId: UuidSchema, sector: SectorSchema, month: MonthSchema, currency: z.literal("INR"),
  totalExpectedMinor: MoneyMinorSchema, totalRecordedMinor: MoneyMinorSchema,
  recordedCount: z.number().int().nonnegative(), completedCount: z.number().int().nonnegative(),
  underpaidCount: z.number().int().nonnegative(),
  shifts: z.array(ShiftSchema),
}).strict() }).strict();

export const DisputeSchema = z.object({
  id: UuidSchema, organizationId: UuidSchema, shiftId: UuidSchema,
  openedByMembershipId: UuidSchema, reason: z.string(), status: DisputeStatusSchema,
  resolutionExplanation: z.string().nullable(), resolvedByMembershipId: UuidSchema.nullable(),
  createdAt: UtcIsoSchema, resolvedAt: UtcIsoSchema.nullable(),
}).strict();
export const DisputeResponseSchema = z.object({ data: DisputeSchema }).strict();
export const DisputesResponseSchema = z.object({ data: z.array(DisputeSchema), paging: z.object({
  limit: z.number().int(), offset: z.number().int(), nextOffset: z.number().int().nullable(),
}).strict() }).strict();
export const RecordedPayResponseSchema = z.object({ data: z.object({
  shiftId: UuidSchema, amountMinor: MoneyMinorSchema, enteredAt: UtcIsoSchema,
}).strict() }).strict();
export const ResolveDisputeResponseSchema = z.object({ data: z.object({
  dispute: DisputeSchema, recordedPay: RecordedPayResponseSchema.shape.data,
}).strict() }).strict();
export const DashboardResponseSchema = z.object({ data: z.object({
  organizationId: UuidSchema, sector: SectorSchema, month: MonthSchema, currency: z.literal("INR"),
  workerCount: z.number().int().nonnegative(), totalShifts: z.number().int().nonnegative(),
  completedShifts: z.number().int().nonnegative(), underpaidShifts: z.number().int().nonnegative(),
  openDisputes: z.number().int().nonnegative(), totalExpectedMinor: MoneyMinorSchema,
  totalRecordedMinor: MoneyMinorSchema, recordedCount: z.number().int().nonnegative(),
  recentShifts: z.array(ShiftSchema).max(20),
}).strict() }).strict();

export type Sector = z.infer<typeof SectorSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type Shift = z.infer<typeof ShiftSchema>;
export type Dispute = z.infer<typeof DisputeSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type ShiftsQuery = z.infer<typeof ShiftsQuerySchema>;
export type ShiftsResponse = z.infer<typeof ShiftsResponseSchema>;
export type ShiftResponse = z.infer<typeof ShiftResponseSchema>;
export type EarningsResponse = z.infer<typeof EarningsResponseSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type CreateDisputeRequest = z.infer<typeof CreateDisputeRequestSchema>;
export type DisputesResponse = z.infer<typeof DisputesResponseSchema>;
export type DisputeResponse = z.infer<typeof DisputeResponseSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type SetRecordedPayRequest = z.infer<typeof SetRecordedPayRequestSchema>;
export type ResolveDisputeRequest = z.infer<typeof ResolveDisputeRequestSchema>;
export type ResolveDisputeResponse = z.infer<typeof ResolveDisputeResponseSchema>;
export type RecordedPayResponse = z.infer<typeof RecordedPayResponseSchema>;

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type OrganizationQuery = z.infer<typeof OrganizationQuerySchema>;
export type MonthQuery = z.infer<typeof MonthQuerySchema>;
export type DisputesQuery = z.infer<typeof DisputesQuerySchema>;
export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;
export type EmptyBody = z.infer<typeof EmptyBodySchema>;
export type EarningsBreakdown = z.infer<typeof EarningsBreakdownSchema>;
export type AddWorkerRequest = z.infer<typeof AddWorkerRequestSchema>;
export type OrgWorker = z.infer<typeof OrgWorkerSchema>;
export type AddWorkerResponse = z.infer<typeof AddWorkerResponseSchema>;
export type OrgWorkersResponse = z.infer<typeof OrgWorkersResponseSchema>;
