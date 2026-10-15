import { BaseCommand } from "@/command-line/base.command";
import { requiresValidation } from "@/decorators/validate-user.decorator";
import { ui } from "@/ui";

// Command Imports
import "@/commands/help.command";
import "@/commands/publish-bundle.command";
import "@/commands/login.command";
import "@/commands/logout.command";
import "@/commands/generate-key-pair.command";
import "@/commands/release-bundle.command";
import "@/commands/update-release.command";
import "@/commands/whoami.command";
import "@/commands/list-projects.command";
import "@/commands/list-buckets.command";
import "@/commands/list-bundles.command";
import "@/commands/list-releases.command";
import "@/commands/list-patches.command";
import "@/commands/release-info.command";
import "@/commands/use.command";
import "@/commands/context.command";

export class CommandRegistry {
  private commands: Map<string, BaseCommand> = new Map();

  public registerCommand(name: string, command: BaseCommand): void {
    this.commands.set(name, command);
  }

  public getCommand(name: string): BaseCommand | undefined {
    return this.commands.get(name);
  }

  public async validateUser(command: BaseCommand) {
    try {
      await command.verifyLogin();
    } catch (error) {
      try {
        await command.login();
      } catch (error) {
        throw new Error("Failed to login. Please try again.");
      }
    }
  }

  private shouldSkipValidationForCIToken(command: BaseCommand, options: Record<string, any>): boolean {
    const commandName = command.constructor.name;
    const supportsCIToken = [
      'PublishBundleCommand',
      'ReleaseBundleCommand',
      'UpdateReleaseCommand',
      'ListBucketsCommand',
      'ListBundlesCommand',
      'ListReleasesCommand',
      'ListPatchesCommand',
      'ReleaseInfoCommand',
    ];
    return supportsCIToken.includes(commandName) && Boolean(options.ciToken);
  }

  public async executeCommand(
    name: string,
    options: Record<string, any>
  ): Promise<void> {
    const command = this.getCommand(name);
    if (!command) {
      ui.status.fail(`Command not found "${name}"`);
      ui.hint('Use "stallion help" to list all available commands');
      return;
    }

    // Skip the breadcrumb for help (own banner) and JSON mode (clean stdout).
    if (name !== "help" && !options.json) {
      ui.header(name);
    }

    const needsValidation = requiresValidation(command.constructor);
    const skipForCIToken = this.shouldSkipValidationForCIToken(command, options);
    if (needsValidation && !skipForCIToken) {
      try {
        await this.validateUser(command);
      } catch {
        ui.status.fail("Authentication failed.");
        return;
      }
    }

    await command.execute(options);
  }
}