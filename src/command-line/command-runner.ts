import CommandLoader from './command-loader';
import { commandNotFound, CommandResult, exception, illegal, isCommandFailedResult } from './command-result';
import Command from './command';
import CommandFinder from './command-finder';

export class CommandRunner {
    private readonly loader: CommandLoader;

    constructor(root: string) {
        this.loader = new CommandLoader(new CommandFinder(root));
    }

    async run(command: string[]): Promise<CommandResult> {
        let factory: typeof Command;
        let newCommand: string[];
        let args: string[];
        let commandPath: string;
        try {
            const result = this.loader.load(command);
            if (result === null) {
                return commandNotFound(command.join(' '));
            }
            ({ commandFactory: factory, commandParts: newCommand, args, commandPath } = result);
        } catch (e) {
            console.log(e);
            return illegal(command.join(' '));
        }

        try {
            const commandObj = new factory({ command: newCommand, args, commandPath });
            return await commandObj.execute();
        } catch (ex) {
            if (isCommandFailedResult(ex)) {
                return ex;
            }

            return exception(command.join(' '), ex);
        }
    }
}
