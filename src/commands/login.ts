import Command, { CommandArgs } from '../command-line/command';
import { help } from '../command-line/option-decorators';
import { CommandResult, ErrorCodes, failure, success } from '../command-line/command-result';
import { out, prompt } from '../interaction-output';

const opener = require('opener');
import * as os from 'os';
import { Endpoints } from '../apis/endpoints';
import { tokenStore, TokenValueType } from '../token-store';
import * as chalk from 'chalk';

@help('Log in and save token')
export default class Login extends Command {
    constructor(args: CommandArgs) {
        super(args);
    }

    async runCheckIfLoggedIn(): Promise<CommandResult> {
        out.text(`Opening your browser... ${os.EOL}• Visit ${Endpoints.CLI_LOGIN} and enter the code:`);
        opener(Endpoints.CLI_LOGIN);
        const token = await prompt('Access code from browser: ');
        const data: TokenValueType = { id: null, token: token };
        const status = await this.login(data);
        if (!status) return failure(ErrorCodes.Exception, 'something went wrong');
        out.text(chalk.green('\nToken saved, Login success!!'));
        return success();
    }

    private async login(token: TokenValueType) {
        try {
            await tokenStore.set('ACCESS_TOKEN', token);
            return true;
        } catch (e) {
            return false;
        }
    }
}
