import { theme } from "./theme";

// Eighth-block characters for smooth sub-cell fills.
const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

/**
 * A horizontal meter bar — filled blocks (iris) over an empty track (faint).
 *   ████████ 100%      ███████▏ 89.8%      ░░░░░░░░ 0%
 * Width is in cells; the visible width is always exactly `width`.
 */
export function bar(percent: number, width = 8): string {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const eighths = Math.round((p / 100) * width * 8);
  const full = Math.floor(eighths / 8);
  const rem = eighths % 8;
  const filled = "█".repeat(full) + (rem ? EIGHTHS[rem] : "");
  const filledCells = full + (rem ? 1 : 0);
  const empty = "░".repeat(Math.max(0, width - filledCells));
  return theme.iris(filled) + theme.faint(empty);
}
