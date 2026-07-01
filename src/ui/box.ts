import { glyph, theme } from "./theme";
import { padVisible, visibleLength } from "./ansi";

export interface BoxOptions {
  title?: string;
  /** Inner horizontal padding (spaces). */
  padX?: number;
  /** Indent of the whole box from the left margin. */
  indent?: number;
  /** Fixed inner width; otherwise sized to the widest line. */
  width?: number;
  /** Border color function. */
  border?: (s: string) => string;
}

/**
 * Render a rounded box around the given (possibly colored) content lines.
 * Returns the framed lines; callers print them. Width is measured ignoring
 * ANSI codes so colored content stays aligned.
 */
export function box(lines: string[], options: BoxOptions = {}): string[] {
  const padX = options.padX ?? 1;
  const indent = " ".repeat(options.indent ?? 0);
  const border = options.border ?? theme.accent;

  const contentWidth = Math.max(
    options.width ?? 0,
    options.title ? visibleLength(options.title) + 2 : 0,
    ...lines.map((l) => visibleLength(l))
  );
  const inner = contentWidth + padX * 2;

  const top = options.title
    ? border(glyph.tl + glyph.h) +
      " " +
      theme.accentBold(options.title) +
      " " +
      border(glyph.h.repeat(Math.max(0, inner - visibleLength(options.title) - 3)) + glyph.tr)
    : border(glyph.tl + glyph.h.repeat(inner) + glyph.tr);

  const bottom = border(glyph.bl + glyph.h.repeat(inner) + glyph.br);

  const pad = " ".repeat(padX);
  const body = lines.map(
    (l) =>
      border(glyph.v) +
      pad +
      padVisible(l, contentWidth) +
      pad +
      border(glyph.v)
  );

  return [top, ...body, bottom].map((l) => indent + l);
}

/** Print a rounded box directly. */
export function printBox(lines: string[], options: BoxOptions = {}): void {
  for (const line of box(lines, options)) console.log(line);
}
