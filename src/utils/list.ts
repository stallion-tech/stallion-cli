import { ui } from "@/ui";

/** Default number of rows shown by listing commands. */
export const LIST_LIMIT = 15;

/** Server-enforced ceiling for --limit. */
export const MAX_LIST_LIMIT = 30;

export const CONSOLE_URL = "https://console.stalliontech.io";

/** Resolve a --limit flag value: default LIST_LIMIT, clamped to MAX_LIST_LIMIT. */
export function resolveLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return LIST_LIMIT;
  return Math.min(Math.floor(n), MAX_LIST_LIMIT);
}

/** Shared listing footer: count line, plus a console link when capped. */
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

/** Sort newest-first and return the most-recent LIST_LIMIT plus the total. */
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
