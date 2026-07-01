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

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted; required with --ci-token)", required: false },
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
    const buckets = await this.fetchBuckets(options);

    if (json) {
      console.log(JSON.stringify(buckets, null, 2));
      return;
    }
    ui.section("Buckets");
    if (!buckets.length) {
      ui.hint("  No buckets.");
      return;
    }
    printBoard(
      buckets,
      [
        { header: "NAME", render: (b) => renderValue(b.name) },
        { header: "BUCKET ID", render: (b) => renderValue(b.id ?? b._id) },
        { header: "UPDATED", render: (b) => renderValue(b.updatedAt) },
      ],
      { indent: ui.INDENT, spaced: true }
    );
  }

  private async fetchBuckets(options: Record<string, any>): Promise<any[]> {
    if (options.ciToken) {
      if (!options.projectId) {
        throw new Error("--project-id is required with --ci-token");
      }
      const client = createCiApiClient(options.ciToken);
      const res = await progress("Fetching buckets", () =>
        client.post<{ data: any[] }>(ENDPOINTS.BUCKET.CI_LIST, {
          projectId: options.projectId,
        })
      );
      return res?.data ?? [];
    }

    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, options.projectId);
    const client = await createUserApiClient(region);
    const res = await progress("Fetching buckets", () =>
      client.post<{ data: any[] }>(ENDPOINTS.BUCKET.LIST, { projectId })
    );
    return res?.data ?? [];
  }
}
