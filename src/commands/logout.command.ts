import { BaseCommand } from "@/command-line/base.command";
import { Command } from "@decorators/command.decorator";

@Command({
  name: "logout",
  description: "Logout from Stallion CLI",
})
export class LogoutCommand extends BaseCommand {
  async execute(): Promise<void> {
    await this.logout();
  }
}
