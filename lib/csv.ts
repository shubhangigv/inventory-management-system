// Builds CSV files for download (opens in Excel / Google Sheets).

type Cell = string | number | boolean | null | undefined | { toString(): string };

function escapeCell(value: Cell) {
  let text = value === null || value === undefined ? "" : String(value);
  // A cell starting with = + - @ is run as a formula by spreadsheets, so a
  // product named "=HYPERLINK(...)" could attack whoever opens the file.
  // A leading apostrophe makes it plain text. Numbers are left alone.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(header: string[], rows: Cell[][]) {
  return [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** A download response. The BOM makes Excel read the file as UTF-8 (₹, names with accents). */
export function csvResponse(filename: string, csv: string) {
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Today as YYYY-MM-DD, for file names. */
export function fileDate() {
  return new Date().toISOString().slice(0, 10);
}
