const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function fcfa(n: number): string {
  return `${nf.format(Math.round(n))} FCFA`;
}

export function fcfaCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")} M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return nf.format(Math.round(n));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Douala",
  }).format(new Date(iso));
}

export function formatDateCourt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "Africa/Douala",
  }).format(new Date(iso));
}

export function formatHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Douala",
  }).format(new Date(iso));
}

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Africa/Douala",
});

export function dayKey(date: Date): string {
  return dayKeyFmt.format(date);
}

export function jourSemaine(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    timeZone: "Africa/Douala",
  })
    .format(date)
    .replace(".", "");
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
