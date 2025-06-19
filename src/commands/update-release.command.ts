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
    name: "promoted-id",
    description: "The id of the promoted release",
    required: true,
  },
  {
    name: "app-version",
    description: "The target version of the app to update the release to",
    required: true,
  },
  {
    name: "platform",
    description: "The platform of the app to update the release to",
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
    description: "The rollout percentage of the release",
    required: false,
  },
  {
    name: "release-note",
    description: "The release note of the release to update",
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
      orgId,
      projectId,
      promotedId,
      appVersion,
      releaseNote,
      platform,
      isMandatory,
      isPaused,
      isRolledBack,
      rolloutPercent,
    } = options;

    const data = {
      orgId,
      projectId,
      promotedId,
      appVersion,
      releaseNote,
      platform,
      isMandatory,
      isPaused,
      isRolledBack,
      rolloutPercent,
    };

    const client = new ApiClient(CONFIG.API.BASE_URL);

    try {
      await progress(
        chalk.cyanBright("Updating release"),
        this.updateRelease(client, data)
      );
      logger.success("Release updated successfully!");
    } catch (error) {
      logger.error("Failed to update release");
      throw error;
    }
  }

  private async updateRelease(client: ApiClient, data: any) {
    const { data: updateReleaseResp } = await client.post<any>(
      ENDPOINTS.PROMOTE.UPDATE_RELEASE,
      data
    );
    return updateReleaseResp;
  }
}
