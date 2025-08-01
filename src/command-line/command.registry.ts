import { BaseCommand } from "@/command-line/base.command";
import { requiresValidation } from "@/decorators/validate-user.decorator";
import { logger } from "@/utils/logger";

// Command Imports
import "@/commands/help.command";
import "@/commands/publish-bundle.command";
import "@/commands/login.command";
import "@/commands/logout.command";
import "@/commands/generate-key-pair.command";
import "@/commands/release-bundle.command";
import "@/commands/update-release.command";

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
    const supportsCIToken = ['PublishBundleCommand', 'ReleaseBundleCommand', 'UpdateReleaseCommand'];
    return supportsCIToken.includes(commandName) && Boolean(options.ciToken);
  }

  public async executeCommand(
    name: string,
    options: Record<string, any>
  ): Promise<void> {
    const command = this.getCommand(name);
    if (!command) {
      logger.error(`Command not found "${name}"`);
      logger.info('Use "stallion help" to list all available commands');
      return;
    }

    const needsValidation = requiresValidation(command.constructor);
    const skipForCIToken = this.shouldSkipValidationForCIToken(command, options);
    if (needsValidation && !skipForCIToken) {
      try {
        logger.info("Validating user");
        await this.validateUser(command);
      } catch {
        logger.info("User validation failed");
        return;
      }
    } else if (needsValidation && skipForCIToken) {
      logger.info("CI token provided, skipping user validation");
    }

    await command.execute(options);
  }
}