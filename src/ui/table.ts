import { glyph, space, theme } from "./theme";
import { colorizeCell, formatValue, pad } from "./format";
import { padVisible, truncateVisible, visibleLength, wrapVisible } from "./ansi";

export interface Column {
  header: string;
  value: (row: any) => any;
}

export interface BoardColumn {
  header: string;
  /** Pre-colored display string for the cell (measured by visible width). */
  render: (row: any) => string;
  align?: "left" | "right";
}

/**
 * Fully bordered status board — the 3f Console anchor. Cells are rendered
 * (and may carry color / meter bars); widths are measured on visible width so
 * ANSI never breaks the frame.
 */
export function printBoard(
  rows: any[],
  columns: BoardColumn[],
  options: { indent?: number; spaced?: boolean } = {}
): void {
  const pre = " ".repeat(options.indent ?? 0);
  const B = theme.border;
  const cells = rows.map((r) => columns.map((c) => c.render(r)));
  const widths = columns.map((c, i) =>
    Math.max(
      visibleLength(c.header),
      ...cells.map((row) => visibleLength(row[i])),
      1
    )
  );

  // Responsive: if the natural table is wider than the terminal, shrink the
  // widest columns (down to a floor) so the frame still fits. Cells wider than
  // their (reduced) column are ellipsized. Non-TTY (piped) output uses a wide
  // fallback so redirected/`| less` output isn't needlessly clipped.
  const n = columns.length;
  const termWidth = process.stdout.columns || 120;
  const overhead = (options.indent ?? 0) + (n + 1) + n * 2; // borders + padding
  const budget = termWidth - overhead;
  const MIN = 4;
  const sum = () => widths.reduce((a, b) => a + b, 0);
  while (sum() > budget) {
    let idx = -1;
    let max = MIN;
    widths.forEach((w, i) => {
      if (w > max) {
        max = w;
        idx = i;
      }
    });
    if (idx === -1) break; // every column at the floor — accept overflow
    widths[idx] -= 1;
  }

  const rule = (l: string, m: string, r: string) =>
    B(l + widths.map((w) => "─".repeat(w + 2)).join(m) + r);

  const rowLine = (vals: string[]): string =>
    B(glyph.v) +
    vals
      .map((v, i) => {
        const w = widths[i];
        const t = truncateVisible(v, w);
        const cell =
          columns[i].align === "right"
            ? " ".repeat(Math.max(0, w - visibleLength(t))) + t
            : padVisible(t, w);
        return " " + cell + " ";
      })
      .join(B(glyph.v)) +
    B(glyph.v);

  // Blank padded row used to space data rows apart.
  const spacer = rowLine(columns.map(() => ""));

  // A row whose cells exceed their column width wraps onto extra lines instead
  // of being clipped — each cell is wrapped to its width and the tallest cell
  // sets the row height; shorter cells pad with blanks.
  const drawRow = (vals: string[]) => {
    const perCell = vals.map((v, i) => wrapVisible(v, widths[i]));
    const height = Math.max(1, ...perCell.map((l) => l.length));
    for (let k = 0; k < height; k++) {
      console.log(pre + rowLine(perCell.map((lines) => lines[k] ?? "")));
    }
  };

  console.log(pre + rule("┌", "┬", "┐"));
  drawRow(columns.map((c) => theme.dim(c.header)));
  console.log(pre + rule("├", "┼", "┤"));
  cells.forEach((row, idx) => {
    if (idx > 0 && options.spaced) console.log(pre + spacer);
    drawRow(row);
  });
  console.log(pre + rule("└", "┴", "┘"));
}

export interface DetailField {
  label: string;
  value: (obj: any) => any;
}

export interface BoxSpec {
  obj: any;
  fields: DetailField[];
  title?: string;
  description?: string;
}

/** Open table — accent header + thin rule, no heavy outer frame. */
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
    out(theme.dim("No results."));
    return;
  }

  const gap = " ".repeat(space.colGap);
  const headers = columns.map((c) => c.header);
  const data = rows.map((row) => columns.map((c) => formatValue(c.value(row))));
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...data.map((row) => row[i].length))
  );

  // Hairline table: dim header, no rule, plain rows.
  out(theme.dim(headers.map((h, i) => pad(h, widths[i])).join(gap)));
  data.forEach((row) => {
    out(row.map((c, i) => colorizeCell(c, pad(c, widths[i]))).join(gap));
  });
}

/** Aligned key/value detail view (no framing). */
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
    const plain = formatValue(field.value(obj));
    console.log(`${pre}${theme.dim(pad(field.label, labelWidth))}  ${colorizeCell(plain, plain)}`);
  }
}

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

/** Build a left-rail panel (title + optional description + fields). */
function buildPanel(spec: BoxSpec): { lines: string[]; width: number } {
  const { obj, fields, title = "", description } = spec;
  const labelWidth = Math.max(...fields.map((f) => f.label.length));
  const gap = "  ";
  const rows = fields.map((f) => {
    const plain = formatValue(f.value(obj));
    return { label: f.label, plain, len: labelWidth + gap.length + plain.length };
  });

  const target = Math.max(title.length, ...rows.map((r) => r.len), 18);
  const descLines = description ? wrapText(description, target) : [];
  const innerWidth = Math.max(target, ...descLines.map((l) => l.length));
  const rail = theme.accent(glyph.rail);

  const lines: string[] = [];
  if (title) lines.push(`${rail} ${theme.accentBold(title)}`);
  for (const dl of descLines) lines.push(`${rail} ${theme.dim.italic(dl)}`);
  if (title || descLines.length) lines.push("");
  for (const r of rows) {
    lines.push(`  ${theme.dim(pad(r.label, labelWidth))}${gap}${colorizeCell(r.plain, r.plain)}`);
  }
  return { lines, width: innerWidth + 4 };
}

export function printBox(
  obj: any,
  fields: DetailField[],
  options: { title?: string; description?: string; indent?: number } = {}
): void {
  const pre = " ".repeat(options.indent ?? 0);
  const { lines } = buildPanel({ obj, fields, ...options });
  for (const line of lines) console.log(pre + line);
}

export function printBoxes(
  specs: BoxSpec[],
  options: { gap?: number; indent?: number } = {}
): void {
  const gap = options.gap ?? 4;
  const pre = " ".repeat(options.indent ?? 0);
  const panels = specs.map(buildPanel);
  const height = Math.max(...panels.map((p) => p.lines.length));
  const sep = " ".repeat(gap);
  for (let i = 0; i < height; i++) {
    console.log(
      pre +
        panels
          .map((p) => (i < p.lines.length ? p.lines[i] : " ".repeat(p.width)))
          .join(sep)
    );
  }
}
