import {
  input,
  confirm,
  select,
  search,
  checkbox,
  password,
  number,
} from "@inquirer/prompts";
import chalk from "chalk";

export interface SelectChoice<T> {
  name: string;
  value: T;
  /** Optional dimmed secondary line shown under the highlighted item. */
  description?: string;
}

/** Shared look for list/search prompts. */
const theme = {
  prefix: chalk.cyan("?"),
  icon: { cursor: chalk.cyan("❯") },
  style: {
    answer: (text: string) => chalk.cyan(text),
    highlight: (text: string) => chalk.cyan.bold(text),
    description: (text: string) => chalk.dim(text),
  },
} as const;

/** Lists longer than this switch to a type-ahead (filterable) prompt. */
const SEARCH_THRESHOLD = 8;

/**
 * Prompt for a text input
 */
export async function promptText(
  message: string,
  defaultValue?: string
): Promise<string> {
  return input({ message, default: defaultValue, theme });
}

/**
 * Prompt for a yes/no confirmation
 */
export async function promptConfirm(
  message: string,
  defaultValue: boolean = true
): Promise<boolean> {
  return confirm({ message, default: defaultValue, theme });
}

/**
 * Prompt to select a single choice from a list. Short lists use arrow-key
 * selection; long lists (> SEARCH_THRESHOLD) switch to a type-ahead filter so
 * you can narrow by typing.
 */
export async function promptSelect<T>(
  message: string,
  choices: Array<SelectChoice<T>>
): Promise<T> {
  if (choices.length > SEARCH_THRESHOLD) {
    return search<T>({
      message: `${message} ${chalk.dim("(type to filter)")}`,
      source: (term) => {
        const t = (term ?? "").toLowerCase();
        return choices.filter(
          (c) =>
            !t ||
            c.name.toLowerCase().includes(t) ||
            (c.description ?? "").toLowerCase().includes(t)
        );
      },
      theme,
    });
  }
  return select<T>({ message, choices, pageSize: 12, loop: false, theme });
}

/**
 * Prompt to select multiple choices from a list
 */
export async function promptMultiSelect<T>(
  message: string,
  choices: Array<SelectChoice<T>>
): Promise<T[]> {
  return checkbox<T>({ message, choices, pageSize: 12, loop: false, theme });
}

/**
 * Prompt for a password
 */
export async function promptPassword(message: string): Promise<string> {
  return password({ message, mask: "*", theme });
}

/**
 * Prompt for a number input
 */
export async function promptNumber(
  message: string,
  defaultValue?: number
): Promise<number> {
  const answer = await number({ message, default: defaultValue, theme });
  return answer ?? 0;
}
