import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ENDPOINTS } from "@/api/endpoints";
import { createUserApiClient, fetchOrgs } from "@/api/user-client";
import { ui } from "@/ui";
import { getContext } from "@/utils/context-store";

const expectedOptions: CommandOption[] = [
  { name: "json", description: "Output raw JSON", required: false },
];

@Command({
  name: "whoami",
  description: "Show the logged-in user and their organizations",
  alias: "me",
  options: expectedOptions,
})
@ValidateUser()
export class WhoamiCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    const json = Boolean(options.json);
    const client = await createUserApiClient();

    const { profile, orgs } = await progress("Fetching profile", async () => {
      const profileRes = await client.get<{ data: any }>(ENDPOINTS.USER.VERIFY);
      const orgsList = await fetchOrgs(client);
      return { profile: profileRes?.data, orgs: orgsList };
    });

    if (json) {
      console.log(JSON.stringify({ profile, orgs }, null, 2));
      return;
    }

    const ctx = getContext();
    ui.pipeline([
      { status: "done", label: "session", value: "authorized" },
      { status: "done", label: "user", value: profile?.fullName },
      { status: "done", label: "email", value: profile?.email },
      {
        status: ctx.orgId ? "active" : "pending",
        label: "context",
        value:
          ctx.projectName || ctx.orgName
            ? `${ctx.projectName ?? "-"} · ${ctx.orgName ?? "-"}`
            : "not set",
      },
    ]);

    ui.section("organizations");
    ui.numbered(
      orgs.map((o) => ({
        label: o.name,
        meta: `${o.region} · ${o.access}`,
        current: ctx.orgId === o.orgId,
      })),
      { indent: ui.INDENT }
    );
  }
}
