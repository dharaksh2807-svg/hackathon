/**
 * Date, time and duration formatting helpers for FairShift.
 * Standardizes display in Asia/Kolkata (IST) timezone.
 */

export function formatDateTimeKolkata(utcIso: string | null | undefined): string {
  if (!utcIso) return "—";
  try {
    const date = new Date(utcIso);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return utcIso;
  }
}

export function formatDateOnlyKolkata(utcIso: string | null | undefined): string {
  if (!utcIso) return "—";
  try {
    const date = new Date(utcIso);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return utcIso;
  }
}

export function formatTimeOnlyKolkata(utcIso: string | null | undefined): string {
  if (!utcIso) return "—";
  try {
    const date = new Date(utcIso);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return utcIso;
  }
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes < 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function isLocalWeekend(utcIso: string): boolean {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(utcIso));
    return weekday === "Sat" || weekday === "Sun";
  } catch {
    return false;
  }
}
