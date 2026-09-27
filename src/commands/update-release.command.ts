import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { ui } from "@/ui";
import chalk from "chalk";
import { progress } from "@/utils/progress";
import { ApiClient } from "@/api/api-client";
import { ENDPOINTS } from "@/api/endpoints";
import { getApiBaseUrl } from "@/utils/common";
import { parseTokenRegion } from "@/utils/region";
import { silenceStdout } from "@/utils/stdout";

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
  {
    name: "json",
    description:
      "Print only a JSON result of the updated fields on stdout for scripting",
    required: false,
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
    const json = Boolean(options.json);
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

    const region = parseTokenRegion(ciToken) ?? "ap";
    const client = new ApiClient(getApiBaseUrl(region));

    // In JSON mode, keep stdout for the result only; diagnostics go to stderr.
    const restoreStdout = json ? silenceStdout() : undefined;
    const toBool = (v: unknown) =>
      v === undefined ? undefined : v === true || v === "true";

    try {
      await progress(chalk.white("Updating release"), () =>
        this.updateRelease(client, data, ciToken)
      );

      if (json) {
        restoreStdout?.();
        console.log(
          JSON.stringify({
            projectId,
            hash,
            rolloutPercent: data.rolloutPercent,
            isMandatory: toBool(isMandatory),
            isPaused: toBool(isPaused),
            isRolledBack: toBool(isRolledBack),
          })
        );
      } else {
        ui.status.ok("Release updated successfully!");
      }
    } catch (error) {
      ui.status.fail("Failed to update release");
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
      }
    );
    return updateReleaseResp;
  }
}
