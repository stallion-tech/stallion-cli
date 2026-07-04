// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

/** Strip SGR escape codes so we can measure printable width. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

/** Printable width of a string, ignoring color codes. */
export function visibleLength(text: string): number {
  return [...stripAnsi(text)].length;
}

/** Pad a (possibly colored) string to `width` printable columns. */
export function padVisible(text: string, width: number): string {
  const len = visibleLength(text);
  return text + " ".repeat(Math.max(0, width - len));
}

/** Center a (possibly colored) string within `width` printable columns. */
export function centerVisible(text: string, width: number): string {
  const len = visibleLength(text);
  const total = Math.max(0, width - len);
  const left = Math.floor(total / 2);
  return " ".repeat(left) + text + " ".repeat(total - left);
}

/**
 * Truncate a (possibly colored) string to at most `width` printable columns,
 * appending an ellipsis when clipped. SGR escape codes are copied through (and
 * reset at the end) so color/formatting never bleeds past the cut.
 */
export function truncateVisible(text: string, width: number): string {
  if (width <= 0) return "";
  if (visibleLength(text) <= width) return text;

  const budget = Math.max(0, width - 1); // leave one column for the ellipsis
  let out = "";
  let count = 0;
  let sawAnsi = false;
  let i = 0;
  while (i < text.length && count < budget) {
    const m = text.slice(i).match(/^\[[0-9;]*m/);
    if (m) {
      out += m[0];
      sawAnsi = true;
      i += m[0].length;
      continue;
    }
    const ch = [...text.slice(i)][0]; // one visible char (surrogate-safe)
    out += ch;
    count += 1;
    i += ch.length;
  }
  out += "…";
  if (sawAnsi) out += "[0m";
  return out;
}

/**
 * Wrap a string to `width` printable columns, breaking on spaces where possible
 * and hard-breaking over-long tokens (e.g. a 64-char hash). Returns one entry
 * per line. Color is preserved when the text fits on a single line; multi-line
 * (wrapped) output is emitted as plain text — in practice only long, uncolored
 * cells ever wrap.
 */
export function wrapVisible(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const chars = [...stripAnsi(text)];
  if (chars.length <= width) return [text];

  const lines: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = Math.min(start + width, chars.length);
    if (end < chars.length) {
      // prefer breaking at the last space inside the window
      let brk = -1;
      for (let k = end; k > start; k--) {
        if (chars[k] === " ") {
          brk = k;
          break;
        }
      }
      if (brk > start) end = brk;
    }
    lines.push(chars.slice(start, end).join("").trimEnd());
    start = end;
    while (start < chars.length && chars[start] === " ") start++; // skip break spaces
  }
  return lines;
}
