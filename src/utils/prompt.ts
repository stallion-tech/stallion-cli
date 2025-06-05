import inquirer from "inquirer";

/**
 * Prompt for a text input
 */
export async function promptText(
  message: string,
  defaultValue?: string
): Promise<string> {
  const { answer } = await inquirer.prompt<{ answer: string }>([
    {
      type: "input",
      name: "answer",
      message,
      default: defaultValue,
    },
  ]);
  return answer;
}

/**
 * Prompt for a yes/no confirmation
 */
export async function promptConfirm(
  message: string,
  defaultValue: boolean = true
): Promise<boolean> {
  const { answer } = await inquirer.prompt<{ answer: boolean }>([
    {
      type: "confirm",
      name: "answer",
      message,
      default: defaultValue,
    },
  ]);
  return answer;
}

/**
 * Prompt to select a single choice from a list
 */
export async function promptSelect<T>(
  message: string,
  choices: Array<{ name: string; value: T }>
): Promise<T> {
  const { answer } = await inquirer.prompt<{ answer: T }>([
    {
      type: "list",
      name: "answer",
      message,
      choices,
    },
  ]);
  return answer;
}

/**
 * Prompt to select multiple choices from a list
 */
export async function promptMultiSelect<T>(
  message: string,
  choices: Array<{ name: string; value: T }>
): Promise<T[]> {
  const { answer } = await inquirer.prompt<{ answer: T[] }>([
    {
      type: "checkbox",
      name: "answer",
      message,
      choices,
    },
  ]);
  return answer;
}

/**
 * Prompt for a password
 */
export async function promptPassword(message: string): Promise<string> {
  const { answer } = await inquirer.prompt<{ answer: string }>([
    {
      type: "password",
      name: "answer",
      message,
      mask: "*",
    },
  ]);
  return answer;
}

/**
 * Prompt for a number input
 */
export async function promptNumber(
  message: string,
  defaultValue?: number
): Promise<number> {
  const { answer } = await inquirer.prompt<{ answer: number }>([
    {
      type: "number",
      name: "answer",
      message,
      default: defaultValue,
      validate: (value) =>
        typeof value === "number" && !isNaN(value)
          ? true
          : "Please enter a valid number",
    },
  ]);
  return answer;
}
