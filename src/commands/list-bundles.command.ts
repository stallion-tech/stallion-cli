import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ui } from "@/ui";
import { ENDPOINTS } from "@/api/endpoints";
import {
  createCiApiClient,
  createUserApiClient,
  resolveBucketId,
  resolveOrgContext,
  resolveProjectId,
} from "@/api/user-client";
import { BoardColumn, printBoard, renderValue } from "@/ui";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted; required with --ci-token)", required: false },
  { name: "bucket-id", description: "Bucket id (prompts if omitted; required with --ci-token)", required: false },
  { name: "platform", description: "Filter by platform (android|ios)", required: false },
  { name: "ci-token", description: "CI token (non-interactive; requires --project-id and --bucket-id)", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

const bundleColumns: BoardColumn[] = [
  { header: "VERSION", render: (b) => renderValue(b.version) },
  { header: "PLATFORM", render: (b) => renderValue(b.platform) },
  { header: "PROMOTED", render: (b) => renderValue(Boolean(b.isPromoted)) },
  {
    header: "AUTHOR",
    render: (b) => renderValue(b.author?.email ?? b.author?.fullName),
  },
  { header: "SIZE", render: (b) => renderValue(b.size), align: "right" },
  { header: "HASH", render: (b) => renderValue(b.sha256Checksum) },
  { header: "CREATED", render: (b) => renderValue(b.createdAt) },
];

@Command({
  name: "list-bundles",
  description: "List the staging bundles in a bucket (includes the hash for release)",
  alias: "lbd",
  options: expectedOptions,
})
@ValidateUser()
export class ListBundlesCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    const json = Boolean(options.json);
    let bundles = await this.fetchBundles(options);

    if (options.platform) {
      const platform = String(options.platform).toLowerCase();
      bundles = bundles.filter(
        (b: any) => String(b.platform).toLowerCase() === platform
      );
    }

    if (json) {
      console.log(JSON.stringify(bundles, null, 2));
      return;
    }
    ui.section(options.platform ? `Bundles · ${options.platform}` : "Bundles");
    if (!bundles.length) {
      ui.hint("  No bundles.");
      return;
    }
    printBoard(bundles, bundleColumns, { indent: ui.INDENT, spaced: true });
  }

  private async fetchBundles(options: Record<string, any>): Promise<any[]> {
    if (options.ciToken) {
      if (!options.projectId || !options.bucketId) {
        throw new Error(
          "--project-id and --bucket-id are required with --ci-token"
        );
      }
      const client = createCiApiClient(options.ciToken);
      const res = await progress("Fetching bundles", () =>
        client.post<{ data: any[] }>(ENDPOINTS.BUNDLE.CI_LIST, {
          projectId: options.projectId,
          bucketId: options.bucketId,
        })
      );
      return res?.data ?? [];
    }

    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, options.projectId);
    const bucketId = await resolveBucketId(region, projectId, options.bucketId);
    const client = await createUserApiClient(region);
    const res = await progress("Fetching bundles", () =>
      client.post<{ data: any[] }>(ENDPOINTS.BUNDLE.LIST, {
        projectId,
        bucketId,
      })
    );
    return res?.data ?? [];
  }
}
