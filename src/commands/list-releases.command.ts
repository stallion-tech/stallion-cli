import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { logger } from "@utils/logger";
import { progress } from "@/utils/progress";
import { promptSelect } from "@/utils/prompt";
import { ENDPOINTS } from "@/api/endpoints";
import {
  createUserApiClient,
  resolveOrgContext,
  resolvePlatform,
  resolveProjectId,
} from "@/api/user-client";
import { printTable } from "@/utils/table";
import { ui } from "@/utils/ui";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted)", required: false },
  { name: "platform", description: "Platform (android|ios); prompts if omitted", required: false },
  { name: "app-version", description: "App version; prompts if omitted", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

@Command({
  name: "list-releases",
  description: "List the production releases for an app version",
  alias: "lr",
  options: expectedOptions,
})
@ValidateUser()
export class ListReleasesCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    const json = Boolean(options.json);
    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, options.projectId);
    const platform = await resolvePlatform(options.platform);
    const client = await createUserApiClient(region);

    let appVersion = options.appVersion;
    if (!appVersion) {
      const verRes = await progress("Fetching app versions", () =>
        client.post<{ data: any[] }>(ENDPOINTS.PROMOTED.LIST_APP_VERSIONS, {
          projectId,
          platform,
        })
      );
      const versions = verRes?.data ?? [];
      if (!versions.length) {
        logger.info("No app versions found for this platform.");
        return;
      }
      appVersion = await promptSelect<string>(
        "Select an app version",
        versions.map((v: any) => ({
          name: v.targetVersion,
          value: v.targetVersion,
          description: `${v.count} release(s)${
            v.latestReleaseUserEmail ? `   latest by ${v.latestReleaseUserEmail}` : ""
          }`,
        }))
      );
    }

    const res = await progress("Fetching releases", () =>
      client.post<{ data: any }>(ENDPOINTS.PROMOTED.LISTING, {
        projectId,
        platform,
        appVersion,
      })
    );
    const releases = res?.data?.paginatedData ?? [];

    if (!json) ui.section(`Releases · v${appVersion}`);
    printTable(
      releases,
      [
        { header: "APP VERSION", value: (r) => r.appVersion },
        { header: "BUNDLE VERSION", value: (r) => r.bundleVersion },
        { header: "RELEASE ID", value: (r) => r._id },
        { header: "AUTHOR", value: (r) => r.user?.email ?? r.user?.fullName },
        { header: "PAUSED", value: (r) => Boolean(r.isPaused) },
        { header: "ROLLED BACK", value: (r) => Boolean(r.isRolledBack) },
        { header: "CREATED", value: (r) => r.createdAt },
      ],
      { json, indent: ui.INDENT }
    );
  }
}
