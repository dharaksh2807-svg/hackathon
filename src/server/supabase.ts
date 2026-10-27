/** Server-only Supabase helpers. Do not import from browser components. */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ApiError } from "./errors";

function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError("SERVER_ERROR", 503, "Authentication service is not configured");
  return { url, key };
}

/** Caller gets authenticated end-user client; read queries are also constrained by RLS. */
export async function createUserClient() {
  const { url, key } = publicEnv();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(changes: { name: string; value: string; options: CookieOptions }[]) {
        // Writing cookies is supported from route handlers; not from Server Components.
        try {
          changes.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch { /* Server Component cannot update cookies; proxy handles refresh. */ }
      },
    },
  });
}

/** Privileged client must never be exposed in client code. Enforce actor + org BEFORE every query. */
export function createPrivilegedClient() {
  const { url } = publicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new ApiError("SERVER_ERROR", 503, "Database service is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
