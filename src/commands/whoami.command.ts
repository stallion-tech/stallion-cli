import { BaseCommand } from "@command-line/base.command";
import { Command } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ENDPOINTS } from "@/api/endpoints";
import { createUserApiClient, fetchOrgs } from "@/api/user-client";
import { ui } from "@/ui";
import { getContext } from "@/utils/context-store";
import { UserProfile } from "@/api/types";

@Command({
  name: "whoami",
  description: "Show the logged-in user and their organizations",
  alias: "me",
})
@ValidateUser()
export class WhoamiCommand extends BaseCommand {
  async execute(): Promise<void> {
    const client = await createUserApiClient();

    const { profile, orgs } = await progress("Fetching profile", async () => {
      const profileRes = await client.get<{ data: UserProfile }>(
        ENDPOINTS.USER.VERIFY
      );
      const orgsList = await fetchOrgs(client);
      return { profile: profileRes?.data, orgs: orgsList };
    });

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
