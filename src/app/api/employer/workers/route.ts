/**
 * /api/employer/workers
 *
 * GET  ?orgId=<uuid>   — List WORKER-role memberships in the org (EMPLOYER only).
 * POST               — Add a worker to the org (EMPLOYER only, WORKER role only).
 *
 * Security invariants:
 *  - Caller identity is always verified via Supabase Auth cookie, never from request body.
 *  - requireMembership(orgId, "EMPLOYER") is called FIRST on every mutating path.
 *  - All DB writes go through the service-role privileged client (never the anon key).
 *  - Only role="WORKER" is ever inserted; callers cannot create EMPLOYER accounts here.
 *  - Duplicate membership (same auth_user_id + org) is detected before insert.
 */
import "server-only";
import { type NextRequest } from "next/server";
import { requireMembership } from "@/server/auth";
import { createPrivilegedClient } from "@/server/supabase";
import { AccessError } from "@/server/auth";
import { UuidSchema, AddWorkerRequestSchema } from "@/lib/contracts";

function errResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

/* ─── GET /api/employer/workers?orgId= ─── */
export async function GET(request: NextRequest) {
  try {
    const rawOrgId = request.nextUrl.searchParams.get("orgId");
    const orgIdParsed = UuidSchema.safeParse(rawOrgId);
    if (!orgIdParsed.success) {
      return errResponse("VALIDATION_ERROR", "orgId must be a valid UUID", 400);
    }
    const orgId = orgIdParsed.data;

    // Verify caller is an EMPLOYER in this org
    await requireMembership(orgId, "EMPLOYER");

    const admin = createPrivilegedClient();

    const { data: members, error: membersError } = await admin
      .from("worker_memberships")
      .select("id, auth_user_id, organization_id, role, display_name, created_at")
      .eq("organization_id", orgId)
      .eq("role", "WORKER")
      .order("created_at", { ascending: true });

    if (membersError) {
      return errResponse("SERVER_ERROR", "Failed to fetch worker roster", 500);
    }

    // Augment each membership with the auth user's email (N+1 is acceptable at this scale).
    const workers = await Promise.all(
      (members ?? []).map(async (m) => {
        const { data: userData } = await admin.auth.admin.getUserById(m.auth_user_id);
        return {
          membershipId: m.id,
          authUserId: m.auth_user_id,
          organizationId: m.organization_id,
          role: m.role,
          displayName: m.display_name,
          workerEmail: userData?.user?.email ?? null,
          joinedAt: m.created_at,
        };
      })
    );

    return Response.json({ data: workers });
  } catch (e) {
    if (e instanceof AccessError) {
      return errResponse(e.code, e.message, e.code === "UNAUTHENTICATED" ? 401 : 403);
    }
    console.error("[GET /api/employer/workers]", e);
    return errResponse("SERVER_ERROR", "Unexpected server error", 500);
  }
}

/* ─── POST /api/employer/workers ─── */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = AddWorkerRequestSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid request body";
      return errResponse("VALIDATION_ERROR", msg, 400);
    }
    const { orgId, workerName, workerEmail } = parsed.data;

    // ① Verify the caller is an EMPLOYER in this org (must run BEFORE any write).
    await requireMembership(orgId, "EMPLOYER");

    const admin = createPrivilegedClient();

    // ② Provision the auth user.
    //    - inviteUserByEmail: creates the account + sends a secure setup email to the worker.
    //    - If the email is already registered, fall back to finding the existing user ID.
    let authUserId: string;
    let isNewUser: boolean;

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      workerEmail,
      { data: { full_name: workerName } }
    );

    if (!inviteError && inviteData?.user) {
      authUserId = inviteData.user.id;
      isNewUser = true;
    } else {
      // User likely already exists; locate by email via admin listUsers.
      const { data: listData, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) {
        return errResponse("SERVER_ERROR", "Could not verify user account", 500);
      }
      const existing = listData.users.find(
        (u) => u.email?.toLowerCase() === workerEmail.toLowerCase()
      );
      if (!existing) {
        // Invite failed for a reason other than "already exists".
        return errResponse(
          "SERVER_ERROR",
          inviteError?.message ?? "Failed to create worker account",
          500
        );
      }
      authUserId = existing.id;
      isNewUser = false;
    }

    // ③ Prevent duplicate membership (same auth_user_id in the same org).
    const { data: duplicate } = await admin
      .from("worker_memberships")
      .select("id")
      .eq("organization_id", orgId)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (duplicate) {
      return errResponse("CONFLICT", "This worker is already a member of your organization", 409);
    }

    // ④ Insert WORKER membership only — role is hard-coded to prevent privilege escalation.
    const { data: membership, error: insertError } = await admin
      .from("worker_memberships")
      .insert({
        organization_id: orgId,
        auth_user_id: authUserId,
        role: "WORKER",
        display_name: workerName,
      })
      .select("id")
      .single();

    if (insertError || !membership) {
      console.error("[POST /api/employer/workers] insert error:", insertError);
      return errResponse("SERVER_ERROR", "Failed to create worker membership", 500);
    }

    return Response.json(
      {
        data: {
          membershipId: membership.id,
          authUserId,
          displayName: workerName,
          workerEmail,
          isNewUser,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AccessError) {
      return errResponse(e.code, e.message, e.code === "UNAUTHENTICATED" ? 401 : 403);
    }
    console.error("[POST /api/employer/workers]", e);
    return errResponse("SERVER_ERROR", "Unexpected server error", 500);
  }
}
