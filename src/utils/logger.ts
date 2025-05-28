import chalk from "chalk";

export const logger = {
  success: (message: string) => console.log(chalk.green("✓"), message),
  error: (message: string) => console.log(chalk.red("✗"), message),
  info: (message: string) => console.log(chalk.blue("ℹ"), message),
  warning: (message: string) => console.log(chalk.yellow("⚠"), message),
  title: (message: string) => console.log(chalk.bold.cyan(message)),
  subtitle: (message: string) => console.log(chalk.cyan(message)),
  command: (name: string, description: string, alias?: string) => {
    const aliasText = alias ? chalk.gray(`(${alias})`) : "";
    console.log(chalk.green(name), aliasText);
    console.log(chalk.gray(`  ${description}\n`));
  },
};
