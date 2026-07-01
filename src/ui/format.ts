import { theme } from "./theme";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`
  );
}

/** Plain (uncolored) string for a cell value. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return formatDate(d);
  }
  return String(value);
}

/** Apply semantic coloring to a formatted (already padded) value. */
export function colorizeCell(plain: string, padded: string): string {
  const trimmed = plain.trim();
  if (trimmed === "-") return theme.dim(padded);
  if (trimmed === "Yes") return theme.ok(padded);
  if (trimmed === "No") return theme.dim(padded);
  return padded;
}

/** Format + color a value for inline rendering. */
export function renderValue(value: unknown): string {
  const plain = formatValue(value);
  return colorizeCell(plain, plain);
}

export const accentStyle = theme.accentBold;

export function pad(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - text.length));
}
