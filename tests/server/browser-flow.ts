/** Optional real-browser verification. No intercepted HTTP responses or synthetic sessions. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DisputeResponseSchema } from "../../src/lib/contracts.ts";

export async function verifyBrowserFlows(options: {
  driver: string; base: string; marker: string; password: string;
  orgs: string[]; memberIds: string[]; admin: SupabaseClient;
  recordPay: (employer: number, shiftId: string, amountMinor: number) => Promise<Response>;
}) {
  const { chromium } = await import(options.driver);
  const browser = await chromium.launch({ headless: true });
  const { base, marker, password, orgs, memberIds, admin, recordPay } = options;
  const checked = (reply: { error: unknown }) => assert.equal(reply.error, null, "Browser fixture operation must succeed");
  try {
    for (const [sector, worker, employer, orgIndex, expected, recorded] of [
      ["construction", 0, 2, 0, 110000, 104000], ["campus", 3, 4, 1, 70000, 65000],
    ] as const) {
      const shiftId = randomUUID();
      const plannedId = randomUUID();
      const site = `Browser ${sector} completed`;
      const plannedSite = `Browser ${sector} attendance`;
      const start = sector === "construction" ? "2026-10-23T02:30:00Z" : "2026-10-24T03:30:00Z";
      const end = sector === "construction" ? "2026-10-23T11:30:00Z" : "2026-10-24T11:30:00Z";
      checked(await admin.from("shifts").insert([
        { id: shiftId, organization_id: orgs[orgIndex], worker_membership_id: memberIds[worker], site_label: site,
          scheduled_start_at: start, scheduled_end_at: end, checked_in_at: start, checked_out_at: end,
          status: "COMPLETED", unpaid_break_minutes: sector === "construction" ? 30 : 0 },
        { id: plannedId, organization_id: orgs[orgIndex], worker_membership_id: memberIds[worker], site_label: plannedSite,
          scheduled_start_at: start, scheduled_end_at: end },
      ]));
      assert.equal((await recordPay(employer, shiftId, recorded)).status, 200);
      const context = await browser.newContext();
      await context.addInitScript(() => { localStorage.setItem("fairshift_onboarding_done", "1"); localStorage.setItem("fairshift_lang", "en"); });
      const page = await context.newPage();
      page.setDefaultTimeout(45_000);
      const errors: string[] = [];
      page.on("pageerror", (error: Error) => errors.push(error.message));
      const signIn = async (account: number, portal: string) => {
        await page.goto(base);
        await page.getByLabel("Email", { exact: true }).fill(`fairshift-live-${marker}-${account}@example.test`);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        if (portal === "Worker Portal") await page.getByRole("button", { name: /^My Work/ }).click();
        else await page.getByRole("button", { name: portal, exact: true }).waitFor();
        await page.getByLabel("Reporting month (Asia/Kolkata)").fill("2026-10");
      };
      await signIn(worker, "Worker Portal");
      const card = page.locator("div.bg-white.rounded-xl").filter({ has: page.getByRole("heading", { name: site, exact: true }) });
      await card.getByText(/Missing Money/).first().waitFor();
      await card.getByText(sector === "construction" ? "₹1,100.00" : "₹700.00", { exact: true }).waitFor();

      // Check-in must use the actual backend; only the elapsed test duration is aged
      // through the trusted fixture client, never through a browser timestamp field.
      const attendance = page.locator("div.bg-white.rounded-xl").filter({ has: page.getByRole("heading", { name: plannedSite, exact: true }) });
      const checkin = page.waitForResponse((response: { url(): string; request(): { method(): string } }) => response.url().includes(`${plannedId}/check-in`) && response.request().method() === "POST");
      await attendance.getByRole("button", { name: /Check In/ }).click();
      assert.equal((await checkin).status(), 200);
      await attendance.getByRole("button", { name: /Check Out/ }).waitFor();
      checked(await admin.from("shifts").update({ checked_in_at: new Date(Date.now() - 120_000).toISOString() }).eq("id", plannedId));
      await attendance.getByRole("button", { name: /Check Out/ }).click();
      await page.getByRole("dialog").getByRole("spinbutton").fill("0");
      const checkout = page.waitForResponse((response: { url(): string; request(): { method(): string } }) => response.url().includes(`${plannedId}/check-out`) && response.request().method() === "POST");
      await page.getByRole("dialog").getByRole("button", { name: /Confirm/ }).click();
      assert.equal((await checkout).status(), 200);
      await page.getByRole("dialog").waitFor({ state: "hidden" });

      const reason = `Browser review ${sector}: missing sector allowance.`;
      await card.getByRole("button", { name: /Report Missing Money/ }).click();
      await page.getByLabel("What is the problem?").fill(reason);
      const creation = page.waitForResponse((response: { url(): string; request(): { method(): string } }) => response.url().endsWith("/api/disputes") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Submit Complaint" }).click();
      const response = await creation;
      assert.equal(response.status(), 201);
      const dispute = DisputeResponseSchema.parse(await response.json()).data;
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.getByLabel("Email", { exact: true }).waitFor();
      await signIn(employer, "Employer Portal");
      await page.getByRole("button", { name: /^Disputes/ }).click();
      const employerCase = page.locator("div.bg-white.p-5").filter({ hasText: reason });
      await employerCase.getByRole("button", { name: "Adjudicate", exact: true }).click();
      const note = `Reviewed ${sector} attendance and corrected the missing allowance.`;
      await page.getByLabel("Corrected Recorded Pay (INR ₹)").fill((expected / 100).toFixed(2));
      await page.getByLabel("Formal Resolution Note / Explanation").fill(note);
      const resolution = page.waitForResponse((response: { url(): string; request(): { method(): string } }) => response.url().includes(`${dispute.id}/resolve`) && response.request().method() === "PATCH");
      await page.getByRole("button", { name: "Confirm & Save Adjustment", exact: true }).click();
      assert.equal((await resolution).status(), 200);
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.getByLabel("Email", { exact: true }).waitFor();
      await signIn(worker, "Worker Portal");
      await page.getByRole("button", { name: "Complaints", exact: true }).first().click();
      const workerCase = page.locator("div.bg-white.p-5").filter({ hasText: reason });
      await workerCase.getByText("Approved & Adjusted", { exact: true }).waitFor();
      await workerCase.getByText(note, { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser.close(); }
}
