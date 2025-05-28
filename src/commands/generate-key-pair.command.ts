import { Command } from "@/decorators/command.decorator";
import { getReactNativeVersion } from "@/utils/react-native-utils";
import { BaseCommand } from "@command-line/base.command";
import path from "path";
import fs from "fs/promises";
import { generateKeyPairSync } from "crypto";
import chalk from "chalk";
import { logger } from "@/utils/logger";

@Command({
  name: "generate-key-pair",
  description: "Generate Private & Public keys",
  alias: "gkp",
})
export class GenerateKeyPairCommand extends BaseCommand {
  private contentRootPath: string;

  constructor() {
    super();
    this.contentRootPath = process.cwd();
  }

  async execute(): Promise<void> {
    if (!getReactNativeVersion()) {
      throw new Error("No react native project found in current directory");
    }

    const secretKeysPath = path.join(this.contentRootPath, "stallion", "secret-keys");
    await fs.mkdir(secretKeysPath, { recursive: true });

    const privateKeyPath = path.join(secretKeysPath, "private-key.pem");
    const publicKeyPath = path.join(secretKeysPath, "public-key.pem");

    try {

      // Generate key pair using crypto module
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Write keys to files
      await fs.writeFile(privateKeyPath, privateKey);
      await fs.writeFile(publicKeyPath, publicKey);

      // Relative paths for display
      const relativePrivatePath = path.relative(this.contentRootPath, privateKeyPath);
      const relativePublicPath = path.relative(this.contentRootPath, publicKeyPath);
      const projectDir = path.basename(this.contentRootPath);

      console.log(
        "\n" +
        chalk.green("🔐 Key Pair Generated Successfully!\n")
      );
      console.log(chalk.cyan("📍 Location\n"));
      console.log(`  Public Key : ${chalk.yellow(`${projectDir}/${relativePublicPath}`)}\n`);
      console.log(`  Private Key: ${chalk.yellow(`${projectDir}/${relativePrivatePath}`)}\n`);
      console.log(chalk.cyan("📆 Created At:"), chalk.white(new Date().toString()), "\n\n");
      console.log(chalk.red("🚫 Keep your private key secure. Do NOT share it.\n\n"));

      // Add important notes about key management
      console.log(chalk.bold.yellow('⚠️  IMPORTANT NOTICE – READ CAREFULLY ⚠️\n'));

      console.log(
        chalk.yellow('1.') +
        ' ' +
        chalk.white(
          '🔐 It is ' +
          chalk.bold('solely your responsibility') +
          ' to securely store and manage your cryptographic signing keys. Losing them can critically disrupt your release pipeline.\n'
        )
      );

      console.log(
        chalk.yellow('2.') +
        ' ' +
        chalk.white(
          '❌ ' +
          chalk.bold('Do NOT regenerate keys') +
          ' unless absolutely necessary. Regenerating keys may break compatibility with existing Stallion releases and hinder OTA delivery.\n'
        )
      );

      console.log(
        chalk.red.bold('\nStallion cannot recover or validate lost keys.\n')
      );
    } catch (error: any) {
      console.log(
        "\n" +
        chalk.red("🔐 Failed to generate keys!\n")
      );
      if (error instanceof Error) {
        console.log(chalk.red(`Error: ${error.message}\n`));
      }
    }
  }
}