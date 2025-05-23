import { logger } from "@utils/logger";
import gradient from "gradient-string";
import chalk from "chalk";
const figlet = require("figlet");

import { getVersion } from "./version";

export const showBanner = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    figlet.text(
      "STALLION",
      {
        font: "Larry 3D",
        horizontalLayout: "default",
        verticalLayout: "default",
      },
      (err: any, data: any) => {
        if (err) {
          reject("Something went wrong...");
          return;
        }
        // Apply retro gradient to the banner
        const gradientBanner = gradient.retro.multiline(data || "");
        console.log(gradientBanner);
        console.log(
          "\n" +
            chalk.whiteBright(
              `⚡ Welcome to the Stallion CLI ${chalk.bold(
                chalk.greenBright(`v${getVersion()}`)
              )} ⚡ \n`
            )
        );
        resolve();
      }
    );
  });
};
