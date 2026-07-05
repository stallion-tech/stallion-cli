import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ENDPOINTS } from "@/api/endpoints";
import {
  createCiApiClient,
  createUserApiClient,
  resolveOrgContext,
  resolveProjectId,
} from "@/api/user-client";
import { ui } from "@/ui";
import { printBoard, renderValue } from "@/ui";
import { CONSOLE_URL, MAX_LIST_LIMIT, resolveLimit } from "@/utils/list";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted; required with --ci-token)", required: false },
  { name: "name", description: "Filter buckets by name (case-insensitive substring)", required: false },
  { name: "limit", description: "Max buckets to show (default 15, max 30)", required: false },
  { name: "ci-token", description: "CI token (non-interactive; requires --project-id)", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

@Command({
  name: "list-buckets",
  description: "List the buckets in a project",
  alias: "lb",
  options: expectedOptions,
})
@ValidateUser()
export class ListBucketsCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    const json = Boolean(options.json);
    const limit = resolveLimit(options.limit);
    const buckets = await this.fetchBuckets(options, limit);

    if (json) {
      console.log(JSON.stringify(buckets, null, 2));
      return;
    }

    ui.section("Buckets");
    if (!buckets.length) {
      ui.hint(
        options.name ? `  No buckets match "${options.name}".` : "  No buckets."
      );
      return;
    }
    printBoard(
      buckets,
      [
        { header: "NAME", render: (b) => renderValue(b.name) },
        { header: "UPDATED", render: (b) => renderValue(b.updatedAt) },
      ],
      { indent: ui.INDENT, spaced: true }
    );

    // The server returns at most `limit`; if we got exactly that many there
    // may be more (narrow with --name, raise --limit, or use the console).
    ui.blank();
    if (buckets.length >= limit) {
      ui.hint(
        `  Showing the ${limit} most recently updated. Narrow with --name, raise with --limit (max ${MAX_LIST_LIMIT}), or see all → ${CONSOLE_URL}`
      );
    } else {
      ui.hint(`  ${buckets.length} bucket${buckets.length === 1 ? "" : "s"}`);
    }
  }

  private async fetchBuckets(
    options: Record<string, any>,
    limit: number
  ): Promise<any[]> {
    if (options.ciToken) {
      if (!options.projectId) {
        throw new Error("--project-id is required with --ci-token");
      }
      const client = createCiApiClient(options.ciToken);
      const res = await progress("Fetching buckets", () =>
        client.post<{ data: any[] }>(ENDPOINTS.BUCKET.CI_LIST, {
          projectId: options.projectId,
          name: options.name,
          limit,
        })
      );
      return res?.data ?? [];
    }

    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, region, options.projectId);
    const client = await createUserApiClient(region);
    const res = await progress("Fetching buckets", () =>
      client.post<{ data: any[] }>(ENDPOINTS.BUCKET.LIST, {
        projectId,
        name: options.name,
        limit,
      })
    );
    return res?.data ?? [];
  }
}
