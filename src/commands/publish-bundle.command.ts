import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { logger } from "@utils/logger";
import path from "path";
import fs from "fs/promises";
import { readFileSync } from "fs";
import {
  isValidPlatform,
  fileDoesNotExistOrIsDirectory,
  getReactNativeVersion,
  runReactNativeBundleCommand,
  runHermesEmitBinaryCommand,
  runComposeSourcemapCommand,
} from "@/utils/react-native-utils";
import chalk from "chalk";
import { progress } from "@/utils/progress";
import { ApiClient } from "@/api/api-client";
import { calculateSHA2565Hash, signBundle } from "@/utils/hash-utils";
import { ENDPOINTS } from "@/api/endpoints";
import { CONFIG } from "@/api/config";
import { createDefaultTokenStore } from "@/utils/token-store";
import { createZip } from "@/utils/archive";
import { copyDebugId } from "@/utils/copy-debugid";

const expectedOptions: CommandOption[] = [
  {
    name: "upload-path",
    description: "The path to the bundle to upload",
    required: true,
  },
  {
    name: "platform",
    description: "The platform to publish the bundle to (android or ios)",
    required: true,
  },
  {
    name: "release-note",
    description: "The release note of the bundle",
    required: true,
  },
  {
    name: "hermes-disabled",
    description: "Whether to disable Hermes",
    required: false,
  },
  {
    name: "ci-token",
    description: "The CI token generated from the stallion dashboard",
    required: false,
  },
  {
    name: "entry-file",
    description: "The entry file of your react native project",
    required: false,
  },
  {
    name: "hermes-logs",
    description: "All the hermes log will be saved in output.log file",
    required: false,
  },
  {
    name: "private-key",
    description: "Private key to sign the bundle",
    required: false,
  },
  {
    name: "hermesc-path",
    description: "Path to the hermesc executable",
    required: false,
  },
  {
    name: "sourcemap",
    description: "Whether to enable sourcemap generation",
    required: false,
  },
  {
    name: "keep-artifacts",
    description: "Whether to keep the artifacts after publishing",
    required: false,
  }
];

@Command({
  name: "publish-bundle",
  description: "Publish a bundle to the registry",
  alias: "pb",
  options: expectedOptions,
})
@ValidateUser()
export class PublishBundleCommand extends BaseCommand {
  private contentRootPath: string;

  constructor() {
    super();
    this.contentRootPath = process.cwd();
  }

  async execute(options: Record<string, any>): Promise<void> {
    logger.info("Starting publish-bundle command");

    if (!this.validateOptions(options, expectedOptions)) {
      return;
    }

    if (!getReactNativeVersion()) {
      throw new Error("No react native project found in current directory");
    }

    let {
      uploadPath,
      platform,
      releaseNote,
      hermesDisabled,
      ciToken,
      entryFile,
      hermesLogs,
      privateKey,
      hermescPath,
      sourcemap,
      keepArtifacts,
    } = options;

    const contentTempRootPath = await fs.mkdtemp(
      path.join(this.contentRootPath, "stallion-temp-")
    );
    this.contentRootPath = path.join(contentTempRootPath, "Stallion");
    await fs.mkdir(this.contentRootPath);

    if (!isValidPlatform(platform)) {
      throw new Error(`Platform must be "android" or "ios".`);
    }

    const bundleName =
      platform === "ios" ? "main.jsbundle" : `index.android.bundle`;

    if (!entryFile) {
      entryFile = "index.js";
    } else {
      if (fileDoesNotExistOrIsDirectory(entryFile)) {
        throw new Error(`Entry file "${entryFile}" does not exist.`);
      }
    }

    await runReactNativeBundleCommand(
      bundleName,
      entryFile,
      this.contentRootPath,
      platform,
      sourcemap,
      false // dev mode is false
    );

    const isHermesDisabled = hermesDisabled;
    if (!isHermesDisabled) {
      await runHermesEmitBinaryCommand(
        bundleName,
        this.contentRootPath,
        hermesLogs,
        hermescPath
      );
    }

    if (keepArtifacts || sourcemap) {
      if (sourcemap) {
        await runComposeSourcemapCommand(this.contentRootPath, bundleName);
        copyDebugId(path.join(this.contentRootPath, "sourcemaps", bundleName + ".packager.map"), path.join(this.contentRootPath, "sourcemaps", bundleName + ".map"));
      }
      await this.keepArtifacts(this.contentRootPath, platform);
    }

    if (privateKey) {
      await progress(
        chalk.cyanBright("Signing Bundle"),
        signBundle(path.join(this.contentRootPath, "bundles"), privateKey)
      );
    }
    await progress(
      chalk.white("Archiving Bundle"),
      createZip(path.join(this.contentRootPath, "bundles"), contentTempRootPath)
    );
    const zipPath = path.resolve(contentTempRootPath, "build.zip");
    const client = new ApiClient(CONFIG.API.BASE_URL);
    const hash = await progress(
      chalk.white("Publishing bundle"),
      this.uploadBundle(
        client,
        zipPath,
        uploadPath,
        platform,
        releaseNote,
        ciToken
      )
    );
    logger.success("Success!, Published new version");
    logger.info(`Published bundle hash: ${hash}`);
  }

