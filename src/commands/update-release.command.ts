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
    description: "Hash of the bundle to update the release to",
    required: true,
  },
  {
    name: "is-mandatory",
    description: "To set whether the release is mandatory",
    required: false,
  },
  {
    name: "is-paused",
    description: "To set whether the release is paused",
    required: false,
  },
  {
    name: "is-rolled-back",
    description: "To set whether the release is rolled back",
    required: false,
  },
  {
    name: "rollout-percent",
    description: "Rollout percentage of the release",
    required: false,
  },
  {
    name: "release-note",
    description: "Release note of the release to update",
    required: false,
  },
  {
    name: "ci-token",
    description: "The CI token generated from the stallion dashboard",
    required: true,
  },
];

@Command({
  name: "update-release",
  description: "Update a release",
  alias: "ur",
  options: expectedOptions,
})
@ValidateUser()
export class UpdateReleaseCommand extends BaseCommand {
  constructor() {
    super();
  }

  async execute(options: Record<string, any>): Promise<void> {
    logger.info("Starting update-release command");
    if (!this.validateOptions(options, expectedOptions)) {
      return;
    }

    const {
      projectId,
      hash,
      releaseNote,
      isMandatory,
      isPaused,
      isRolledBack,
      rolloutPercent,
      ciToken,
    } = options;

    const data = {
      projectId,
      hash,
      releaseNote,
      isMandatory,
      isPaused,
      isRolledBack,
      rolloutPercent: rolloutPercent ? Number(rolloutPercent) : undefined,
    };

    const client = new ApiClient(CONFIG.API.BASE_URL);

    try {
      await progress(chalk.white("Updating release"), () =>
        this.updateRelease(client, data, ciToken),
      );
      logger.success("Release updated successfully!");
    } catch (error) {
      logger.error("Failed to update release");
      throw error;
    }
  }

  private async updateRelease(client: ApiClient, data: any, ciToken: string) {
    const { data: updateReleaseResp } = await client.post<any>(
      ENDPOINTS.PROMOTE.UPDATE_RELEASE,
      data,
      {
        headers: {
          "x-ci-token": ciToken,
        },
      },
    );
    return updateReleaseResp;
  }
}
