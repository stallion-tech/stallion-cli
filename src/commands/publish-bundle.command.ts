import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { ui } from "@/ui";
import path from "path";
import fs from "fs/promises";
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
import { createDefaultTokenStore } from "@/utils/token-store";
import { createZip } from "@/utils/archive";
import { keepArtifacts as saveArtifacts } from "@/utils/copy";
import { getApiBaseUrl } from "@/utils/common";
import { resolveRegion } from "@/utils/region";
import { silenceStdout } from "@/utils/stdout";

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
  },
  {
    name: "custom-bundle-path",
    description: "The path to the custom bundle to upload",
    required: false,
  },
  {
    name: "json",
    description:
      "Print only a JSON result ({version, hash, platform, uploadPath}) on stdout for scripting",
    required: false,
  },
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
    const json = Boolean(options.json);

    if (!this.validateOptions(options, expectedOptions)) {
      return;
    }

    if (!getReactNativeVersion()) {
      throw new Error("No react native project found in current directory");
    }

    // In JSON mode, route all incidental output (logs, spinners, the RN bundler's
    // own stdout) to stderr so stdout carries ONLY the final JSON result. Left in
    // place on error: the failure goes to stderr and stdout stays empty.
    const restoreStdout = json ? silenceStdout() : undefined;

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
      customBundlePath,
    } = options;

    const contentTempRootPath = await fs.mkdtemp(
      path.join(this.contentRootPath, "stallion-temp-")
    );
    this.contentRootPath = path.join(contentTempRootPath, "Stallion");
    await fs.mkdir(this.contentRootPath);

    if (!isValidPlatform(platform)) {
      throw new Error(`Platform must be "android" or "ios".`);
    }

    // Run RN Command and Hermes Command only when expoBundlePath is not provided
    if (!customBundlePath) {
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
        const artifactsPath = path.join(process.cwd(), "stallion-artifacts");
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
          hermescPath,
          sourcemap
        );
      }

      if (keepArtifactsFlag && !isHermesDisabled) {
        // Snapshot the Hermes artifacts AFTER the Hermes conversion step.
        await saveArtifacts(this.contentRootPath, platform, "hermes");
      }
    }

    if (privateKey) {
      await progress(chalk.cyanBright("Signing Bundle"), () => {
        const bundlePath = customBundlePath ? customBundlePath : path.join(this.contentRootPath, "bundles");
        return signBundle(bundlePath, privateKey)
      }
      );
    }
    await progress(chalk.white("Archiving Bundle"), () => {
      const bundleInputPath = customBundlePath ? customBundlePath : path.join(this.contentRootPath, "bundles");
      return createZip(
        bundleInputPath,
        contentTempRootPath
      )
    }
    );
    const zipPath = path.resolve(contentTempRootPath, "build.zip");
    const stats = await fs.stat(zipPath);
    ui.hint(`  Bundle size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const tokenStore = createDefaultTokenStore();
    const tokenData = await tokenStore.get("cli");
    const accessToken = tokenData?.accessToken?.token;

    const region = await resolveRegion({
      uploadPath,
      ciToken,
      accessToken,
    });

    const client = new ApiClient(getApiBaseUrl(region));
    // One spinner covers the whole publish: upload + waiting for the bundle to
    // register. Registration is async (S3 event → update-uploaded-data), so we
    // poll until it's queryable, otherwise a following release-bundle can race
    // ahead into "bundle not found". Best-effort — it never fails the publish.
    let registered = true;
    const { hash, version, bucketCreated, bucketName } = await progress(
      chalk.white("Publishing bundle"),
      async (updateProgress) => {
        const result = await this.uploadBundle(
          client,
          zipPath,
          uploadPath,
          platform,
          releaseNote,
          ciToken,
          updateProgress
        );
        if (result.projectId) {
          registered = await this.waitForBundle(client, {
            ciToken,
            projectId: result.projectId,
            hash: result.hash,
          });
        }
        return result;
      }
    );

    if (!registered) {
      ui.status.warn(
        "Bundle is still registering — if release-bundle can't find it yet, retry in a moment."
      );
    }

    if (json) {
      restoreStdout?.();
      console.log(
        JSON.stringify({ version, hash, platform, uploadPath, bucketCreated })
      );
    } else {
      if (bucketCreated) {
        ui.status.ok(`Created new bucket "${bucketName}"`);
      }
      ui.status.ok(`Published version ${version}`);
      ui.keyValue([
        ["Published bundle hash", hash],
        ["Platform", platform],
        ["Upload Path", uploadPath],
      ]);
    }
  }

  /**
   * Poll the by-hash endpoint until the just-uploaded bundle is registered.
   * Best-effort: returns true once confirmed, false if it doesn't register
   * within the window. Never throws — a slow (or older) backend must not fail a
   * publish whose upload already succeeded. Uses the CI-token route when a
   * ci-token was supplied, otherwise the user route (client carries the token).
   */
  private async waitForBundle(
    client: ApiClient,
    opts: { ciToken?: string; projectId: string; hash: string }
  ): Promise<boolean> {
    const { ciToken, projectId, hash } = opts;
    const endpoint = ciToken
      ? ENDPOINTS.BUNDLE.CI_BY_HASH
      : ENDPOINTS.BUNDLE.BY_HASH;
    const config = ciToken ? { headers: { "x-ci-token": ciToken } } : undefined;
    const intervalMs = 2000;
    const deadline = Date.now() + 60_000;

    while (Date.now() < deadline) {
      try {
        const res = await client.post<{ data: { exists: boolean } }>(
          endpoint,
          { projectId, checksum: hash },
          config
        );
        if (res?.data?.exists) return true;
      } catch {
        // Endpoint missing (older backend) or transient — keep trying to the deadline.
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return false;
  }

  private async uploadBundle(
    client: ApiClient,
    filePath: string,
    uploadPath: string,
    platform: string,
    releaseNote: string,
    ciToken: string,
    onProgress: (percentage: number) => void,
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
      // The server returns the version it assigned to this upload + the
      // project it belongs to (used to poll for registration afterwards).
      const rawVersion = signedUrlResp?.meta?.version;
      const version =
        rawVersion != null && !isNaN(Number(rawVersion))
          ? Number(rawVersion)
          : null;
      const projectId = signedUrlResp?.meta?.projectId
        ? String(signedUrlResp.meta.projectId)
        : null;
      // The server creates the bucket on the fly when `uploadPath` is new; it
      // signals that via meta.bucketCreated so we can tell the user.
      const bucketCreated = Boolean(signedUrlResp?.meta?.bucketCreated);
      const bucketName = signedUrlResp?.meta?.bucketName ?? uploadPath;

      await client.putWithProgress(url, filePath, "application/zip", onProgress);
      return { hash, version, projectId, bucketCreated, bucketName };
    } catch (e: any) {
      if (e.toString().includes("SignatureDoesNotMatch")) {
        throw "Error uploading bundle. Signature does not match.";
      }
      throw e;
    }
  }
}
