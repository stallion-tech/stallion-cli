import { BaseCommand } from "@command-line/base.command";
import { Command, getCommands } from "@decorators/command.decorator";
import { logger } from "@utils/logger";

@Command({
  name: "help",
  description: "Show help",
  alias: "h",
})
export class HelpCommand extends BaseCommand {
  async execute(): Promise<void> {
    const commands = getCommands();

    logger.title("\nAvailable Commands");
    logger.subtitle("==================\n");

    commands.forEach((options, name) => {
      logger.command(name, options.description, options.alias);
    });
  }
}
