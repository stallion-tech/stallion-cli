import { CommandRunner } from './command-line/command-runner';
import { failed } from './command-line/command-result';
import * as chalk from 'chalk';
import * as path from 'path';

class StallionCli {
    async init(args: string[], commandPath: string) {
        const runner = new CommandRunner(commandPath);
        const result = await runner.run(args);
        if (failed(result)) {
            console.error(`${chalk.bold.red('Error:')} ${result.errorMessage}`);
            process.exit(result.errorCode);
        }
    }
}

new StallionCli().init(process.argv.slice(2), path.join(__dirname, 'commands')).catch((e) => console.log(e));
