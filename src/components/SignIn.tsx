"use client";

import { useState, type FormEvent } from "react";
import { getBrowserAuth } from "@/lib/browser-auth";

export function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { error } = await getBrowserAuth().auth.signInWithPassword({
        email: String(form.get("email")).trim(), password: String(form.get("password")),
      });
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={signIn} className="w-full max-w-sm bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Sign in to FairShift</h1>
        <p className="text-sm text-slate-600">Use your organization’s worker or employer account.</p>
        <label className="block text-sm">Email
          <input name="email" type="email" autoComplete="username" required className="block w-full mt-1 p-2 border rounded-lg" />
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" autoComplete="current-password" required className="block w-full mt-1 p-2 border rounded-lg" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
        <button disabled={busy} className="w-full p-2 bg-blue-700 text-white rounded-lg disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
