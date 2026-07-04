/**
 * Redirect stdout to stderr until the returned restore fn is called.
 *
 * Used by `--json` command modes so stdout carries ONLY the final JSON result
 * (safe for `$(... | jq)` capture in CI) while all diagnostics — logs, spinners,
 * and child-process stdout (e.g. the RN bundler) — still stream to stderr.
 */
let activeRestore: (() => void) | null = null;

export function silenceStdout(): () => void {
  const original = process.stdout.write.bind(process.stdout);
  (process.stdout as any).write = (...args: any[]) =>
    (process.stderr.write as any)(...args);
  const restore = () => {
    (process.stdout as any).write = original;
    if (activeRestore === restore) activeRestore = null;
  };
  activeRestore = restore;
  return restore;
}

/**
 * Restore stdout if it is currently silenced (idempotent). The top-level error
 * handler calls this before emitting the `--json` error object, so a failure
 * mid-command (which never reaches the command's own restore) still surfaces
 * `{"error":...}` on real stdout for `jq`/CI consumers.
 */
export function restoreStdout(): void {
  activeRestore?.();
}
