import { BaseCommand } from "@/command-line/base.command";
import { Command } from "@decorators/command.decorator";

@Command({
  name: "login",
  description: "Authenticate your account with Stallion CLI",
})
export class LoginCommand extends BaseCommand {
  async execute(): Promise<void> {
    await this.login();
  }
}
