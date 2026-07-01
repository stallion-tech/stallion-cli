import { glyph, theme } from "./theme";
import { padVisible } from "./ansi";
import { box } from "./box";
import { getVersion } from "@/utils/version";
import { getContext } from "@/utils/context-store";
import { hasStoredToken } from "@/utils/token-store";
import {
  LOGO_LARGE,
  LOGO_LARGE_WIDTH,
  LOGO_SMALL,
  LOGO_SMALL_WIDTH,
} from "./logo.generated";

/** Full product name and one-line description. */
const PRODUCT = "React Native Stallion";
const TAGLINE = "Over-the-air updates for React Native";

/** Place the logo and text side by side, vertically centering the text. */
function sideBySide(
  logo: string[],
  logoWidth: number,
  right: string[],
  gap = 4
): string[] {
  const height = Math.max(logo.length, right.length);
  const rTop = Math.max(0, Math.floor((logo.length - right.length) / 2));
  const sep = " ".repeat(gap);
  const blank = " ".repeat(logoWidth);

  const out: string[] = [];
  for (let i = 0; i < height; i++) {
    const l = i < logo.length ? logo[i] : blank;
    const r = i - rTop >= 0 && i - rTop < right.length ? right[i - rTop] : "";
    out.push(padVisible(l, logoWidth) + sep + r);
  }
  return out;
}

/** The greeting line — personalized when the user is logged in. */
function greetingLine(): string {
  if (!hasStoredToken()) {
    return (
      theme.dim("Not logged in · run ") +
      theme.accent("stallion login") +
      theme.dim(" to get started")
    );
  }
  const name = getContext().userName?.trim();
  const who = name ? theme.text.bold(name) : theme.text.bold("there");
  return `${theme.accent(glyph.bullet)} ${theme.text("Welcome back, ")}${who}`;
}

/** Product name, tagline, and greeting — printed below the logo. */
function metaLines(): string[] {
  const version = theme.dim(`v${getVersion()}`);
  return [
    theme.accentBold(PRODUCT) + theme.dim(`  ${glyph.dot}  `) + version,
    theme.muted(TAGLINE),
    greetingLine(),
  ];
}

/**
 * Hero welcome — horse logo, the product name / tagline / greeting below it,
 * then a rounded box of quick-start commands. Shown for bare `stallion`.
 */
export function showWelcome(): void {
  console.log("");
  for (const line of sideBySide(LOGO_LARGE, LOGO_LARGE_WIDTH, metaLines(), 4)) {
    console.log("  " + line);
  }
  console.log("");

  const entries: Array<[string, string]> = [
    ["stallion login", "Authenticate this machine"],
    ["stallion whoami", "Show the logged-in account"],
    ["stallion list-projects", "Browse your projects"],
    ["stallion publish-bundle", "Ship an OTA update"],
    ["stallion help", "See every command"],
  ];
  const nameWidth = Math.max(...entries.map(([n]) => n.length)) + 2;
  const cmd = ([name, desc]: [string, string]) =>
    `${theme.accent(glyph.arrow)} ${theme.text.bold(padVisible(name, nameWidth))}${theme.dim(desc)}`;

  const lines = [
    ...entries.map(cmd),
    "",
    `${theme.dim("cwd")}  ${theme.muted(shortCwd())}`,
  ];

  for (const line of box(lines, { title: "Getting Started", indent: 2, padX: 2 })) {
    console.log(line);
  }
  console.log("");
}

/**
 * Compact header — horse logo with the product name, tagline, and greeting
 * below it. Shown before each command so the brand and user are acknowledged.
 */
export function showBanner(): void {
  // Per-command chrome — stderr, so piping stdout (incl. --json) stays clean.
  console.error("");
  for (const line of sideBySide(LOGO_SMALL, LOGO_SMALL_WIDTH, metaLines(), 3)) {
    console.error("  " + line);
  }
}

function shortCwd(): string {
  const cwd = process.cwd();
  const home = process.env.HOME || process.env.USERPROFILE;
  return home && cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;
}
