import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ui } from "@/ui";
import { promptSelect } from "@/utils/prompt";
import { ENDPOINTS } from "@/api/endpoints";
import { createUserApiClient, fetchOrgs } from "@/api/user-client";
import { setContext } from "@/utils/context-store";

const expectedOptions: CommandOption[] = [
  { name: "org-id", description: "Organization id (prompts if omitted)", required: false },
  { name: "project-id", description: "Project id (prompts if omitted)", required: false },
];

@Command({
  name: "use",
  description: "Set the default org and project used by other commands",
  alias: "u",
  options: expectedOptions,
})
@ValidateUser()
export class UseCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    const client = await createUserApiClient();
    const orgs = await progress("Fetching organizations", () =>
      fetchOrgs(client)
    );
    if (!orgs.length) {
      ui.status.fail("No organizations found for this account.");
      return;
    }

    let orgId = options.orgId as string | undefined;
    if (orgId && !orgs.some((o) => o.orgId === orgId)) {
      ui.status.fail(`Organization "${orgId}" not found for this account.`);
      return;
    }
    if (!orgId) {
      orgId = await promptSelect<string>(
        "Select an organization",
        orgs.map((o) => ({
          name: o.name,
          value: o.orgId,
          description: `region: ${o.region}   id: ${o.orgId}`,
        }))
      );
    }
    const org = orgs.find((o) => o.orgId === orgId);
    const region = org?.region ?? "ap";

    // Projects live on the org's regional API — list them there, not on the
    // global API the org listing came from.
    const regionalClient = await createUserApiClient(region);
    const projRes = await progress("Fetching projects", () =>
      regionalClient.post<{ data: any[] }>(ENDPOINTS.PROJECT.LIST, { orgId })
    );
    const projects = projRes?.data ?? [];
    if (!projects.length) {
      ui.status.fail("No projects found in this organization.");
      return;
    }

    let projectId = options.projectId as string | undefined;
    if (
      projectId &&
      !projects.some((p: any) => String(p.id ?? p._id) === projectId)
    ) {
      ui.status.fail(`Project "${projectId}" not found in this organization.`);
      return;
    }
    if (!projectId) {
      projectId = await promptSelect<string>(
        "Select a project",
        projects.map((p: any) => {
          const id = String(p.id ?? p._id);
          const platforms = [
            p.androidEnabled ? "android" : null,
            p.iosEnabled ? "ios" : null,
          ]
            .filter(Boolean)
            .join("/");
          return {
            name: p.name,
            value: id,
            description: `${platforms || "no platforms"}   id: ${id}`,
          };
        })
      );
    }
    const project = projects.find(
      (p: any) => String(p.id ?? p._id) === projectId
    );

    setContext({
      orgId,
      orgName: org?.name,
      region,
      projectId,
      projectName: project?.name,
    });

    ui.status.ok(
      `Context set: ${org?.name ?? orgId} / ${project?.name ?? projectId} (${region})`
    );
    ui.hint('Commands now default to this context. Override with flags, or change it with "stallion use".');
  }
}
