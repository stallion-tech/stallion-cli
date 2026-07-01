/**
 * Redirect stdout to stderr until the returned restore fn is called.
 *
 * Used by `--json` command modes so stdout carries ONLY the final JSON result
 * (safe for `$(... | jq)` capture in CI) while all diagnostics — logs, spinners,
 * and child-process stdout (e.g. the RN bundler) — still stream to stderr.
 */
export function silenceStdout(): () => void {
  const original = process.stdout.write.bind(process.stdout);
  (process.stdout as any).write = (...args: any[]) =>
    (process.stderr.write as any)(...args);
  return () => {
    (process.stdout as any).write = original;
  };
}
