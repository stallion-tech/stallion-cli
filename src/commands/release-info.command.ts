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
import { printBoxes, printTable } from "@/utils/table";
import { ui } from "@/utils/ui";
import chalk from "chalk";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted)", required: false },
  { name: "platform", description: "Platform (android|ios); prompts if omitted", required: false },
  { name: "app-version", description: "App version; prompts if omitted", required: false },
  { name: "promoted-id", description: "Release id (from list-releases); prompts if omitted", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

@Command({
  name: "release-info",
  description: "Show full detail of a single production release",
  alias: "ri",
  options: expectedOptions,
})
@ValidateUser()
export class ReleaseInfoCommand extends BaseCommand {
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

    let promotedId = options.promotedId;
    if (!promotedId) {
      const relRes = await progress("Fetching releases", () =>
        client.post<{ data: any }>(ENDPOINTS.PROMOTED.LISTING, {
          projectId,
          platform,
          appVersion,
        })
      );
      const releases = relRes?.data?.paginatedData ?? [];
      if (!releases.length) {
        logger.info("No releases found for this app version.");
        return;
      }
      promotedId = await promptSelect<string>(
        "Select a release",
        releases.map((r: any) => {
          const status = [
            r.isPaused ? "paused" : null,
            r.isRolledBack ? "rolled-back" : null,
          ]
            .filter(Boolean)
            .join(", ");
          const created = r.createdAt
            ? new Date(r.createdAt).toISOString().slice(0, 10)
            : "";
          return {
            name: `v${r.bundleVersion}`,
            value: String(r._id),
            description: `${created}${status ? `   ${status}` : ""}   id: ${r._id}`,
          };
        })
      );
    }

    const res = await progress("Fetching release detail", () =>
      client.post<{ data: any }>(ENDPOINTS.PROMOTED.DETAIL, {
        projectId,
        platform,
        appVersion,
        promotedId,
      })
    );
    const detail = res?.data ?? {};

    // In JSON mode emit the raw detail once and skip the formatted sections.
    if (json) {
      console.log(JSON.stringify(detail, null, 2));
      return;
    }

    // Summary + Details — two boxes side by side at the top.
    ui.section("Release");
    printBoxes([
      {
        obj: detail,
        title: "App Version Summary",
        description:
          "Key identifiers and rollout status for the selected bundle.",
        fields: [
          { label: "App Version", value: (d) => d.appVersion },
          { label: "Platform", value: (d) => d.platform },
          {
            label: "Rollout",
            value: (d) =>
              d.rolloutPercent != null ? `${d.rolloutPercent}%` : null,
          },
          { label: "Promoted At", value: (d) => d.createdAt },
          {
            label: "Promoted By",
            value: (d) => d.user?.email ?? d.user?.fullName,
          },
        ],
      },
      {
        obj: detail,
        title: "Details",
        description: "Bundle version and release flags.",
        fields: [
          { label: "Bundle Version", value: (d) => d.bundleVersion },
          { label: "Mandatory", value: (d) => Boolean(d.isMandatory) },
          { label: "Paused", value: (d) => Boolean(d.isPaused) },
          { label: "Rolled Back", value: (d) => Boolean(d.isRolledBack) },
        ],
      },
    ], { indent: ui.INDENT });

    const events = detail.eventCount ?? {};

    // Events — counts shown as their own compact table.
    ui.section("Events");
    printTable(
      [
        {
          download: events.DOWNLOAD_COMPLETE_PROD,
          install: events.INSTALLED_PROD,
          rollback: events.AUTO_ROLLED_BACK_PROD,
          totalUsers: detail.totalUsers,
        },
      ],
      [
        { header: "DOWNLOADS", value: (r) => r.download },
        { header: "INSTALLS", value: (r) => r.install },
        { header: "ROLLBACKS", value: (r) => r.rollback },
        { header: "TOTAL USERS", value: (r) => r.totalUsers },
      ],
      { indent: ui.INDENT }
    );

    // Release note — free text, kept out of the tables.
    ui.section("Release Note");
    ui.text(detail.releaseNote ? String(detail.releaseNote) : chalk.dim("-"));

    // Bundle hash — shown as a full-width line (too long to box neatly).
    ui.section("Bundle Hash");
    ui.text(
      detail.publishedBundle?.sha256Checksum
        ? String(detail.publishedBundle.sha256Checksum)
        : chalk.dim("-")
    );
  }
}
