import { brand, glyph, space, theme } from "./theme";
import { formatValue, renderValue } from "./format";

export const INDENT = space.indent;
const pre = " ".repeat(INDENT);

function termWidth(): number {
  const c = process.stdout.columns;
  return c && c > 40 ? c : 80;
}

/**
 * Top-of-command header (Pipeline): `♞ whoami`.
 * Pass extra crumbs for a breadcrumb trail: `releases ⟩ rel_9f3c`
 * (rendered without the mark).
 */
export function header(command: string, ...crumbs: string[]): void {
  // Breadcrumb is chrome — stderr, so it never mixes with stdout data.
  if (crumbs.length) {
    const sep = theme.dim(` ${glyph.arrow} `);
    const trail = [command, ...crumbs];
    const last = trail.pop() as string;
    console.error(
      "\n" + trail.map((c) => theme.dim(c)).join(sep) + sep + theme.head(last)
    );
    return;
  }
  console.error("\n" + theme.accent(glyph.mark) + " " + theme.head(command));
}

/** Capitalize each plain-alphabetic word; leave tokens like `v1.8.0` alone. */
export function titleCase(title: string): string {
  return title
    .split(" ")
    .map((w) => (/^[a-zA-Z]+$/.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Quiet section heading — Title Case, dim-bold, no underline. */
export function section(title: string): void {
  console.log("\n" + theme.dim.bold(titleCase(title)));
}

/**
 * Aligned key/value block — the signature Stallion layout.
 * Labels pad to a shared column; values start together. No leaders.
 *   email    jane@acme.io
 *   bucket   production
 */
export function keyValue(
  rows: Array<[string, unknown]>,
  options: { indent?: number } = {}
): void {
  if (!rows.length) return;
  const indent = " ".repeat(options.indent ?? INDENT);
  // Labels render Title Cased for a consistent look across every command.
  const labels = rows.map(([label]) => titleCase(label));
  const labelWidth = Math.max(...labels.map((l) => l.length));
  rows.forEach(([, value], i) => {
    const key = theme.dim(labels[i] + " ".repeat(labelWidth - labels[i].length));
    console.log(`${indent}${key}   ${renderValue(value)}`);
  });
}

/** Dim helper line (tips, paths, pagination) — diagnostics, so stderr. */
export function hint(text: string): void {
  console.error(theme.dim(text));
}

/** Indented free-text under a section. */
export function text(value: string): void {
  console.log(pre + value);
}

/** A faint full-width divider. */
export function divider(width?: number): void {
  const w = width ?? Math.min(termWidth() - 2, 60);
  console.log(theme.dim(glyph.rule.repeat(w)));
}

/** Vertical spacing. */
export function blank(lines = 1): void {
  for (let i = 0; i < lines; i++) console.log("");
}

type BadgeKind = "ok" | "warn" | "danger" | "muted" | "accent";

/** Minimal status dot + label (no heavy pill backgrounds). */
export function badge(label: string, kind: BadgeKind = "muted"): string {
  const color: Record<BadgeKind, (s: string) => string> = {
    ok: theme.ok,
    warn: theme.warn,
    danger: theme.danger,
    muted: theme.dim,
    accent: theme.accent,
  };
  const dot = kind === "muted" ? theme.dim(glyph.ring) : color[kind](glyph.bullet);
  return `${dot} ${color[kind](label)}`;
}
