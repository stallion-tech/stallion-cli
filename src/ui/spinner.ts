import * as tty from "tty";
import { glyph, theme } from "./theme";
import { bar } from "./meter";

/** Braille spinner frames — same family as glyph.spin, animated. */
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL = 80;

const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR = "\r\x1b[2K";

export interface Spinner {
  /** Replace the trailing text (keeps spinning). */
  setText(text: string): void;
  /** Stop and print a green ✓ line. */
  succeed(text?: string): void;
  /** Stop and print a red ✗ line. */
  fail(text?: string): void;
  /** Stop and clear, printing nothing. */
  stop(): void;
}

/**
 * A themed spinner matching the Stallion UI: an iris braille spinner while
 * running, resolving to the shared ✓ / ✗ status marks. Falls back to a no-op
 * (no animation) when stdout is not a TTY, so piped/CI output stays clean.
 */
export function createSpinner(initial: string): Spinner {
  // Progress is a diagnostic — render on stderr, gated on stderr being a TTY.
  // This keeps the animation visible during `cmd --json | jq` (stdout piped,
  // stderr still a terminal) without ever corrupting stdout.
  const isTTY = tty.isatty(2);
  let text = initial;
  let i = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const draw = () => {
    const mark = theme.iris(FRAMES[i]);
    i = (i + 1) % FRAMES.length;
    process.stderr.write(`${CLEAR}${mark} ${theme.text(text)}`);
  };

  const restoreCursor = () => process.stderr.write(SHOW);

  if (isTTY) {
    process.stderr.write(HIDE);
    process.once("exit", restoreCursor);
    draw();
    timer = setInterval(draw, INTERVAL);
    if (typeof timer.unref === "function") timer.unref();
  }

  const finish = (mark: string, msg: string) => {
    if (timer) clearInterval(timer);
    if (isTTY) {
      process.stderr.write(CLEAR + SHOW);
      console.error(`${mark} ${msg}`);
    }
  };

  return {
    setText: (t) => {
      text = t;
    },
    succeed: (t) => finish(theme.ok(glyph.tick), t ?? text),
    fail: (t) => finish(theme.danger(glyph.cross), t ?? text),
    stop: () => {
      if (timer) clearInterval(timer);
      if (isTTY) process.stderr.write(CLEAR + SHOW);
    },
  };
}

/**
 * Run an async action behind a themed spinner. The action receives an
 * `update(percent)` callback that renders a live meter bar next to the title:
 *   ⠋ Publishing bundle  ██████░░ 74%
 * On success the line collapses to a clean `✓ Publishing bundle`.
 */
export async function task<T>(
  title: string,
  action: (update: (percent: number) => void) => Promise<T>
): Promise<T> {
  if (!tty.isatty(2)) {
    return action(() => {});
  }
  const spinner = createSpinner(title);
  const update = (percent: number) => {
    const pct = Math.max(0, Math.min(100, Number(percent) || 0));
    spinner.setText(`${title}  ${bar(pct)} ${theme.dim(`${pct.toFixed(0)}%`)}`);
  };
  try {
    const result = await action(update);
    spinner.succeed(title);
    return result;
  } catch (err) {
    spinner.fail(title);
    throw err;
  }
}
