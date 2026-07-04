import { theme } from "./theme";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// Fixed en-US locale so the format is stable across machines; timezone is left
// unset so it renders in the machine's LOCAL time. Human-facing only — --json
// emits the raw ISO/UTC string (it never goes through this formatter).
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

// e.g. "July 2, 2026 2:20 PM" (local time).
function formatDate(d: Date): string {
  try {
    return `${DATE_FMT.format(d)} ${TIME_FMT.format(d)}`;
  } catch {
    return d.toISOString();
  }
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
