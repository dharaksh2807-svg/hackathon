import "server-only";
import { createPrivilegedClient, createUserClient } from "./supabase";
import { ApiError } from "./errors";
import { FairShiftService } from "./service";

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
