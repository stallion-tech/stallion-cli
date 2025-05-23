import * as tty from "tty";
const ora = require("ora");

/**
 * Shows a progress spinner for an async operation
 * @param title The text to show while the operation is in progress
 * @param action The promise to track
 * @returns The result of the promise
 */
export function progress<T>(title: string, action: Promise<T>): Promise<T> {
  const stdoutIsTerminal = tty.isatty(1);

  if (stdoutIsTerminal) {
    const spinner = ora({
      text: title,
      color: "white",
    }).start();

    return action
      .then((result) => {
        spinner.succeed();
        return result;
      })
      .catch((ex) => {
        spinner.fail();
        throw ex;
      });
  } else {
    return action;
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
