import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ENDPOINTS } from "@/api/endpoints";
import { createUserApiClient, resolveOrgContext } from "@/api/user-client";
import { printTable } from "@/utils/table";
import { ui } from "@/utils/ui";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

@Command({
  name: "list-projects",
  description: "List the projects in an organization",
  alias: "lp",
  options: expectedOptions,
})
@ValidateUser()
export class ListProjectsCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    const json = Boolean(options.json);
    const { orgId } = await resolveOrgContext(options.orgId);
    const client = await createUserApiClient();

    const res = await progress("Fetching projects", () =>
      client.post<{ data: any[] }>(ENDPOINTS.PROJECT.LIST, { orgId })
    );
    const projects = res?.data ?? [];

    if (!json) ui.section("Projects");
    printTable(
      projects,
      [
        { header: "NAME", value: (p) => p.name },
        { header: "PROJECT ID", value: (p) => p.id ?? p._id },
        { header: "ANDROID", value: (p) => Boolean(p.androidEnabled) },
        { header: "IOS", value: (p) => Boolean(p.iosEnabled) },
        { header: "PATCH", value: (p) => Boolean(p.isPatchEnabled) },
      ],
      { json, indent: ui.INDENT }
    );
  }
}
