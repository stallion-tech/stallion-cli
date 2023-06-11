import Command from './command';
import CommandFinder from './command-finder';
import { CategoryCommand } from './category-command';

export interface ICommandLoader {
    (command: string[]): LoaderResult;
}

export interface LoaderResult {
    commandFactory: typeof Command;
    commandParts: string[];
    args: string[];
    commandPath: string;
}

export default class CommandLoader {
    commandFinder: CommandFinder;
    constructor(commandFinder: CommandFinder) {
        this.commandFinder = commandFinder;
    }

    load(command: string[]): LoaderResult {
        const findResult = this.commandFinder.find(command);
        if (!findResult.found) {
            return null;
        }
        let commandFactory: typeof Command;
        const commandParts: string[] = findResult.commandParts;
        const args: string[] = findResult.unusedArgs;
        const commandPath = findResult.commandPath;

        if (!findResult.isCategory) {
            // Turn off lint warning - string is sufficiently validated
            // eslint-disable-next-line security/detect-non-literal-require
            commandFactory = require(findResult.commandPath).default as typeof Command;
        } else {
            commandFactory = CategoryCommand;
        }
        return { commandFactory, commandParts, args, commandPath };
    }
}
