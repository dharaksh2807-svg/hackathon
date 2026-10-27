/** Browser UI regressions use explicit intercepted synthetic responses.
 * They test rendering/accessibility only, not real Auth, persistence or authorization.
 * Run against a local app with FAIRSHIFT_BROWSER_URL and an external Playwright driver.
 */
import { TRANSLATIONS } from "../../src/lib/i18n/translations.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_MEMBERSHIPS, FIXTURE_DISPUTES, FIXTURE_CONSTRUCTION_SHIFTS, FIXTURE_CAMPUS_SHIFTS, getFixtureWorkerEarnings, getFixtureEmployerDashboard } from "../../src/lib/api-client/fixtures.ts";

const base = process.env.FAIRSHIFT_BROWSER_URL;
const driver = process.env.FAIRSHIFT_PLAYWRIGHT_MODULE;
const options = { skip: !(base && driver) && "Requires a local app and external Playwright driver" };

async function fixturePage(sector: "construction" | "campus" = "construction", role: "WORKER" | "EMPLOYER" = "WORKER", width = 1280, missingDisputeShift = false, expiredMutation = false) {
  const { chromium } = await import(driver!);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.addInitScript(() => { localStorage.setItem("fairshift_onboarding_done", "1"); localStorage.setItem("fairshift_lang", "en"); });
  const membership = FIXTURE_MEMBERSHIPS.find(m => m.sector === sector && m.role === role)!;
  const shifts = sector === "construction" ? FIXTURE_CONSTRUCTION_SHIFTS : FIXTURE_CAMPUS_SHIFTS;
  await page.route("**/api/**", async (route: { request(): { url(): string; method(): string }; fulfill(response: { status: number; contentType: string; body: string }): Promise<void> }) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let response: unknown;
    let status = 200;
    if (request.method() !== "GET") {
      status = expiredMutation ? 401 : 400;
      response = expiredMutation ? { error: { code: "UNAUTHENTICATED", message: "Sign in required" } } : { error: { code: "VALIDATION_ERROR", message: "Paid attendance must include at least one whole minute after breaks." } };
    } else if (path === "/api/me") response = { data: { user: { id: "70000000-0000-4000-8000-000000000001", email: "synthetic-audit@example.test" }, memberships: [membership] } };
    else if (path === "/api/worker/shifts") response = { data: shifts, paging: { limit: 100, offset: 0, nextOffset: null } };
    else if (path === "/api/worker/earnings") response = { data: getFixtureWorkerEarnings(sector) };
    else if (path === "/api/employer/dashboard") response = { data: getFixtureEmployerDashboard(sector) };
    else if (path === "/api/employer/workers") response = { data: [] };
    else if (path === "/api/disputes") response = { data: role === "EMPLOYER" ? FIXTURE_DISPUTES.filter(d => d.organizationId === membership.organizationId).map(d => missingDisputeShift ? { ...d, shiftId: "40000000-0000-4000-8000-000000000099" } : d) : [], paging: { limit: 100, offset: 0, nextOffset: null } };
    else throw new Error(`Unexpected audit fixture path: ${path}`);
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(response) });
  });
  try {
    await page.goto(base!);
    if (role === "WORKER") await page.getByRole("button", { name: /^My Work/ }).click();
    else await page.getByRole("button", { name: "Employer Portal", exact: true }).waitFor();
    await page.getByText(membership.organizationName, { exact: true }).waitFor();
    await page.getByText(shifts[0].siteLabel, { exact: true }).first().waitFor();
    await page.getByRole("button", { name: role === "WORKER" ? "View Pay Details" : /Adjust Pay|Enter Pay/, exact: true }).first().waitFor();
  } catch (error) { await browser.close(); throw error; }
  return { browser, page };
}

test("dialog focuses, contains keyboard navigation, hides background interaction, and restores focus", options, async () => {
  const { browser, page } = await fixturePage();
  try {
    const trigger = page.getByRole("button", { name: /Report Missing Money/ }).first();
    await trigger.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog"); await dialog.waitFor();
    assert.equal(await dialog.evaluate((element: HTMLElement) => element.contains(document.activeElement)), true, "Opening must move focus into the dialog");
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press(i < 6 ? "Tab" : "Shift+Tab");
      assert.equal(await dialog.evaluate((element: HTMLElement) => element.contains(document.activeElement)), true, "Tab must not reach the background");
    }
    assert.equal(await page.getByRole("navigation", { includeHidden: true }).first().evaluate((element: HTMLElement) => Boolean(element.closest("[inert]"))), true);
    const field = dialog.getByLabel("What is the problem?");
    await field.fill("short");
    assert.equal(await field.getAttribute("aria-invalid"), "true");
    assert.ok(await field.getAttribute("aria-describedby"));
    const contrast = await dialog.locator("#dispute-help span").first().evaluate((element: HTMLElement) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      context.fillStyle = getComputedStyle(element).color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      const linear = [r, g, b].map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return 1.05 / (0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] + 0.05);
    });
    assert.ok(contrast >= 4.5, `Validation text contrast must be at least 4.5:1, measured ${contrast}`);
    await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate((element: HTMLElement) => element === document.activeElement), true);
    assert.equal(await trigger.evaluate((element: HTMLElement) => getComputedStyle(element).outlineStyle), "solid");
  } finally { await browser.close(); }
});

