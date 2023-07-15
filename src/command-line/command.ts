import { StallionApiClient } from '../apis/api-client';
import * as path from 'path';
import { CommandResult, ErrorCodes, failure, notLoggedIn } from './command-result';
import { scriptName } from '../constants';
import { tokenStore } from '../token-store';
import { Endpoints } from '../apis/endpoints';
import { parseOptions } from './option-parser';
import { getOptionsDescription, getPositionalOptionsDescription } from './option-decorators';

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

    public token: string;

    constructor(args: CommandArgs) {
        const proto = Object.getPrototypeOf(this);
        const flags = getOptionsDescription(proto);
        const positionals = getPositionalOptionsDescription(proto);
        parseOptions(flags, positionals, this, args.args);
        this.commandPath = args.commandPath;
        this.command = args.command;
        this.commandArgs = args.args;
    }

    async execute(): Promise<CommandResult> {
        this.clientFactory = new StallionApiClient();
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
        if (this.token) {
            try {
                await this.clientFactory.get(Endpoints.PROFILE);
            } catch (e) {
                return Promise.resolve(failure(ErrorCodes.Exception, 'cannot fetch profile!!'));
            }

            return await this.runCommand(this.clientFactory);
        }
        return Promise.resolve(notLoggedIn(`${scriptName} ${this.command.join(' ')}`));
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
