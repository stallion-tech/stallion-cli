import * as path from 'path';
import * as fs from 'fs';

export interface ICommandFinder {
    (command: string[]): CommandFinderResult;
}

export interface CommandFinderResult {
    // was a command path found at all?
    found: boolean;

    // Is this a category rather than a command?
    isCategory: boolean;

    // File path to command to load
    commandPath: string;

    // Parts used to build command path
    commandParts: string[];

    // Args that were not used to build the path.
    unusedArgs: string[];
}

function commandNotFound(commandParts: string[]): CommandFinderResult {
    return {
        found: false,
        isCategory: false,
        commandPath: null,
        commandParts,
        unusedArgs: []
    };
}

function stripExtension(name: string): string {
    const extLen = path.extname(name).length;
    if (extLen > 0) {
        return name.slice(0, -extLen);
    }
    return name;
}

function commandFound(commandPath: string, commandParts: string[], unusedArgs: string[]): CommandFinderResult {
    return {
        found: true,
        isCategory: false,
        commandPath,
        commandParts: commandParts.map(stripExtension),
        unusedArgs
    };
}

function categoryFound(commandPath: string, commandParts: string[], unusedArgs: string[]): CommandFinderResult {
    return {
        found: true,
        isCategory: true,
        commandPath,
        commandParts,
        unusedArgs
    };
}

function splitCommandLine(command: string[]): [string[], string[]] {
    let partitionPoint = command.findIndex((cmd) => !isLegalCommandName(cmd));
    if (partitionPoint === -1) {
        partitionPoint = command.length;
    }
    return [command.slice(0, partitionPoint), command.slice(partitionPoint)];
}

function toFullPath(dispatchRoot: string, pathParts: string[]): string {
    return path.join.apply(null, [dispatchRoot].concat(pathParts));
}

function isLegalCommandName(commandName: string): boolean {
    return legalCommandRegex.test(commandName) && commandName !== 'lib';
}

const legalCommandRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function checkStats(dispatchRoot: string, pathParts: string[], check: { (stats: fs.Stats): boolean }): boolean {
    try {
        const filePath = toFullPath(dispatchRoot, pathParts);
        const stats = fs.statSync(filePath);
        return check(stats);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
        throw err;
    }
}

function isDir(dispatchRoot: string, pathParts: string[]): boolean {
    return checkStats(dispatchRoot, pathParts, (s) => s.isDirectory());
}

function normalizeCommandNames(command: string[]): string[] {
    return command.map((part) => part.toLowerCase());
}

export default class CommandFinder {
    dispatchRoot: string;
    constructor(dispatchRoot: string) {
        if (!isDir(dispatchRoot, [])) {
            throw new Error('Invalid dispatch root');
        }
        this.dispatchRoot = dispatchRoot;
    }

    private findFile(commandDir: string[], commandName: string, commandLineArgs: string[]): [string, string[], boolean] {
        if (commandDir.length > 0 && !isDir(this.dispatchRoot, commandDir)) {
            return null;
        }
        const fullCommand = commandDir.concat([commandName]);
        if (checkStats(this.dispatchRoot, fullCommand, (stats) => stats.isDirectory())) {
            return [toFullPath(this.dispatchRoot, fullCommand), fullCommand, false];
        }

        // Have to look through the directory so that we
        // can ignore any potential file extensions.
        const files = fs.readdirSync(toFullPath(this.dispatchRoot, commandDir));

        const matching = files.filter((file) => path.parse(file).name === commandName);

        if (matching.length > 1) {
            throw new Error(`Ambiguous match for command '${commandLineArgs.join(' ')}'`);
        }

        if (matching.length === 0) {
            return null;
        }

        const commandParts = commandDir.concat([matching[0]]);
        const commandPath = toFullPath(this.dispatchRoot, commandDir.concat([matching[0]]));
        return [commandPath, commandParts, true];
    }

    find(commandLineArgs: string[]): CommandFinderResult {
        const [command, args] = splitCommandLine(commandLineArgs);
        if (command.length === 0) {
            return categoryFound(toFullPath(this.dispatchRoot, []), [], commandLineArgs);
        }

        while (command.length > 0) {
            const commandName = normalizeCommandNames(command.slice(-1))[0];
            const commandDir = normalizeCommandNames(command.slice(0, -1));

            const result = this.findFile(commandDir, commandName, commandLineArgs);
            if (result !== null) {
                if (result[2]) {
                    return commandFound(result[0], result[1], args);
                }
                return categoryFound(result[0], result[1], args);
            }

            // Not found, push the last arg in command name into unused pile.
            args.unshift(command.pop());
        }

        return commandNotFound(commandLineArgs);
    }
}
