import Command, { CommandArgs } from '../command-line/command';
import { help } from '../command-line/option-decorators';
import { StallionApiClient } from '../apis/api-client';
import { CommandResult, success } from '../command-line/command-result';
import { tokenStore } from '../token-store';
import { out } from '../interaction-output';

@help('Log out and delete token')
export default class Logout extends Command {
    constructor(args: CommandArgs) {
        super(args);
    }

    async runCommand(client: StallionApiClient): Promise<CommandResult> {
        try {
            await out.progress('Logging out current user...', this.logout());
            out.text('Token deleted, User logged out...');
            await process.exit(0);
            return success();
        } catch (e) {}
    }

    private async logout() {
        try {
            await tokenStore.remove('ACCESS_TOKEN');
        } catch (e) {
            throw new Error(e.toString());
        }
    }
}
