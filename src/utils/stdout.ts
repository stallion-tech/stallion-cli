/**
 * Redirect stdout to stderr until the returned restore fn is called — --json
 * mode uses this so stdout carries only the final JSON result.
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

/** Restore stdout if it is currently silenced (idempotent). */
export function restoreStdout(): void {
  activeRestore?.();
}
