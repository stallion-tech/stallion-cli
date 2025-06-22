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
    name: "project-id",
    description: "Project id of the app",
    required: true,
  },
  {
    name: "hash",
    description: "Hash of the bundle to promote",
    required: true,
  },
  {
    name: "app-version",
    description: "Target version of the app to promote the bundle to",
    required: true,
  },
  {
    name: "release-note",
    description: "Release note of the release",
    required: true,
  },
  {
    name: "ci-token",
    description: "CI token generated from the stallion dashboard",
    required: true,
  },
  {
    name: "is-mandatory",
    description: "To mark this release as mandatory",
    required: false,
  },
  {
    name: "is-paused",
    description: "To mark this release as paused",
    required: false,
  },
];

@Command({
  name: "release-bundle",
  description: "Promote a bundle to a target app version",
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
      projectId,
      hash,
      appVersion,
      releaseNote,
      isMandatory,
      isPaused,
      ciToken,
    } = options;

    const data = {
      projectId,
      hash,
      appVersion,
      releaseNote,
      isMandatory,
      isPaused,
    };

    const client = new ApiClient(CONFIG.API.BASE_URL);

    await progress(
      chalk.cyanBright("Releasing bundle"),
      this.releaseBundle(client, data, ciToken)
    );

    logger.success("Bundle released successfully!");
  }

  private async releaseBundle(client: ApiClient, data: any, ciToken: string) {
    const { data: releaseBundleResp } = await client.post<any>(
      ENDPOINTS.PROMOTE.PROMOTE_BUNDLE,
      data,
      {
        headers: {
          "x-ci-token": ciToken,
        },
      }
    );
    return releaseBundleResp;
  }
}
