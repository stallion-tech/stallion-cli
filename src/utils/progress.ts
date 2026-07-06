import { task } from "@/ui";

type ProgressUpdater = (percentage: number) => void;

/**
 * Shows a themed progress spinner for an async operation. Delegates to the
 * shared UI spinner (`@/ui`) so progress matches the rest of the CLI: an iris
 * braille spinner with a live meter bar, resolving to a ✓ / ✗ status line.
 *
 * @param title The text to show while the operation is in progress
 * @param action Function that receives a progress updater callback
 * @returns The result of the promise
 */
export function progress<T>(
  title: string,
  action: (updateProgress: ProgressUpdater) => Promise<T>
): Promise<T> {
  return task(title, action);
}
