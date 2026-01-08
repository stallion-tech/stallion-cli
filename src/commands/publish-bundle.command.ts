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
} from "@/utils/react-native-utils";
import chalk from "chalk";
import { progress } from "@/utils/progress";
import { ApiClient } from "@/api/api-client";
import { calculateSHA2565Hash, signBundle } from "@/utils/hash-utils";
import { ENDPOINTS } from "@/api/endpoints";
import { CONFIG } from "@/api/config";
import { createDefaultTokenStore } from "@/utils/token-store";
import { createZip } from "@/utils/archive";
import { keepArtifacts as saveArtifacts } from "@/utils/copy";

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
      keepArtifacts: keepArtifactsFlag,
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

    if (keepArtifactsFlag) {
      const artifactsPath = path.join(process.cwd(), "artifacts");
      await fs.mkdir(artifactsPath, { recursive: true });
    }

    await runReactNativeBundleCommand(
      bundleName,
      entryFile,
      this.contentRootPath,
      platform,
      sourcemap,
      false, // dev mode is false
    );

    if (keepArtifactsFlag) {
      // Snapshot the "normal" artifacts BEFORE Hermes replaces the bundle output.
      await saveArtifacts(this.contentRootPath, platform, "normal");
    }

    const isHermesDisabled = hermesDisabled;
    if (!isHermesDisabled) {
      await runHermesEmitBinaryCommand(
        bundleName,
        this.contentRootPath,
        hermesLogs,
        hermescPath
      );
    }

    if (keepArtifactsFlag && !isHermesDisabled) {
      // Snapshot the Hermes artifacts AFTER the Hermes conversion step.
      await saveArtifacts(this.contentRootPath, platform, "hermes");
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
}