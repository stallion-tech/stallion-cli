import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ui } from "@/utils/ui";
import { ENDPOINTS } from "@/api/endpoints";
import {
  createUserApiClient,
  resolveBucketId,
  resolveOrgContext,
  resolveProjectId,
} from "@/api/user-client";
import { Column, printTable } from "@/utils/table";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted)", required: false },
  { name: "bucket-id", description: "Bucket id (prompts if omitted)", required: false },
  { name: "platform", description: "Filter by platform (android|ios); enables paging", required: false },
  { name: "page-size", description: "Page size when filtering by platform (default 20)", required: false },
  { name: "page", description: "Page number when filtering by platform (default 1)", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

const bundleColumns: Column[] = [
  { header: "VERSION", value: (b) => b.version },
  { header: "PLATFORM", value: (b) => b.platform },
  { header: "PROMOTED", value: (b) => Boolean(b.isPromoted) },
  { header: "AUTHOR", value: (b) => b.author?.email ?? b.author?.fullName },
  { header: "SIZE", value: (b) => b.size },
  { header: "HASH", value: (b) => b.sha256Checksum },
  { header: "CREATED", value: (b) => b.createdAt },
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
    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, options.projectId);
    const bucketId = await resolveBucketId(region, projectId, options.bucketId);
    const client = await createUserApiClient(region);

    if (options.platform) {
      const pageSize = options.pageSize ? Number(options.pageSize) : 20;
      const pageNumber = options.page ? Number(options.page) : 1;
      const res = await progress("Fetching bundles", () =>
        client.post<{ data: any }>(ENDPOINTS.BUNDLE.ADVANCE_LISTING, {
          projectId,
          bucketId,
          platform: options.platform,
          pageSize,
          pageNumber,
        })
      );
      const payload = res?.data ?? {};
      if (json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
      }
      ui.section(`Bundles · ${options.platform}`);
      printTable(payload.paginatedData ?? [], bundleColumns, {
        indent: ui.INDENT,
      });
      const current = payload.currentPageNumber ?? pageNumber;
      const total = payload.totalPages;
      ui.hint(total ? `  Page ${current} of ${total}` : `  Page ${current}`);
      return;
    }

    const res = await progress("Fetching bundles", () =>
      client.post<{ data: any }>(ENDPOINTS.BUNDLE.LIST, { projectId, bucketId })
    );
    const payload = res?.data ?? {};
    if (json) {
      console.log(JSON.stringify(payload, null, 2));
      return;
    }
    const bundles = [
      ...(payload.androidBundles ?? []),
      ...(payload.iosBundles ?? []),
    ];
    ui.section("Bundles");
    printTable(bundles, bundleColumns, { indent: ui.INDENT });
  }
}
