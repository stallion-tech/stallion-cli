import gradient from "gradient-string";
import chalk from "chalk";

import { getVersion } from "./version";

const renderFigletBanner = (): Promise<string> => {
  const figlet = require("figlet");

  return new Promise((resolve, reject) => {
    figlet.text(
      "STALLION",
      {
        font: "Larry 3D",
        horizontalLayout: "default",
        verticalLayout: "default",
      },
      (err: any, data: any) => {
        if (err || !data) {
          reject(err ?? new Error("figlet returned no output"));
          return;
        }
        resolve(data);
      }
    );
  });
};

export const showBanner = async (): Promise<void> => {
  let banner = "STALLION";

  try {
    banner = await renderFigletBanner();
  } catch {
    // Decorative only — fall back to the plain wordmark.
  }

  console.log(gradient.retro.multiline(banner));
  console.log(
    "\n" +
      chalk.whiteBright(
        `⚡ Welcome to the Stallion CLI ${chalk.bold(
          chalk.greenBright(`v${getVersion()}`)
        )} ⚡ \n`
      )
  );
};
