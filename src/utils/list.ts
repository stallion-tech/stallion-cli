import { ui } from "@/ui";

/**
 * Listing commands cap output to the most-recent N rows so a project with
 * hundreds of buckets/bundles/releases doesn't dump a wall of text. The full
 * set lives in the web console (a link is shown when the list is capped).
 */
export const LIST_LIMIT = 15;

/** Server-enforced ceiling for --limit. */
export const MAX_LIST_LIMIT = 30;

/** Web console — where the full, unbounded lists live. */
export const CONSOLE_URL = "https://console.stalliontech.io";

/**
 * Resolve a --limit flag value: default LIST_LIMIT, clamped to MAX_LIST_LIMIT
 * (the server enforces the same ceiling; clamping here avoids a 400 round-trip).
 */
export function resolveLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return LIST_LIMIT;
  return Math.min(Math.floor(n), MAX_LIST_LIMIT);
}

/**
 * Shared footer for listing commands: a count line, plus (when the list was
 * capped) a pointer to the console for the full set. Diagnostics only, so it
 * rides on stderr like other hints and never touches stdout data.
 */
export function printListFooter(
  nounSingular: string,
  shown: number,
  total: number,
  capped: boolean
): void {
  const plural = total === 1 ? nounSingular : `${nounSingular}s`;
  ui.blank();
  if (capped) {
    ui.hint(`  Showing ${shown} of ${total} most recent ${plural}.`);
    ui.hint(`  See all ${plural} in the console → ${CONSOLE_URL}`);
  } else {
    ui.hint(`  ${total} ${plural}`);
  }
}

/**
 * Sort `items` newest-first (by the given date accessor, when provided) and
 * return the most-recent `LIST_LIMIT`, plus the untrimmed total so callers can
 * show "Showing 15 of N".
 */
export function capRecent<T>(
  items: T[],
  getDate?: (item: T) => string | number | Date | null | undefined
): { shown: T[]; total: number; capped: boolean } {
  const total = items.length;
  let ordered = items;
  if (getDate) {
    ordered = [...items].sort(
      (a, b) =>
        new Date(getDate(b) ?? 0).getTime() - new Date(getDate(a) ?? 0).getTime()
    );
  }
  const shown = ordered.slice(0, LIST_LIMIT);
  return { shown, total, capped: total > shown.length };
}
