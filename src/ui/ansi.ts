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