test("checkout accepts every whole break minute and announces server validation failures", options, async () => {
  const { browser, page } = await fixturePage();
  try {
    await page.getByRole("button", { name: /Check Out/ }).first().click();
    const dialog = page.getByRole("dialog");
    const input = dialog.getByLabel("Unpaid Break Duration (Minutes)");
    await input.fill("17");
    assert.equal(await input.evaluate((element: HTMLInputElement) => element.checkValidity()), true, "The contract permits 17 whole unpaid minutes");
    await dialog.getByRole("button", { name: "Confirm & Check Out", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.match(await dialog.getByRole("alert").innerText(), /whole minute/);
    assert.equal(await input.getAttribute("aria-invalid"), "true");
    await input.fill("1.5");
    assert.equal(await input.evaluate((element: HTMLInputElement) => element.checkValidity()), false);
  } finally { await browser.close(); }
});

test("worker and employer portals fit 320px and 375px screens in both sectors", options, async () => {
  for (const sector of ["construction", "campus"] as const) for (const role of ["WORKER", "EMPLOYER"] as const) {
    const { browser, page } = await fixturePage(sector, role, 320);
    try {
      for (const width of [320, 375]) {
        await page.setViewportSize({ width, height: 900 });
        const bounds = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
        if (bounds.page > bounds.viewport) {
          console.log(await page.evaluate(() => Array.from(document.querySelectorAll("body *")).filter(element => element.getBoundingClientRect().right > innerWidth + 1).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0, 55), right: element.getBoundingClientRect().right })).slice(0, 14)));
          await page.screenshot({ path: "/tmp/fairshift-audit-overflow.png", fullPage: true });
        }
        assert.ok(bounds.page <= bounds.viewport, `${sector} ${role} page overflow at ${width}px: ${bounds.page}`);
      }
      assert.doesNotMatch(await page.getByRole("main").innerText(), /statutory|disbursed/i);
      await page.screenshot({ path: `/tmp/fairshift-audit-${sector}-${role}.png` });
      await page.getByRole("button", { name: role === "WORKER" ? "Complaints" : /^Disputes/, exact: role === "WORKER" }).first().click();
      await page.getByRole("heading", { name: role === "WORKER" ? "My Wage Disputes" : "Organization Dispute Ledger", exact: true }).waitFor();
      const ledgerWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(ledgerWidth <= 375, `${sector} ${role} dispute ledger overflows at 375px: ${ledgerWidth}`);
    } finally { await browser.close(); }
  }
});

test("recorded-pay form accepts the full contract maximum including 47 paise", options, async () => {
  const { browser, page } = await fixturePage("construction", "EMPLOYER");
  try {
    await page.getByRole("button", { name: "Adjust Pay", exact: true }).first().click();
    const input = page.getByRole("dialog").getByLabel("Employer Recorded Amount (INR ₹)");
    await input.fill("21474836.47");
    assert.equal(await input.evaluate((element: HTMLInputElement) => element.checkValidity()), true);
    await input.fill("21474836.48");
    assert.equal(await input.evaluate((element: HTMLInputElement) => element.checkValidity()), false);
  } finally { await browser.close(); }
});


test("employer can open resolution for a dispute outside the twenty recent shifts", options, async () => {
  const { browser, page } = await fixturePage("construction", "EMPLOYER", 320, true);
  try {
    const queue = page.getByRole("button", { name: /Dispute Review Queue/ });
    await queue.focus(); await page.keyboard.press("Enter");
    const action = page.getByRole("button", { name: "Review Dispute", exact: true }).first();
    await action.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 2000 });
    const dialogBounds = await dialog.evaluate((element: HTMLElement) => ({ width: element.scrollWidth, viewport: innerWidth }));
    assert.ok(dialogBounds.width <= dialogBounds.viewport, `Resolution dialog overflows mobile viewport: ${dialogBounds.width}`);
    const amount = dialog.getByLabel("Corrected Recorded Pay (INR ₹)");
    await amount.fill("1100.00");
    await dialog.getByLabel("Formal Resolution Note / Explanation").fill("Reviewed the missing allowance against attendance.");
    assert.equal(await dialog.getByRole("button", { name: "Confirm & Save Adjustment", exact: true }).isEnabled(), true);
    await page.keyboard.press("Escape");
    assert.equal(await action.evaluate((element: HTMLElement) => element === document.activeElement), true);
  } finally { await browser.close(); }
});


test("a mutation rejected for an expired session clears cached records and shows labeled sign-in", options, async () => {
  const { browser, page } = await fixturePage("construction", "WORKER", 1280, false, true);
  try {
    await page.getByRole("button", { name: /Check In/ }).first().click();
    await page.getByRole("heading", { name: "Sign in to FairShift", exact: true }).waitFor({ timeout: 2000 });
    assert.equal(await page.getByRole("heading", { name: /Masonry/ }).count(), 0);
    await page.getByLabel("Email", { exact: true }).focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.getByLabel("Password", { exact: true }).evaluate((element: HTMLElement) => element === document.activeElement), true);
  } finally { await browser.close(); }
});


test("an empty reporting month shows no historical earnings in the tracker or My Money", options, async () => {
  const { browser, page } = await fixturePage();
  try {
    await page.route("**/api/worker/earnings?**", async (route: { fulfill(response: { status: number; contentType: string; body: string }): Promise<void> }) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {
        ...getFixtureWorkerEarnings("construction"), month: "2026-09", shifts: [],
        totalExpectedMinor: 0, totalRecordedMinor: 0, completedCount: 0, recordedCount: 0, underpaidCount: 0,
      } }) });
    });
    await page.getByLabel("Reporting month (Asia/Kolkata)").fill("2026-09");
    await page.getByRole("button", { name: "Home — 🏠", exact: true }).first().click();
    await page.getByText(TRANSLATIONS.en.noEarningsData, { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: /: Expected/ }).count(), 0);
    await page.getByRole("button", { name: /^My Money/ }).click();
    await page.getByText(TRANSLATIONS.en.noShiftsFound, { exact: true }).first().waitFor();
    assert.equal(await page.getByRole("button", { name: "View Pay Details", exact: true }).count(), 0);
  } finally { await browser.close(); }
});
