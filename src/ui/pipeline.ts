import { glyph, theme } from "./theme";
import { renderValue } from "./format";
import { titleCase } from "./layout";

export type StageStatus = "done" | "active" | "pending" | "spin";

export interface Stage {
  status: StageStatus;
  label: string;
  value?: unknown;
}

function statusMark(status: StageStatus): string {
  switch (status) {
    case "done":
      return theme.ok(glyph.tick);
    case "active":
      return theme.accent(glyph.bullet);
    case "spin":
      return theme.iris(glyph.spin);
    case "pending":
    default:
      return theme.faint(glyph.ring);
  }
}

/**
 * Connected pipeline of stages — the signature 3b composition. A ┌ ├ └ gutter
 * ties the stages together; each carries a status mark.
 *   ┌ ✓ session   authorized
 *   ├ ✓ token     valid · expires 27d
 *   └ ● context   acme-mobile · production
 */
export function pipeline(
  stages: Stage[],
  options: { indent?: number; spaced?: boolean } = {}
): void {
  if (!stages.length) return;
  const pre = " ".repeat(options.indent ?? 0);
  const labels = stages.map((s) => titleCase(s.label));
  const labelWidth = Math.max(...labels.map((l) => l.length));
  stages.forEach((s, i) => {
    if (i > 0 && options.spaced) {
      console.log(pre + theme.border(glyph.v));
    }
    const connector =
      i === 0
        ? glyph.branchTop
        : i === stages.length - 1
          ? glyph.branchEnd
          : glyph.branchMid;
    const label = theme.dim(labels[i] + " ".repeat(labelWidth - labels[i].length));
    const value = s.value !== undefined ? "   " + renderValue(s.value) : "";
    console.log(
      `${pre}${theme.border(connector)} ${statusMark(s.status)} ${label}${value}`
    );
  });
}

export interface NumberedItem {
  label: string;
  meta?: unknown;
  current?: boolean;
}

/**
 * Numbered list with an accented current row — the 3b list-projects style.
 *   1 · acme-mobile   ios·android · 142
 *   2 · acme-driver   android · 38
 */
export function numbered(
  items: NumberedItem[],
  options: { indent?: number } = {}
): void {
  if (!items.length) return;
  const pre = " ".repeat(options.indent ?? 0);
  const labelWidth = Math.max(...items.map((i) => i.label.length));
  items.forEach((it, i) => {
    const tag = `${i + 1} ${glyph.dot}`;
    const num = it.current ? theme.accent(tag) : theme.dim(tag);
    const name = it.current ? theme.accent(it.label) : theme.text(it.label);
    const padding = " ".repeat(Math.max(0, labelWidth - it.label.length));
    const meta = it.meta != null ? "   " + theme.dim(String(it.meta)) : "";
    console.log(`${pre}${num} ${name}${padding}${meta}`);
  });
}
