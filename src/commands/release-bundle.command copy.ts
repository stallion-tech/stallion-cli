import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { logger } from "@utils/logger";
import chalk from "chalk";
import { progress } from "@/utils/progress";
import { ApiClient } from "@/api/api-client";
import { ENDPOINTS } from "@/api/endpoints";
import { CONFIG } from "@/api/config";

const expectedOptions: CommandOption[] = [
  {
    name: "org-id",
    description: "The org id of the app",
    required: true,
  },
  {
    name: "project-id",
    description: "The project id of the app",
    required: true,
  },
  {
    name: "bucket-id",
    description: "The bucket id of the bundle to promote",
    required: true,
  },
  {
    name: "bundle-id",
    description: "The bundle id of the bundle to promote",
    required: true,
  },
  {
    name: "version",
    description: "The version of the bundle to promote",
    required: true,
  },
  {
    name: "app-version",
    description: "The target version of the app to promote the bundle to",
    required: true,
  },
  {
    name: "release-note",
    description: "The release note of the release",
    required: true,
  },
  {
    name: "platform",
    description: "The platform of the bundle to promote (android or ios)",
    required: true,
  },
  {
    name: "ci-token",
    description: "The CI token generated from the stallion dashboard",
    required: true,
  },
  {
    name: "meta-output",
    description: "Log the meta output of the release",
    required: false,
  },
];

@Command({
  name: "release-bundle",
  description: "Release a bundle to an app version",
  alias: "rb",
  options: expectedOptions,
})
@ValidateUser()
export class ReleaseBundleCommand extends BaseCommand {
  constructor() {
    super();
  }

  async execute(options: Record<string, any>): Promise<void> {
    logger.info("Starting release-bundle command");
    if (!this.validateOptions(options, expectedOptions)) {
      return;
    }

    const {
      orgId,
      projectId,
      bucketId,
      bundleId,
      version,
      appVersion,
      releaseNote,
      platform,
      metaOutput,
    } = options;

    const data = {
      orgId,
      projectId,
      bucketId,
      bundleId,
      version,
      appVersion,
      releaseNote,
      platform,
    };

    const client = new ApiClient(CONFIG.API.BASE_URL);

    const releaseBundleResp = await progress(
      chalk.cyanBright("Releasing bundle"),
      this.releaseBundle(client, data)
    );

    logger.success("Bundle released successfully!");
    logger.info("For meta output, run the command with --meta-output flag");
    if (metaOutput) {
      logger.info(JSON.stringify(releaseBundleResp, null, 2));
    }
  }

  private async releaseBundle(client: ApiClient, data: any) {
    const { data: releaseBundleResp } = await client.post<any>(
      ENDPOINTS.PROMOTE.PROMOTE_BUNDLE,
      data
    );
    return releaseBundleResp;
  }
}
