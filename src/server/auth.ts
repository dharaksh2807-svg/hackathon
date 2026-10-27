import "server-only";
import { createPrivilegedClient, createUserClient } from "./supabase";
import { ApiError } from "./errors";
import { FairShiftService } from "./service";

import type { Role } from "../lib/contracts";

export class AccessError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "AccessError";
  }
}

/** getUser verifies the cookie session with Supabase Auth on EVERY API request.
 * Neither request role claims nor a locally decoded session are authorization.
 */
export async function requireUser() {
  const client = await createUserClient();
  const { data, error } = await client.auth.getUser();
  if (error && (!error.status || error.status === 429 || error.status >= 500)) {
    throw new ApiError("SERVER_ERROR", 503, "Authentication service is unavailable");
  }
  if (error || !data.user) throw new ApiError("UNAUTHENTICATED", 401, "Sign in required");
  return { client, actor: { authUserId: data.user.id, email: data.user.email ?? null } };
}
export async function createService() {
  const { client, actor } = await requireUser();
  return new FairShiftService(actor, createPrivilegedClient(), client);
}

/** Membership source of truth is the DB. Invoke BEFORE privileged reads and writes. */
export async function requireMembership(orgId: string, role?: Role) {
  const { actor } = await requireUser();
  const admin = createPrivilegedClient();
  const { data, error } = await admin
    .from("worker_memberships")
    .select("id,organization_id,auth_user_id,role")
    .eq("organization_id", orgId)
    .eq("auth_user_id", actor.authUserId)
    .maybeSingle();
  if (error) throw new Error("Membership lookup failed");
  if (!data || (role && data.role !== role)) {
    throw new AccessError("FORBIDDEN", "Organization access denied");
  }
  return { actor, membership: data };
}
