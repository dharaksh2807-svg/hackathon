import type { FairShiftApiClient } from "./client.ts";
import type { DashboardResponse, Dispute, EarningsResponse, MeResponse, PortalIdentity, OrgWorker, Shift } from "./types.ts";

/** Only memberships returned by the verified /api/me session become portal identities. */
export function portalIdentities(me: MeResponse["data"]): PortalIdentity[] {
  return me.memberships.map(membership => ({
    id: membership.id, membershipId: membership.id, email: me.user.email ?? "",
    name: me.user.email ?? "Signed-in account", role: membership.role, sector: membership.sector,
    organizationId: membership.organizationId, organizationName: membership.organizationName,
    avatarInitials: (me.user.email ?? "FS").slice(0, 2).toUpperCase(), description: "Verified organization membership",
  }));
}

export function currentKolkataMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

async function allPages<T>(fetchPage: (offset: number) => Promise<{ data: T[]; paging: { nextOffset: number | null } }>): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset);
    items.push(...page.data);
    if (page.paging.nextOffset === null) return items;
    if (page.paging.nextOffset <= offset || page.paging.nextOffset > 100_000) throw new Error("Unable to load the complete record list.");
    offset = page.paging.nextOffset;
  }
}

export interface PortalData {
  shifts: Shift[];
  disputes: Dispute[];
  earnings: EarningsResponse["data"] | null;
  dashboard: DashboardResponse["data"] | null;
  workers: OrgWorker[];
}

export async function loadPortalData(client: FairShiftApiClient, identity: PortalIdentity, month: string): Promise<PortalData> {
  const orgId = identity.organizationId;
  const disputesPromise = allPages(offset => client.getDisputes({ orgId, limit: 100, offset }));
  if (identity.role === "WORKER") {
    const [shifts, earnings, disputes] = await Promise.all([
      allPages(offset => client.getWorkerShifts({ orgId, limit: 100, offset })),
      client.getWorkerEarnings({ orgId, month }), disputesPromise,
    ]);
    return { shifts, earnings: earnings.data, disputes, dashboard: null, workers: [] };
  }
  // The frozen contract exposes the month's twenty recent employer shifts.
  // Employers must never call the worker-only shifts endpoint.
  const [dashboard, disputes, workers] = await Promise.all([
    client.getEmployerDashboard({ orgId, month, sector: identity.sector }), disputesPromise, client.listOrgWorkers({ orgId }),
  ]);
  return { shifts: dashboard.data.recentShifts, dashboard: dashboard.data, disputes, earnings: null, workers: workers.data };
}
