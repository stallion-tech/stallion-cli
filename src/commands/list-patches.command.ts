import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ui } from "@/ui";
import { ENDPOINTS } from "@/api/endpoints";
import {
  createCiApiClient,
  createUserApiClient,
  resolveOrgContext,
  resolveProjectId,
} from "@/api/user-client";
import { BoardColumn, printBoard, renderValue } from "@/ui";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted; required with --ci-token)", required: false },
  { name: "hash", description: "Release bundle hash (from list-bundles / list-releases)", required: true },
  { name: "ci-token", description: "CI token (non-interactive; requires --project-id)", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

const fmtSize = (bytes: unknown): string | null => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const fmtRelease = (r: any): string | null =>
  r ? `v${r.bundleVersion ?? "-"} · ${r.appVersion ?? "-"}` : null;

const patchColumns: BoardColumn[] = [
  { header: "From", render: (p) => renderValue(fmtRelease(p.fromProdBundle)) },
  { header: "To", render: (p) => renderValue(fmtRelease(p.toProdBundle)) },
  { header: "DiffSize", render: (p) => renderValue(fmtSize(p.bundleDiffSize)) },
  { header: "PatchSize", render: (p) => renderValue(fmtSize(p.totalPatchSize)) },
];

@Command({
  name: "list-patches",
  description: "List the delta patches generated toward a release bundle",
  alias: "lpt",
  options: expectedOptions,
})
@ValidateUser()
export class ListPatchesCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    const json = Boolean(options.json);
    const hash = typeof options.hash === "string" ? options.hash.trim() : "";
    if (!hash) {
      throw new Error(
        "--hash is required (copy it from list-bundles or list-releases)"
      );
    }

    const patches = await this.fetchPatches(options, hash);

    if (json) {
      console.log(JSON.stringify(patches, null, 2));
      return;
    }

    ui.section("Patches");
    if (!patches.length) {
      ui.hint("  No patches for this release yet.");
      ui.hint("  Patches are generated when a newer release can delta-update from this bundle.");
      return;
    }

    printBoard(patches, patchColumns, { indent: ui.INDENT, spaced: true });
    ui.blank();
    ui.hint(`  ${patches.length} patch${patches.length === 1 ? "" : "es"} · ${hash.slice(0, 12)}…`);
  }

  private async fetchPatches(
    options: Record<string, any>,
    releaseHash: string
  ): Promise<any[]> {
    if (options.ciToken) {
      if (!options.projectId) {
        throw new Error("--project-id is required with --ci-token");
      }
      const client = createCiApiClient(options.ciToken);
      const res = await progress("Fetching patches", () =>
        client.post<{ data: { patchInfo: any[] } }>(ENDPOINTS.PATCH.CI_INFO, {
          projectId: options.projectId,
          releaseHash,
        })
      );
      return res?.data?.patchInfo ?? [];
    }

    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, region, options.projectId);
    const client = await createUserApiClient(region);
    const res = await progress("Fetching patches", () =>
      client.post<{ data: { patchInfo: any[] } }>(ENDPOINTS.PATCH.INFO, {
        projectId,
        releaseHash,
      })
    );
    return res?.data?.patchInfo ?? [];
  }
}
