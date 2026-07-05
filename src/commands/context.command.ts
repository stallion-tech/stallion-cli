import { BaseCommand } from "@command-line/base.command";
import { Command, CommandOption } from "@decorators/command.decorator";
import { clearContext, getContext } from "@/utils/context-store";
import { ui } from "@/ui";

const expectedOptions: CommandOption[] = [
  { name: "clear", description: "Clear the saved context", required: false },
  { name: "json", description: "Output raw JSON", required: false },
];

@Command({
  name: "context",
  description: "Show or clear the saved org/project context",
  alias: "ctx",
  options: expectedOptions,
})
export class ContextCommand extends BaseCommand {
  async execute(options: Record<string, any>): Promise<void> {
    if (options.clear) {
      clearContext();
      ui.status.ok("Context cleared.");
      return;
    }

    const ctx = getContext();

    if (options.json) {
      console.log(JSON.stringify(ctx ?? {}, null, 2));
      return;
    }

    if (!ctx.orgId && !ctx.projectId) {
      ui.status.info('No context set. Run "stallion use" to set one.');
      return;
    }

    ui.section("Context");
    ui.keyValue([
      ["Org", ctx.orgName],
      ["Org Id", ctx.orgId],
      ["Region", ctx.region],
      ["Project", ctx.projectName],
      ["Project Id", ctx.projectId],
    ]);
  }
}
