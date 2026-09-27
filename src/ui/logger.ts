import { glyph, theme } from "./theme";

/** Structured log lines for operational / verbose output. */
export const logger = {
  success: (message: string) => console.log(theme.ok(glyph.tick), message),
  error: (message: string) => console.log(theme.danger(glyph.cross), message),
  info: (message: string) => console.log(theme.info(glyph.info), message),
  warning: (message: string) => console.log(theme.warn(glyph.warn), message),
  title: (message: string) => console.log(theme.accentBold(message)),
  subtitle: (message: string) => console.log(theme.accent(message)),
  command: (name: string, description: string, alias?: string) => {
    const aliasText = alias ? theme.dim(`(${alias})`) : "";
    console.log(theme.accent(name), aliasText);
    console.log(theme.dim(`  ${description}\n`));
  },
};
