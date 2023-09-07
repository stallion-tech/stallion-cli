// Functions to read information from the user

import * as inquirer from 'inquirer';

export function prompt(message: string): Promise<string> {
    return prompt
        .question([
            {
                name: 'result',
                message: message
            }
        ])
        .then((answers) => answers['result'].toString());
}

export namespace prompt {
    export function confirm(message: string, defaultResponse?: boolean): Promise<boolean> {
        return prompt
            .question([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: message,
                    default: !!defaultResponse
                }
            ])
            .then((answers) => !!answers['confirm']);
    }

    export function confirmWithTimeout(message: string, timeoutMS: number, defaultResponse?: boolean): Promise<boolean> {
        let timerId: any;
        const confirmPrompt = inquirer.prompt({
            type: 'confirm',
            name: 'confirm',
            message: message,
            default: !!defaultResponse
        });

        const promptCompleted = confirmPrompt.then((answers: any) => {
            clearTimeout(timerId);
            return !!answers['confirm'];
        });

        const timeoutPromise: Promise<boolean> = new Promise((resolve, reject) => {
            timerId = setTimeout(resolve, timeoutMS);
        }).then(() => {
            (confirmPrompt as any).ui.close();
            return !!defaultResponse;
        });

        return Promise.race([promptCompleted, timeoutPromise]);
    }

    export function password(message: string): Promise<string> {
        return prompt
            .question([
                {
                    type: 'password',
                    name: 'result',
                    message: message
                }
            ])
            .then((answers) => answers['result'].toString());
    }

    export function question(questions: inquirer.Question[]): Promise<inquirer.Answers> {
        return Promise.resolve(inquirer.prompt(questions));
    }
}
