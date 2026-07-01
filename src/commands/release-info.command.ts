import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { promptSelect } from "@/utils/prompt";
import { ENDPOINTS } from "@/api/endpoints";
import {
  createCiApiClient,
  createUserApiClient,
  resolveOrgContext,
  resolvePlatform,
  resolveProjectId,
} from "@/api/user-client";
import { printBoard } from "@/ui";
import { ui } from "@/ui";
import chalk from "chalk";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted; required with --ci-token)", required: false },
  { name: "platform", description: "Platform (android|ios); prompts if omitted", required: false },
  { name: "app-version", description: "App version; prompts if omitted (required with --ci-token)", required: false },
  { name: "promoted-id", description: "Release id from list-releases; prompts if omitted (required with --ci-token)", required: false },
  { name: "ci-token", description: "CI token (non-interactive; requires --project-id, --platform, --app-version, --promoted-id)", required: false },
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
    const detail = await this.fetchDetail(options);
    if (!detail) return;

    // In JSON mode emit the raw detail once and skip the formatted sections.
    if (json) {
      console.log(JSON.stringify(detail, null, 2));
      return;
    }

    // Console — pipeline stages anchored by an inline rollout meter (3f).
    const events = detail.eventCount ?? {};
    const hashShort = detail.publishedBundle?.sha256Checksum
      ? String(detail.publishedBundle.sha256Checksum).slice(0, 12)
      : null;
    const rollout =
      detail.rolloutPercent != null ? Number(detail.rolloutPercent) : 0;
    const users = Number(detail.totalUsers ?? 0);
    const live = !detail.isRolledBack && !detail.isPaused;
    const stage = live ? "active" : "pending";
    const fmt = (n: unknown) => Number(n ?? 0).toLocaleString("en-US");

    ui.pipeline(
      [
        {
          status: "done",
          label: "build",
          value: `v${detail.bundleVersion ?? "-"}${hashShort ? ` · ${hashShort}` : ""}`,
        },
        { status: "done", label: "platform", value: detail.platform },
        {
          status: stage,
          label: "rollout",
          value: `${ui.bar(rollout)} ${rollout}%`,
        },
        { status: stage, label: "total users", value: fmt(users) },
      ],
      { spaced: true }
    );

    ui.section("release note");
    ui.text(detail.releaseNote ? String(detail.releaseNote) : chalk.dim("-"));

    ui.section("bundle hash");
    ui.text(
      detail.publishedBundle?.sha256Checksum
        ? String(detail.publishedBundle.sha256Checksum)
        : chalk.dim("-")
    );

    ui.blank();
    if (detail.isRolledBack) ui.status.fail("rolled back · review required");
    else if (detail.isPaused) ui.status.warn("paused · rollout halted");
    else ui.status.ok("healthy · no rollback configured");

    // Adoption Metrics — raw counts, shown last.
    ui.section("Adoption Metrics");
    printBoard(
      [detail],
      [
        { header: "DOWNLOADS", render: () => fmt(events.DOWNLOAD_COMPLETE_PROD), align: "right" },
        { header: "INSTALLS", render: () => fmt(events.INSTALLED_PROD), align: "right" },
        { header: "ROLLBACKS", render: () => fmt(events.AUTO_ROLLED_BACK_PROD), align: "right" },
        { header: "USERS", render: () => fmt(detail.totalUsers), align: "right" },
      ],
      { indent: ui.INDENT }
    );
  }

  /** Resolve the release detail via the CI-token or interactive user path. */
  private async fetchDetail(
    options: Record<string, any>
  ): Promise<any | null> {
    if (options.ciToken) {
      const { projectId, platform, appVersion, promotedId } = options;
      if (!projectId || !platform || !appVersion || !promotedId) {
        throw new Error(
          "--project-id, --platform, --app-version and --promoted-id are required with --ci-token"
        );
      }
      const client = createCiApiClient(options.ciToken);
      const res = await progress("Fetching release detail", () =>
        client.post<{ data: any }>(ENDPOINTS.PROMOTED.CI_DETAIL, {
          projectId,
          platform,
          appVersion,
          promotedId,
        })
      );
      return res?.data ?? null;
    }

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
        ui.hint("No app versions found for this platform.");
        return null;
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
        client.post<{ data: any[] }>(ENDPOINTS.PROMOTED.LISTING, {
          projectId,
          platform,
          appVersion,
        })
      );
      const releases = relRes?.data ?? [];
      if (!releases.length) {
        ui.hint("No releases found for this app version.");
        return null;
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
            value: String(r.id),
            description: `${created}${status ? `   ${status}` : ""}   id: ${r.id}`,
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
    return res?.data ?? null;
  }
}
