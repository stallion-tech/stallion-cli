import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ENDPOINTS } from "@/api/endpoints";
import { createUserApiClient, resolveOrgContext } from "@/api/user-client";
import { ui } from "@/ui";
import { getContext } from "@/utils/context-store";

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

    if (json) {
      console.log(JSON.stringify(projects, null, 2));
      return;
    }

    const ctx = getContext();
    ui.section("projects");
    ui.numbered(
      projects.map((p: any) => {
        const platforms =
          [p.androidEnabled ? "android" : null, p.iosEnabled ? "ios" : null]
            .filter(Boolean)
            .join("·") || "—";
        return {
          label: p.name,
          meta: platforms,
          current: ctx.projectId === String(p.id ?? p._id),
        };
      }),
      { indent: ui.INDENT }
    );
    ui.blank();
    ui.hint(`  ${projects.length} project${projects.length === 1 ? "" : "s"}`);
  }
}
