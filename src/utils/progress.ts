import * as tty from "tty";
const ora = require("ora");
import { noop } from "lodash";

type ProgressUpdater = (percentage: number) => void;

/**
 * Shows a progress spinner for an async operation
 * @param title The text to show while the operation is in progress
 * @param action Function that receives a progress updater callback
 * @returns The result of the promise
 */
export function progress<T>(
  title: string,
  action: (updateProgress: ProgressUpdater) => Promise<T>,
): Promise<T> {
  const stdoutIsTerminal = tty.isatty(1);

  if (stdoutIsTerminal) {
    const spinner = ora({
      text: title,
      color: "white",
    }).start();

    const updateProgress: ProgressUpdater = (percentage: number) => {
      spinner.text = `${title} (${percentage.toFixed(0)}%)`;
    };

    return action(updateProgress)
      .then((result) => {
        spinner.succeed();
        return result;
      })
      .catch((ex) => {
        spinner.fail();
        throw ex;
      });
  } else {
    return action(noop);
  }
}

// Helper functions that need to be implemented
function formatIsParsingCompatible(): boolean {
  // TODO: Implement based on your needs
  return false;
}

function isQuiet(): boolean {
  // TODO: Implement based on your needs
  return false;
}
