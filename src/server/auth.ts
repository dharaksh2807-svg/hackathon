import "server-only";
import { createPrivilegedClient, createUserClient } from "./supabase";
import type { Role } from "@/lib/contracts";

export class AccessError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND", message: string) { super(message); }
}

/** Always verify user with Supabase Auth; never trust request body userId or role. */
export async function requireUser() {
  const client = await createUserClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AccessError("UNAUTHENTICATED", "Sign in required");
  return { authUserId: data.user.id, email: data.user.email ?? null };
}

/** Membership source of truth is the DB. Invoke BEFORE privileged reads and writes. */
export async function requireMembership(orgId: string, role?: Role) {
  const actor = await requireUser();
  const admin = createPrivilegedClient();
  const { data, error } = await admin.from("worker_memberships")
    .select("id,organization_id,auth_user_id,role")
    .eq("organization_id", orgId).eq("auth_user_id", actor.authUserId).maybeSingle();
  if (error) throw new Error("Membership lookup failed");
  if (!data || (role && data.role !== role)) throw new AccessError("FORBIDDEN", "Organization access denied");
  return { actor, membership: data };
}

/** Route implementation must fetch each targeted record scoped to the verified orgId. */
export async function requireShiftAccess(orgId: string, shiftId: string, role: Role) {
  const { membership } = await requireMembership(orgId, role);
  const admin = createPrivilegedClient();
  const { data, error } = await admin.from("shifts").select("id,organization_id,worker_membership_id,status")
    .eq("id", shiftId).eq("organization_id", orgId).maybeSingle();
  if (error) throw new Error("Shift lookup failed");
  if (!data || (role === "WORKER" && data.worker_membership_id !== membership.id)) {
    throw new AccessError("NOT_FOUND", "Shift not found");
  }
  return { membership, shift: data };
}
