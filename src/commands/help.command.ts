import { BaseCommand } from "@command-line/base.command";
import { Command, getCommands } from "@decorators/command.decorator";
import { printTable } from "@/ui";
import { ui } from "@/ui";

@Command({
  name: "help",
  description: "Show help",
  alias: "h",
})
export class HelpCommand extends BaseCommand {
  async execute(): Promise<void> {
    const commands = [...getCommands().entries()].map(([name, options]) => ({
      name,
      alias: options.alias ?? "-",
      description: options.description,
    }));

    ui.section("Commands");
    printTable(
      commands,
      [
        { header: "COMMAND", value: (c) => c.name },
        { header: "ALIAS", value: (c) => c.alias },
        { header: "DESCRIPTION", value: (c) => c.description },
      ],
      { indent: ui.INDENT }
    );

    ui.blank();
    ui.hint('  Run "stallion <command> --help" for command-specific options.');
  }
}
