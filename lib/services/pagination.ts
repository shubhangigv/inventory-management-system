export const PAGE_SIZE = 25;

/** Turns a ?page= value into skip/take, defaulting to the first page. */
export function pageArgs(page: number | undefined) {
  const current = page && Number.isInteger(page) && page > 0 ? page : 1;
  return { page: current, skip: (current - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

export type Paginated<T> = { rows: T[]; total: number; page: number; pageCount: number };

export function paginated<T>(rows: T[], total: number, page: number): Paginated<T> {
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
