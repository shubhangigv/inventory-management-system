// Display formatting shared by server and client components.
// A fixed locale keeps server-rendered and browser-rendered text identical.
const LOCALE = "en-IN";

type MoneyLike = { toString(): string } | string | number;

export function formatMoney(value: MoneyLike, currencyCode: string) {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: currencyCode }).format(
    Number(value.toString()),
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" }).format(date);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** A forecast duration: "0.7 days", "1 day", "60+ days"; "—" when unknown. */
export function formatDays(days: number | null) {
  if (days === null) return "—";
  if (days >= 60) return "60+ days";
  const rounded = Math.round(days * 10) / 10;
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(rounded)} ${rounded === 1 ? "day" : "days"}`;
}

/** "BANK_TRANSFER" -> "Bank transfer" */
export function formatEnum(value: string) {
  const text = value.toLowerCase().replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
