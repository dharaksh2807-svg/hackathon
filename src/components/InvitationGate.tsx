"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getBrowserAuth } from "@/lib/browser-auth";

/** Supabase admin invitations use a token fragment, independently of password sign-in. */
export function InvitationGate({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (!["invite", "recovery"].includes(params.get("type") ?? "") && !params.has("error")) return;
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    // Remove credentials before initializing the PKCE browser client.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    void (async () => {
      await Promise.resolve();
      setActive(true);
      if (!access_token || !refresh_token) {
        setError("This setup link is invalid or expired. Ask your organization for a new invitation.");
        return;
      }
      try {
        const auth = getBrowserAuth().auth;
        const session = await auth.setSession({ access_token, refresh_token });
        if (session.error) throw session.error;
        const verified = await auth.getUser();
        if (verified.error || !verified.data.user) throw new Error("Unable to verify this setup link.");
        setReady(true);
      } catch {
        setError("This setup link could not be verified. Ask your organization for a new invitation.");
      }
    })();
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("password"));
    if (password !== fields.get("confirm")) { setError("The passwords must match."); return; }
    setBusy(true);
    setError(null);
    try {
      const { error } = await getBrowserAuth().auth.updateUser({ password });
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save your password.");
      setBusy(false);
    }
  }

  if (!active) return children;
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={savePassword} className="w-full max-w-sm bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h1 className="text-xl font-bold">Set up your FairShift password</h1>
        <p className="text-sm text-slate-600">Choose your own password to sign in again. Keep it private.</p>
        {ready && <>
          <label className="block text-sm">New password
            <input name="password" type="password" autoComplete="new-password" minLength={8} required className="block w-full mt-1 p-2 border rounded-lg" />
          </label>
          <label className="block text-sm">Confirm password
            <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="block w-full mt-1 p-2 border rounded-lg" />
          </label>
          <button disabled={busy} className="w-full p-2 bg-blue-700 text-white rounded-lg disabled:opacity-50">{busy ? "Saving…" : "Save password and continue"}</button>
        </>}
        {!ready && !error && <p role="status">Verifying your invitation…</p>}
        {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
        <button type="button" onClick={() => setActive(false)} className="block text-sm text-blue-700 underline">Return to sign in</button>
      </form>
    </main>
  );
}
