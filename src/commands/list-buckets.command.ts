import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ENDPOINTS } from "@/api/endpoints";
import {
  createUserApiClient,
  resolveOrgContext,
  resolveProjectId,
} from "@/api/user-client";
import { printTable } from "@/utils/table";
import { ui } from "@/utils/ui";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted)", required: false },
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
    const { orgId, region } = await resolveOrgContext(options.orgId);
    const projectId = await resolveProjectId(orgId, options.projectId);
    const client = await createUserApiClient(region);

    const res = await progress("Fetching buckets", () =>
      client.post<{ data: any[] }>(ENDPOINTS.BUCKET.LIST, { projectId })
    );
    const buckets = res?.data ?? [];

    if (!json) ui.section("Buckets");
    printTable(
      buckets,
      [
        { header: "NAME", value: (b) => b.name },
        { header: "BUCKET ID", value: (b) => b.id ?? b._id },
        { header: "UPDATED", value: (b) => b.updatedAt },
      ],
      { json, indent: ui.INDENT }
    );
  }
}
