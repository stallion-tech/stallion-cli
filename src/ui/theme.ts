import chalk from "chalk";

/**
 * Stallion brand palette — derived from the logo's geometric indigo→violet
 * horse. One confident accent, the rest grayscale, so output stays clean.
 */
export const palette = {
  indigo: "#4F46E5",
  violet: "#6D28D9",
  iris: "#818CF8",
  ink: "#1E1B4B",
} as const;

export const theme = {
  accent: chalk.hex(palette.indigo),
  accentBold: chalk.hex(palette.indigo).bold,
  violet: chalk.hex(palette.violet),
  iris: chalk.hex(palette.iris),
  /** One bright heading per screen. */
  head: chalk.whiteBright.bold,
  text: chalk.reset,
  dim: chalk.dim,
  muted: chalk.gray,
  /** Recessive chrome — quieter than dim. */
  faint: chalk.hex("#474753"),
  /** Pipeline connectors / structural lines. */
  border: chalk.hex("#3A3A6A"),
  ok: chalk.hex("#3FB950"),
  warn: chalk.hex("#E3B341"),
  danger: chalk.hex("#F85149"),
  info: chalk.hex(palette.iris),
} as const;

/** Signature glyph set — kept tiny so the CLI stays recognizable. */
export const glyph = {
  rail: "▌",
  dot: "·",
  rule: "─",
  tick: "✓",
  cross: "✗",
  info: "ℹ",
  warn: "!",
  bullet: "●",
  ring: "○",
  arrow: "⟩",
  cursor: "❯",
  // Stallion knight mark + pipeline connectors.
  mark: "♞",
  branchTop: "┌",
  branchMid: "├",
  branchEnd: "└",
  spin: "⠋",
  // Rounded box-drawing set.
  tl: "╭",
  tr: "╮",
  bl: "╰",
  br: "╯",
  h: "─",
  v: "│",
} as const;

export const space = {
  indent: 2,
  colGap: 2,
  kvMinWidth: 40,
} as const;

export const brand = "STALLION";

/** Apply a left→right indigo→violet gradient across a single line of text. */
export function brandGradient(textLine: string): string {
  const stops = [
    [129, 140, 248], // iris
    [79, 70, 229], // indigo
    [109, 40, 217], // violet
  ];
  const chars = [...textLine];
  const n = Math.max(1, chars.length - 1);
  return chars
    .map((ch, i) => {
      if (ch === " ") return ch;
      const t = i / n;
      const seg = t * (stops.length - 1);
      const idx = Math.min(stops.length - 2, Math.floor(seg));
      const f = seg - idx;
      const [r1, g1, b1] = stops[idx];
      const [r2, g2, b2] = stops[idx + 1];
      const r = Math.round(r1 + (r2 - r1) * f);
      const g = Math.round(g1 + (g2 - g1) * f);
      const b = Math.round(b1 + (b2 - b1) * f);
      return chalk.rgb(r, g, b)(ch);
    })
    .join("");
}
