// Helpers for reading a page's ?query=string values.
export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a search param, trimmed; undefined when missing or empty. */
export function param(searchParams: SearchParams, key: string): string | undefined {
  const raw = searchParams[key];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value ? value : undefined;
}

/** Returns the value only if it is one of the allowed options. */
export function enumParam<T extends string>(searchParams: SearchParams, key: string, options: readonly T[]) {
  const value = param(searchParams, key);
  return options.includes(value as T) ? (value as T) : undefined;
}

export function pageParam(searchParams: SearchParams) {
  const page = Number(param(searchParams, "page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** A YYYY-MM-DD param as local midnight, or undefined if it isn't a valid date. */
export function dateParam(searchParams: SearchParams, key: string) {
  const value = param(searchParams, key);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Builds "?a=1&b=2" from the given values, skipping empty ones. */
export function toQueryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}
