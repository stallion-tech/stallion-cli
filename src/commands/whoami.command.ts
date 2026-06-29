import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { ValidateUser } from "@decorators/validate-user.decorator";
import { progress } from "@/utils/progress";
import { ENDPOINTS } from "@/api/endpoints";
import { createUserApiClient, fetchOrgs } from "@/api/user-client";
import { printTable } from "@/utils/table";
import { ui } from "@/utils/ui";

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

    ui.section("User");
    ui.keyValue([
      ["Name", profile?.fullName],
      ["Email", profile?.email],
      ["Id", profile?._id],
    ]);

    ui.section("Organizations");
    printTable(
      orgs,
      [
        { header: "NAME", value: (o) => o.name },
        { header: "ORG ID", value: (o) => o.orgId },
        { header: "REGION", value: (o) => o.region },
        { header: "ACCESS", value: (o) => o.access },
      ],
      { indent: ui.INDENT }
    );
  }
}
