import { Command } from "@/decorators/command.decorator";
import { getReactNativeVersion } from "@/utils/react-native-utils";
import { BaseCommand } from "@command-line/base.command";
import path from "path";
import fs from "fs/promises";
import { generateKeyPairSync } from "crypto";
import { ui } from "@/ui";

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
      const { privateKey, publicKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      await fs.writeFile(privateKeyPath, privateKey);
      await fs.writeFile(publicKeyPath, publicKey);

      const relativePrivatePath = path.relative(this.contentRootPath, privateKeyPath);
      const relativePublicPath = path.relative(this.contentRootPath, publicKeyPath);
      const projectDir = path.basename(this.contentRootPath);

      ui.status.ok("Key pair generated");
      ui.section("Location");
      ui.keyValue([
        ["Public key", `${projectDir}/${relativePublicPath}`],
        ["Private key", `${projectDir}/${relativePrivatePath}`],
        ["Created", new Date().toISOString()],
      ]);

      ui.section("Important");
      ui.text("It is solely your responsibility to store and manage your signing keys — losing them can break your release pipeline.");
      ui.text("Do NOT regenerate keys unless absolutely necessary; it may break compatibility with existing Stallion releases.");

      ui.blank();
      ui.status.warn("Keep your private key secure — never share or commit it.");
      ui.status.fail("Stallion cannot recover or validate lost keys.");
    } catch (error: any) {
      ui.status.fail("Failed to generate keys");
      if (error instanceof Error) ui.hint(`  ${error.message}`);
    }
  }
}
