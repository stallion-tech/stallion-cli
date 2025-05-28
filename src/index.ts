#!/usr/bin/env node

import "reflect-metadata";
import { Command } from "commander";
import { CommandRegistry } from "@command-line/command.registry";
import {
  getCommands,
  getCommandMetadata,
  registeredCommands,
} from "@decorators/command.decorator";
import { showBanner } from "@utils/banner";
import { logger } from "@utils/logger";
import { getVersion } from "@utils/version";
import { normalizeOptions } from "@utils/normalize";
import { rimraf } from "rimraf";
import fs from "fs";

const program = new Command();

program
  .name("stallion")
  .description("CLI tool for managing your projects")
  .version(getVersion());

const registry = new CommandRegistry();

getCommands().forEach((options, name) => {
  // Find the matching class
  const commandClass = [...registeredCommands].find((cls) => {
    const meta = getCommandMetadata(cls);
    return meta?.name === name;
  });

  if (!commandClass) {
    logger.error(`No class found for command "${name}"`);
    return;
  }

  const instance = new commandClass();
  registry.registerCommand(name, instance);
  const command = program.command(name).description(options.description);

  if (options.alias) {
    command.alias(options.alias);
  }

  (options.options || []).forEach((opt) => {
    const flag = opt.required
      ? `--${opt.name} <${opt.name}>`
      : `--${opt.name} [${opt.name}]`;
    command.option(flag, opt.description, opt.defaultValue);
  });

  command.action(async (...args) => {
    try {
      await showBanner();

      await registry.executeCommand(
        name,
        normalizeOptions(args.slice(0, args.length - 1))
      );
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Unknown error");
      process.exit(1);
    }
  });
});

program.on("command:*", (operands) => {
  logger.error(`Command "${operands[0]}" not found`);
  logger.info(`Run "stallion help" to see all available commands`);
  process.exit(0);
});

program.parse();

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) =>
  process.on(signal, () => {
    process.exit(1);
  })
);

process.on("exit", () => {
  fs.readdirSync("./")
    .filter((f) => f.includes("stallion-temp"))
    .map((f) => rimraf.sync(f));
});
