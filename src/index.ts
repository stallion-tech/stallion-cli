#!/usr/bin/env node

import "reflect-metadata";
import { Command } from "commander";
import { CommandRegistry } from "@command-line/command.registry";
import {
  getCommands,
  getCommandMetadata,
  registeredCommands,
} from "@decorators/command.decorator";
import { showBanner, showWelcome } from "@/ui";
import { ui } from "@/ui";
import { getVersion } from "@utils/version";
import { normalizeOptions } from "@utils/normalize";
import { restoreStdout } from "@utils/stdout";
import { mapServerError } from "@utils/errors";
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
    ui.status.fail(`No class found for command "${name}"`);
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
    const opts = normalizeOptions(args.slice(0, args.length - 1));
    try {
      if (!opts.json) showBanner();

      await registry.executeCommand(name, opts);
    } catch (error) {
      // Undo any --json stdout silencing so the error object reaches real stdout.
      restoreStdout();
      const message = mapServerError(
        error instanceof Error ? error.message : "Unknown error"
      );
      if (opts.json) {
        process.stdout.write(JSON.stringify({ error: message }) + "\n");
      }
      ui.status.fail(message);
      process.exit(1);
    }
  });
});

program.on("command:*", (operands) => {
  ui.status.fail(`Command "${operands[0]}" not found`);
  ui.hint(`Run "stallion help" to see all available commands`);
  process.exit(1);
});

// Bare `stallion` (no subcommand) shows the hero welcome screen.
if (process.argv.slice(2).length === 0) {
  showWelcome();
  process.exit(0);
}

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
