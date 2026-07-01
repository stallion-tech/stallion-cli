import { glyph, theme } from "./theme";

// Status lines are diagnostics — emitted on stderr so stdout stays clean for
// data (JSON in --json mode, tables otherwise). Single-space gutter matches
// the ♞ header and the spinner's ✓/✗.
const line = (mark: string, msg: string) => console.error(`${mark} ${msg}`);

export const status = {
  ok: (msg: string) => line(theme.ok(glyph.tick), msg),
  fail: (msg: string) => line(theme.danger(glyph.cross), msg),
  info: (msg: string) => line(theme.iris(glyph.arrow), msg),
  warn: (msg: string) => line(theme.warn(glyph.warn), msg),
};
