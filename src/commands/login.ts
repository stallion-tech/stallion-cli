import Command, { CommandArgs } from '../command-line/command';
import { help } from '../command-line/option-decorators';
import { CommandResult, ErrorCodes, failure, success } from '../command-line/command-result';
import { out, prompt } from '../interaction-output';

const opener = require('opener');
import * as os from 'os';
import { Endpoints } from '../apis/endpoints';
import { tokenStore, TokenValueType } from '../token-store';
import * as chalk from 'chalk';
import { startAuthServer } from '../utils/login/server';


@help('Log in and save token')
export default class Login extends Command {
    constructor(args: CommandArgs) {
        super(args);
    }

    async runCheckIfLoggedIn(): Promise<CommandResult> {
        try {
            out.text(chalk.green(`Logging into Stallion via Console: ${Endpoints.CLI_LOGIN}`))
            await startAuthServer()
            return success();
        }catch(e) {
            out.text(chalk.red("cannot use autologin, some error occured. falling back to legacy login..."));
            out.text(`Opening your browser... ${os.EOL}• If the browser failes to open, Visit ${Endpoints.CLI_LOGIN} and enter the token here:`);
            opener(Endpoints.CLI_LOGIN);
            const token = await prompt('Access code from browser: ');
            const data: TokenValueType = { id: null, token: token };
            const status = await this.login(data);
            if (!status) return failure(ErrorCodes.Exception, 'something went wrong');
            out.text(chalk.green('\nToken saved, Login success!!'));
            return success();
        }
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