  private async uploadBundle(
    client: ApiClient,
    filePath: string,
    uploadPath: string,
    platform: string,
    releaseNote: string,
    ciToken: string
  ) {
    const tokenStore = createDefaultTokenStore();
    const tokenData = await tokenStore.get("cli");
    if (tokenData && tokenData.accessToken?.token) {
      client.setToken(tokenData.accessToken.token);
    }

    try {
      const hash = calculateSHA2565Hash(filePath);
      if (!hash) {
        throw new Error("Invalid path or not a valid zip file.");
      }
      const data: any = {
        hash,
        uploadPath: uploadPath?.toLowerCase(),
        platform: platform,
        releaseNote: releaseNote,
      };
      const headers: Record<string, string> = {};
      if (ciToken) {
        headers["x-ci-token"] = ciToken;
      }
      const endpoint = ciToken
        ? ENDPOINTS.UPLOAD.GENERATE_SIGNED_URL_WITH_CI_TOKEN
        : ENDPOINTS.UPLOAD.GENERATE_SIGNED_URL;

      const { data: signedUrlResp } = await client.post<any>(endpoint, data, {
        headers,
      });
      const url = signedUrlResp?.url;
      if (!url) {
        throw new Error("Internal Error: invalid signed url");
      }

      headers["Content-Type"] = "application/zip";
      await client.put(url, readFileSync(filePath), {
        headers,
      });
      return hash;
    } catch (e: any) {
      if (e.toString().includes("SignatureDoesNotMatch")) {
        throw "Error uploading bundle. Signature does not match.";
      }
      throw e;
    }
  }

  private async keepArtifacts(contentRootPath: string, platform: string) {
    const artifactsPath = path.join(process.cwd(), "artifacts");
    await fs.mkdir(artifactsPath, { recursive: true });
    const bundleName = platform === "ios" ? "main.jsbundle" : `index.android.bundle`;

    // `assets` is a directory (RN bundle output), so `copyFile` will fail. Use a directory-safe copy.
    await this.copyPathIfExists(
      path.join(contentRootPath, "bundles", "assets"),
      path.join(artifactsPath, "assets")
    );

    await this.copyFileIfExists(
      path.join(contentRootPath, "bundles", bundleName),
      path.join(artifactsPath, bundleName)
    );
    await this.copyFileIfExists(
      path.join(contentRootPath, "sourcemaps", bundleName + ".map"),
      path.join(artifactsPath, bundleName + ".map")
    );
    // Hermes map may not exist when Hermes is disabled.
    await this.copyFileIfExists(
      path.join(contentRootPath, "sourcemaps", bundleName + ".hbc.map"),
      path.join(artifactsPath, bundleName + ".hbc.map")
    );
  }

  private async copyFileIfExists(src: string, dest: string) {
    try {
      await fs.copyFile(src, dest);
    } catch (e: any) {
      if (e?.code === "ENOENT") return;
      throw e;
    }
  }

  private async copyPathIfExists(src: string, dest: string) {
    try {
      const st = await fs.lstat(src);
      if (!st.isDirectory()) {
        await fs.copyFile(src, dest);
        return;
      }

      // Prefer `fs.cp` when available (Node >= 16.7). Fallback for older runtimes.
      const cp = (fs as any).cp as undefined | ((src: string, dest: string, opts: any) => Promise<void>);
      if (typeof cp === "function") {
        await cp(src, dest, { recursive: true, force: true });
        return;
      }

      await this.copyDirRecursive(src, dest);
    } catch (e: any) {
      if (e?.code === "ENOENT") return;
      throw e;
    }
  }

  private async copyDirRecursive(srcDir: string, destDir: string) {
    await fs.mkdir(destDir, { recursive: true });
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirRecursive(srcPath, destPath);
        continue;
      }

      if (entry.isSymbolicLink()) {
        const link = await fs.readlink(srcPath);
        try {
          await fs.symlink(link, destPath);
        } catch (e: any) {
          // If it already exists, replace it.
          if (e?.code === "EEXIST") {
            await fs.rm(destPath, { force: true, recursive: true });
            await fs.symlink(link, destPath);
            continue;
          }
          throw e;
        }
        continue;
      }

      await fs.copyFile(srcPath, destPath);
    }
  }
}

