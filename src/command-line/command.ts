import { StallionApiClient } from '../apis/api-client';
import * as path from 'path';
import { CommandResult, ErrorCodes, failure, success } from './command-result';
import { tokenStore, TokenValueType } from '../token-store';
import { Endpoints } from '../apis/endpoints';
import { parseOptions } from './option-parser';
import { getOptionsDescription, getPositionalOptionsDescription } from './option-decorators';
import { out, prompt } from '../interaction-output';
import * as chalk from 'chalk';
import * as os from 'os';
const opener = require('opener');
import * as figlet from 'figlet';
import { retro } from 'gradient-string';
export interface CommandArgs {
    command: string[];
    commandPath: string;
    args: string[];
}
export default class Command {
    protected commandArgs: string[];
    protected command: string[];
    protected commandPath: string;
    protected clientFactory: StallionApiClient;
    protected shouldSkipAuthCheck: boolean;

    public token: string;

    constructor(args: CommandArgs) {
        const proto = Object.getPrototypeOf(this);
        const flags = getOptionsDescription(proto);
        const positionals = getPositionalOptionsDescription(proto);
        parseOptions(flags, positionals, this, args.args);
        this.commandPath = args.commandPath;
        this.command = args.command;
        this.commandArgs = args.args;
        this.shouldSkipAuthCheck = false;
    }

    protected skipAuthCheck() {
        this.shouldSkipAuthCheck = true;
    }

    async execute(): Promise<CommandResult> {
        this.clientFactory = new StallionApiClient();
        const banner = await this.showBanner();
        out.text(retro.multiline(banner));

        out.text(
            '\n' + chalk.whiteBright(`⚡ Welcome to the Stallion CLI ${chalk.bold(chalk.greenBright(`v${this.getVersion()}`))} ⚡ \n`)
        );
        const token = await this.getToken();
        if (token) {
            this.token = token;
            this.clientFactory.setHeaders({
                'x-access-token': token
            });
        }
        return this.runCheckIfLoggedIn();
    }

    protected getVersion(): string {
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson: any = require(packageJsonPath);
        return packageJson.version;
    }

    protected async runCheckIfLoggedIn(): Promise<CommandResult> {
        if (this.shouldSkipAuthCheck) {
            out.text(chalk.yellow.dim('Skipping auth check and falling back to CI token...'));
            return await this.runCommand(this.clientFactory);
        }
        if (this.token) {
            try {
                await this.clientFactory.get(Endpoints.PROFILE);
            } catch (e) {
                await this.openLoginFlow(true);
            }

            return await this.runCommand(this.clientFactory);
        }
        out.text(chalk.red(`${os.EOL}Command '${this.command.join(' ')}' requires a logged in user.`));
        out.text(chalk.magenta(`${os.EOL}Initializing login flow...`));
        return this.openLoginFlow(true);
    }

    protected async openLoginFlow(runNextCommand?: boolean): Promise<CommandResult> {
        out.text(`Opening your browser... ${os.EOL}• Visit ${Endpoints.CLI_LOGIN} and enter the code:`);
        opener(Endpoints.CLI_LOGIN);
        const token = await prompt('Access code from browser: ');
        const data: TokenValueType = { id: null, token: token };
        const status = await this.login(data);
        if (!status) return failure(ErrorCodes.Exception, 'something went wrong');
        out.text(chalk.green('\nToken saved, Login success!!'));
        if (runNextCommand) {
            return await this.runCommand(this.clientFactory);
        }
        return success();
    }

    private async showBanner(): Promise<string> {
        return new Promise((resolve, reject) => {
            figlet.text(
                'STALLION',
                {
                    font: 'Larry 3D',
                    horizontalLayout: 'default',
                    verticalLayout: 'default'
                },
                (err, data) => {
                    if (err) {
                        reject('Something went wrong with figlet...');
                        return;
                    }
                    resolve(data);
                }
            );
        });
    }

    protected async login(data: TokenValueType) {
        try {
            await tokenStore.set('ACCESS_TOKEN', data);
            this.token = data.token;
            return true;
        } catch (e) {
            return false;
        }
    }

    protected async runCommand(client: StallionApiClient): Promise<CommandResult> {
        throw new Error('Dev error, should be overridden!');
    }

    public async getToken(): Promise<string> {
        try {
            const token = await tokenStore.get('ACCESS_TOKEN');
            if (token) return token.accessToken.token;
            return '';
        } catch (e) {
            throw new Error(e.toString());
        }
    }
}
