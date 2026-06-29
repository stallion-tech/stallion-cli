import chalk from "chalk";

export interface Column {
  header: string;
  value: (row: any) => any;
}

export interface DetailField {
  label: string;
  value: (obj: any) => any;
}

/** Solid outer frame + header separator. */
const solid = (s: string) => chalk.gray(s);
/** Very light, dotted separator between rows. */
const light = (s: string) => chalk.dim(chalk.gray(s));
const headerStyle = chalk.bold.cyan;
/** Subdued style for box descriptions — dim + italic to read as fine print. */
const descStyle = (s: string) => chalk.dim.italic(s);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Render a Date as a compact, human-readable "YYYY-MM-DD HH:mm UTC" string. */
function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`
  );
}

/** Format a single cell value into a plain (uncolored) string. */
export function formatValue(value: any): string {
  return cell(value);
}

/** Format a value and apply its status color (for inline key/value rendering). */
export function renderValue(value: any): string {
  const plain = cell(value);
  return colorize(plain, plain);
}

/** Shared accent style for headers and labels. */
export const accentStyle = headerStyle;

/** Format a single cell value into a plain (uncolored) string. */
function cell(value: any): string {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return formatDate(d);
  }
  return String(value);
}

function pad(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - text.length));
}

/**
 * Apply color to a value based on its plain content. Color codes are
 * zero-width, so this never affects column alignment as long as padding has
 * already been applied to the plain text.
 */
function colorize(plain: string, padded: string): string {
  const trimmed = plain.trim();
  if (trimmed === "-") return chalk.dim(padded);
  if (trimmed === "Yes") return chalk.green(padded);
  if (trimmed === "No") return chalk.dim(padded);
  return padded;
}

/** A solid horizontal rule (outer frame / header separator). */
function rule(
  left: string,
  mid: string,
  right: string,
  widths: number[]
): string {
  return solid(left + widths.map((w) => "─".repeat(w + 2)).join(mid) + right);
}

/** A light dotted separator placed between data rows. Outer edges stay solid. */
function rowSeparator(widths: number[]): string {
  return (
    solid("├") +
    widths.map((w) => light("╌".repeat(w + 2))).join(light("┼")) +
    solid("┤")
  );
}

/**
 * Print rows as a bordered table, or as raw JSON when `json` is set.
 * In JSON mode the original `rows` objects are emitted (not the formatted
 * columns) so the output stays script-friendly.
 */
export function printTable(
  rows: any[],
  columns: Column[],
  options: { json?: boolean; indent?: number } = {}
): void {
  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  const pre = " ".repeat(options.indent ?? 0);
  const out = (line: string) => console.log(pre + line);
  if (!rows.length) {
    out(chalk.dim("No results."));
    return;
  }

  const headers = columns.map((c) => c.header);
  const data = rows.map((row) => columns.map((c) => cell(c.value(row))));
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...data.map((row) => row[i].length))
  );

  const v = solid("│");

  out(rule("┌", "┬", "┐", widths));
  out(
    v +
      headers
        .map((h, i) => headerStyle(" " + pad(h, widths[i]) + " "))
        .join(v) +
      v
  );
  out(rule("├", "┼", "┤", widths));
  data.forEach((row, idx) => {
    if (idx > 0) out(rowSeparator(widths));
    out(
      v +
        row
          .map((c, i) => colorize(c, " " + pad(c, widths[i]) + " "))
          .join(v) +
        v
    );
  });
  out(rule("└", "┴", "┘", widths));
}

/**
 * Print a single object as an aligned key/value detail view, or raw JSON when
 * `json` is set.
 */
export function printDetail(
  obj: any,
  fields: DetailField[],
  options: { json?: boolean; indent?: number } = {}
): void {
  if (options.json) {
    console.log(JSON.stringify(obj, null, 2));
    return;
  }
  const pre = " ".repeat(options.indent ?? 0);
  const labelWidth = Math.max(...fields.map((f) => f.label.length));
  for (const field of fields) {
    const plain = cell(field.value(obj));
    console.log(
      `${pre}${headerStyle(pad(field.label, labelWidth))}  ${colorize(plain, plain)}`
    );
  }
}

/** Greedily wrap text into lines no wider than `width`. */
function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    if (!current) current = word;
    else if ((current + " " + word).length <= width) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface BoxSpec {
  obj: any;
  fields: DetailField[];
  title?: string;
  description?: string;
}

/**
 * Build a framed box as an array of equal-width lines: a title heading and an
 * optional dim/italic description live inside the frame, above the aligned
 * key/value rows. Returned (not printed) so boxes can be laid out side by side.
 */
function buildBox(spec: BoxSpec): { lines: string[]; width: number } {
  const { obj, fields, title = "", description } = spec;
  const labelWidth = Math.max(...fields.map((f) => f.label.length));
  const gap = "  ";
  const rows = fields.map((f) => {
    const plain = cell(f.value(obj));
    return { label: f.label, plain, len: labelWidth + gap.length + plain.length };
  });

  const target = Math.max(title.length, ...rows.map((r) => r.len), 24);
  const descLines = description ? wrapText(description, target) : [];
  const innerWidth = Math.max(target, ...descLines.map((l) => l.length));

  const v = solid("│");
  const mk = (content: string, plainLen: number) =>
    `${v} ${content}${" ".repeat(Math.max(0, innerWidth - plainLen))} ${v}`;

  const lines: string[] = [];
  lines.push(solid("┌" + "─".repeat(innerWidth + 2) + "┐"));
  if (title) lines.push(mk(headerStyle(title), title.length));
  for (const dl of descLines) lines.push(mk(descStyle(dl), dl.length));
  if (title || descLines.length) lines.push(mk("", 0));
  for (const r of rows) {
    const content =
      headerStyle(pad(r.label, labelWidth)) + gap + colorize(r.plain, r.plain);
    lines.push(mk(content, r.len));
  }
  lines.push(solid("└" + "─".repeat(innerWidth + 2) + "┘"));

  return { lines, width: innerWidth + 4 };
}

/** Print a single framed box (title + optional description + key/value rows). */
export function printBox(
  obj: any,
  fields: DetailField[],
  options: { title?: string; description?: string; indent?: number } = {}
): void {
  const pre = " ".repeat(options.indent ?? 0);
  const { lines } = buildBox({ obj, fields, ...options });
  for (const line of lines) console.log(pre + line);
}

/**
 * Print several boxes side by side, top-aligned. Shorter boxes are padded with
 * blank lines so the row stays aligned.
 */
export function printBoxes(
  specs: BoxSpec[],
  options: { gap?: number; indent?: number } = {}
): void {
  const gap = options.gap ?? 3;
  const pre = " ".repeat(options.indent ?? 0);
  const boxes = specs.map(buildBox);
  const height = Math.max(...boxes.map((b) => b.lines.length));
  const sep = " ".repeat(gap);
  for (let i = 0; i < height; i++) {
    console.log(
      pre +
        boxes
          .map((b) => (i < b.lines.length ? b.lines[i] : " ".repeat(b.width)))
          .join(sep)
    );
  }
}
