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
import { ui } from "@/ui";
import { bar, glyph, printBoard, renderValue, theme } from "@/ui";
import { CONSOLE_URL, MAX_LIST_LIMIT, resolveLimit } from "@/utils/list";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted; required with --ci-token)", required: false },
  { name: "platform", description: "Platform (android|ios); prompts if omitted", required: false },
  { name: "app-version", description: "App version; prompts if omitted (required with --ci-token)", required: false },
  { name: "limit", description: "Max releases to show (default 15, max 30)", required: false },
  { name: "ci-token", description: "CI token (non-interactive; requires --project-id, --platform, --app-version)", required: false },
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
    // An app version only identifies releases together with a platform —
    // half-specifying is almost certainly a mistake, so fail fast.
    if (options.appVersion && !options.platform) {
      throw new Error("--platform is required when --app-version is provided");
    }

    const json = Boolean(options.json);
    const limit = resolveLimit(options.limit);
    const { appVersion, releases } = await this.fetchReleases(options, limit);

    if (json) {
      console.log(JSON.stringify(releases, null, 2));
      return;
    }

    ui.section(`releases · v${appVersion}`);
    if (!releases.length) {
      ui.hint("  No releases.");
      return;
    }

    printBoard(
      releases,
      [
        {
          header: "Version",
          render: (r) => {
            const v = `v${r.bundleVersion ?? "-"}`;
            return r === releases[0] ? theme.accent(v) : v;
          },
        },
        {
          header: "Released by",
          render: (r) => renderValue(r.author?.email ?? r.author?.fullName),
        },
        {
          header: "Rollout",
          render: (r) => {
            const pct =
              r.rolloutPercent != null
                ? Number(r.rolloutPercent)
                : r.isRolledBack
                  ? 0
                  : 100;
            return `${bar(pct)} ${String(pct).padStart(3)}%`;
          },
        },
        {
          header: "Status",
          render: (r) => {
            if (r.isRolledBack)
              return `${theme.danger(glyph.cross)} rolled back`;
            if (r.isPaused) return `${theme.warn(glyph.warn)} paused`;
            return `${theme.ok(glyph.tick)} live`;
          },
        },
        { header: "Release note", render: (r) => renderValue(r.releaseNote) },
        { header: "Release ID", render: (r) => renderValue(r.id) },
      ],
      { indent: ui.INDENT, spaced: true }
    );

    ui.blank();
    if (releases.length >= limit) {
      ui.hint(
        `  Showing the ${limit} most recent releases. Raise with --limit (max ${MAX_LIST_LIMIT}), or see all → ${CONSOLE_URL}`
      );
    } else {
      ui.hint(
        `  ${releases.length} release${releases.length === 1 ? "" : "s"} · v${appVersion}`
      );
    }
  }

  private async fetchReleases(
    options: Record<string, any>,
    limit: number
  ): Promise<{ appVersion: string; releases: any[] }> {
    if (options.ciToken) {
      const { projectId, platform, appVersion } = options;
      if (!projectId || !platform || !appVersion) {
        throw new Error(
          "--project-id, --platform and --app-version are required with --ci-token"
        );
      }
      const client = createCiApiClient(options.ciToken);
      const res = await progress("Fetching releases", () =>
        client.post<{ data: any[] }>(ENDPOINTS.PROMOTED.CI_LISTING, {
          projectId,
          platform,
          appVersion,
          limit,
        })
      );
      return { appVersion, releases: res?.data ?? [] };
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
        return { appVersion: "-", releases: [] };
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
      client.post<{ data: any[] }>(ENDPOINTS.PROMOTED.LISTING, {
        projectId,
        platform,
        appVersion,
        limit,
      })
    );
    return { appVersion, releases: res?.data ?? [] };
  }
}
