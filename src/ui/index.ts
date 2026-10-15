/**
 * Stallion UI — a minimal, branded terminal design system.
 *
 *   showWelcome()                    hero logo + quick-start box
 *   showBanner()                     compact logo header
 *   ui.header("whoami")              ▌ STALLION › whoami breadcrumb
 *   ui.section("User")               ▌ User + thin rule
 *   ui.keyValue([["Name", ...]])     dot-leader alignment
 *   ui.badge("active", "ok")         ● active
 *   ui.status.ok("Saved")            ✓ Saved
 *   printTable(rows, columns)        accent header + clean rows
 *
 * The logo is committed truecolor half-block ANSI art in logo.generated.ts
 * (a static, checked-in asset — no build-time image processing).
 */

export { theme, glyph, space, brand, palette, brandGradient } from "./theme";
export { stripAnsi, visibleLength, padVisible, centerVisible } from "./ansi";
export { formatValue, renderValue, accentStyle } from "./format";
export { box, printBox as printRoundedBox } from "./box";
export {
  INDENT,
  header,
  section,
  keyValue,
  hint,
  text,
  divider,
  blank,
  badge,
} from "./layout";
export { status } from "./status";
export {
  pipeline,
  numbered,
  type Stage,
  type StageStatus,
  type NumberedItem,
} from "./pipeline";
export { bar } from "./meter";
export { createSpinner, task, type Spinner } from "./spinner";
export {
  printTable,
  printDetail,
  printBox,
  printBoxes,
  printBoard,
  type Column,
  type DetailField,
  type BoxSpec,
  type BoardColumn,
} from "./table";
export { logger } from "./logger";
export { showBanner, showWelcome } from "./banner";

import {
  INDENT,
  badge,
  blank,
  divider,
  header,
  hint,
  keyValue,
  section,
  text,
} from "./layout";
import { status } from "./status";
import { pipeline, numbered } from "./pipeline";
import { bar } from "./meter";

export const ui = {
  INDENT,
  header,
  section,
  keyValue,
  pipeline,
  numbered,
  bar,
  hint,
  text,
  divider,
  blank,
  badge,
  status,
};
