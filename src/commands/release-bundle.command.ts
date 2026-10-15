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
  {
    name: "json",
    description:
      "Print only a JSON result ({id, version, appVersion, hash, projectId}) on stdout for scripting",
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
    const json = Boolean(options.json);
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

    const region = parseTokenRegion(ciToken) ?? "ap";
    const client = new ApiClient(getApiBaseUrl(region));

    // In JSON mode, keep stdout for the result only; diagnostics go to stderr.
    const restoreStdout = json ? silenceStdout() : undefined;
    const resp = await progress(chalk.cyanBright("Releasing bundle"), () =>
      this.releaseBundle(client, data, ciToken)
    );

    const releaseId = resp?.id ?? null;
    const version = resp?.version ?? null;

    if (json) {
      restoreStdout?.();
      console.log(
        JSON.stringify({ id: releaseId, version, appVersion, hash, projectId })
      );
    } else {
      ui.status.ok("Bundle released.");
      ui.keyValue([
        ["version", version],
        ["release id", releaseId],
      ]);
    }
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
