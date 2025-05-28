const COMMAND_METADATA_KEY = Symbol("command");

export interface CommandOption {
  name: string;
  description: string;
  required?: boolean;
  defaultValue?: string;
}
export interface CommandOptions {
  name: string;
  description: string;
  alias?: string;
  options?: CommandOption[];
}

export const registeredCommands: any[] = [];

export type CommandDecorator = (options: CommandOptions) => ClassDecorator;

export const Command: CommandDecorator = (options: CommandOptions) => {
  return function (target: any) {
    Reflect.defineMetadata(COMMAND_METADATA_KEY, options, target);
    registeredCommands.push(target);
    return target;
  };
};

export function getCommandMetadata(target: any): CommandOptions | undefined {
  return Reflect.getMetadata(COMMAND_METADATA_KEY, target);
}

export function getCommands(): Map<string, CommandOptions> {
  const commands = new Map<string, CommandOptions>();

  registeredCommands.forEach((commandClass: any) => {
    const metadata = getCommandMetadata(commandClass);
    if (metadata) {
      commands.set(metadata.name, metadata);
    }
  });

  return commands;
}
