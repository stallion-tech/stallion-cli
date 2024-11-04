import Command, { CommandArgs } from '../command-line/command';
import { help } from '../command-line/option-decorators';
import { CommandResult } from '../command-line/command-result';


@help('Log in and save token')
export default class Login extends Command {
    constructor(args: CommandArgs) {
        super(args);
    }

    async runCheckIfLoggedIn(): Promise<CommandResult> {
       return this.openLoginFlow()
    }
}
