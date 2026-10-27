/** Server-only Supabase helpers. Do not import from browser components. */
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase environment is not configured");
  return { url, key };
}

/** Caller gets authenticated end-user client; read queries are also constrained by RLS. */
export async function createUserClient() {
  const { url, key } = publicEnv();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(changes) {
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
  if (!key) throw new Error("Server Supabase service role is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
