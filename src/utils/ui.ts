import chalk from "chalk";
import { accentStyle, renderValue } from "@/utils/table";

/**
 * Shared visual language for the CLI. Every command should compose its output
 * from these primitives so the look stays consistent:
 *
 *   ui.header("whoami")            STALLION · whoami breadcrumb
 *   ui.section("User")            ┃ USER accent-bar heading
 *   ui.keyValue([["Name", ...]])   indented, aligned key/values
 *   ui.hint("...")                dim helper line
 *   ui.badge(true, ...)           colored status pill
 *
 * Tables and boxes live in ./table and accept an `indent` so they line up
 * under section headings (use INDENT).
 */

/** Standard left indent for content under a section heading. */
export const INDENT = 2;

const pre = " ".repeat(INDENT);

/** Top-of-command breadcrumb, e.g. `STALLION · whoami`. */
export function header(command: string, subtitle?: string): void {
  const crumb = chalk.dim("STALLION") + chalk.dim(" · ") + chalk.bold.white(command);
  console.log("\n" + crumb + (subtitle ? chalk.dim(`  ${subtitle}`) : ""));
}

/** Accent-bar section heading, e.g. `┃ ORGANIZATIONS`. */
export function section(title: string): void {
  console.log("\n" + accentStyle("┃ " + title.toUpperCase()));
}

/** Indented, aligned key/value block. Values get status coloring + formatting. */
export function keyValue(rows: Array<[string, any]>): void {
  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  for (const [label, value] of rows) {
    const paddedLabel = label + " ".repeat(labelWidth - label.length);
    console.log(`${pre}${chalk.dim(paddedLabel)}   ${renderValue(value)}`);
  }
}

/** A dim, secondary helper line (tips, file paths, pagination). */
export function hint(text: string): void {
  console.log(chalk.dim(text));
}

/** Plain free-text line under a section, indented to match key/values. */
export function text(value: string): void {
  console.log(pre + value);
}

type BadgeKind = "ok" | "warn" | "danger" | "muted";

/** A small colored status pill, e.g. badge("active", "ok"). */
export function badge(label: string, kind: BadgeKind = "muted"): string {
  const styles: Record<BadgeKind, (s: string) => string> = {
    ok: chalk.bgGreen.black,
    warn: chalk.bgYellow.black,
    danger: chalk.bgRed.white,
    muted: chalk.bgGray.white,
  };
  return styles[kind](` ${label} `);
}

/** Success / failure / info status lines (consistent glyphs + spacing). */
export const status = {
  ok: (msg: string) => console.log(chalk.green("✓"), msg),
  fail: (msg: string) => console.log(chalk.red("✗"), msg),
  info: (msg: string) => console.log(chalk.cyan("ℹ"), msg),
  warn: (msg: string) => console.log(chalk.yellow("⚠"), msg),
};

export const ui = {
  INDENT,
  header,
  section,
  keyValue,
  hint,
  text,
  badge,
  status,
};
