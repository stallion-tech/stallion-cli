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
import { CONSOLE_URL, MAX_LIST_LIMIT, resolveLimit } from "@/utils/list";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted; required with --ci-token)", required: false },
  { name: "bucket", description: "Bucket name (prompts if omitted; --bucket or --bucket-id required with --ci-token)", required: false },
  { name: "bucket-id", description: "Bucket id (alternative to --bucket)", required: false },
  { name: "platform", description: "Filter by platform (android|ios)", required: false },
  { name: "limit", description: "Max bundles to show (default 15, max 30)", required: false },
  { name: "ci-token", description: "CI token (non-interactive; requires --project-id and --bucket/--bucket-id)", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

const bundleColumns: BoardColumn[] = [
  { header: "VERSION", render: (b) => renderValue(b.version) },
  { header: "PLATFORM", render: (b) => renderValue(b.platform) },
  { header: "PROMOTED", render: (b) => renderValue(Boolean(b.isPromoted)) },
  { header: "CREATED", render: (b) => renderValue(b.createdAt) },
  {
    header: "AUTHOR",
    render: (b) => renderValue(b.author?.fullName ?? b.author?.email),
  },
  // Short hash for quick row identification; the full (copy-pasteable) hash is
  // printed below the table since 64 chars is too wide for a scannable column.
  {
    header: "HASH",
    render: (b) => {
      const h = b.sha256Checksum;
      return renderValue(h ? `${String(h).slice(0, 10)}…` : h);
    },
  },
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
    const limit = resolveLimit(options.limit);
    const bundles = await this.fetchBundles(options, limit);

    if (json) {
      console.log(JSON.stringify(bundles, null, 2));
      return;
    }

    const label = options.platform
      ? String(options.platform).toLowerCase()
      : null;

    ui.section(label ? `Bundles · ${label}` : "Bundles");
    if (!bundles.length) {
      ui.hint(label ? `  No ${label} bundles.` : "  No bundles.");
      return;
    }

    printBoard(bundles, bundleColumns, { indent: ui.INDENT, spaced: true });

    // Full hashes as plain, copy-pasteable lines (for `release-bundle --hash`),
    // keyed by version so they map back to the table above.
    const withHash = bundles.filter((b: any) => b.sha256Checksum);
    if (withHash.length) {
      ui.section("Hashes");
      ui.keyValue(withHash.map((b: any) => [`v${b.version}`, b.sha256Checksum]));
    }

    // The server returns at most `limit`; if we got exactly that many there
    // may be more (narrow with --platform, raise --limit, or use the console).
    ui.blank();
    if (bundles.length >= limit) {
      ui.hint(
        `  Showing the ${limit} most recent bundles. Narrow with --platform, raise with --limit (max ${MAX_LIST_LIMIT}), or see all → ${CONSOLE_URL}`
      );
    } else {
      ui.hint(`  ${bundles.length} bundle${bundles.length === 1 ? "" : "s"}`);
    }
  }

  private async fetchBundles(
    options: Record<string, any>,
    limit: number
  ): Promise<any[]> {
    if (options.ciToken) {
      if (!options.projectId || (!options.bucketId && !options.bucket)) {
        throw new Error(
          "--project-id and one of --bucket / --bucket-id are required with --ci-token"
        );
      }
      const client = createCiApiClient(options.ciToken);
      // Send name or id straight through — the API resolves the name against
      // the project and authorizes it.
      const res = await progress("Fetching bundles", () =>
        client.post<{ data: any[] }>(ENDPOINTS.BUNDLE.CI_LIST, {
          projectId: options.projectId,
          bucketId: options.bucketId,
          bucketName: options.bucket,
          platform: options.platform,
          limit,
        })
      );
      return res?.data ?? [];
    }

    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, options.projectId);
    // Explicit --bucket / --bucket-id go straight to the server (it resolves +
    // authorizes the name); only prompt with the picker when neither is given.
    let bucketId = options.bucketId as string | undefined;
    const bucketName = options.bucket as string | undefined;
    if (!bucketId && !bucketName) {
      bucketId = await resolveBucketId(region, projectId);
    }
    const client = await createUserApiClient(region);
    const res = await progress("Fetching bundles", () =>
      client.post<{ data: any[] }>(ENDPOINTS.BUNDLE.LIST, {
        projectId,
        bucketId,
        bucketName,
        platform: options.platform,
        limit,
      })
    );
    return res?.data ?? [];
  }
}
