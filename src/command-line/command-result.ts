import { scriptName } from '../constants';

export type CommandResult = CommandSucceededResult | CommandFailedResult;

export interface CommandSucceededResult {
    // Nothing to say here, it just works. :-)
    succeeded: boolean;
}

export interface CommandFailedResult {
    succeeded: boolean;
    errorCode: number;
    errorMessage: string;
    exception?: Error;
}

export enum ErrorCodes {
    Succeeded = 0,
    // Command given contained illegal characters/names
    IllegalCommand,
    // Command was legal, but not found
    NoSuchCommand,
    // Unhandled exception occurred
    Exception,
    // A parameter is invalid
    InvalidParameter,
    // Command requires logged in user
    NotLoggedIn,
    // The requested resource was not found
    NotFound
}

export function commandNotFound(command: string): CommandResult {
    return failure(ErrorCodes.NoSuchCommand, `Command ${command} not found`);
}

export function isCommandFailedResult(object: any): object is CommandFailedResult {
    return (
        object != null &&
        typeof object.succeeded === 'boolean' &&
        typeof object.errorCode === 'number' &&
        typeof object.errorMessage === 'string'
    );
}

export function exception(command: string, ex: Error): CommandResult {
    return {
        succeeded: false,
        errorCode: ErrorCodes.Exception,
        errorMessage: `Command '${command}' failed with exception "${ex.message}"`,
        exception: ex
    };
}

export function illegal(command: string): CommandResult {
    return failure(ErrorCodes.IllegalCommand, `Command ${command} is invalid`);
}

export function failure(errorCode: number, errorMessage: string): CommandResult {
    return {
        succeeded: false,
        errorCode,
        errorMessage
    };
}

export function success(): CommandResult {
    return successResult;
}

const successResult = {
    succeeded: true
};

export function succeeded(result: CommandResult): result is CommandSucceededResult {
    return result.succeeded;
}

export function failed(result: CommandResult): result is CommandFailedResult {
    return !result.succeeded;
}

export function notLoggedIn(command: string): CommandResult {
    return failure(
        ErrorCodes.NotLoggedIn,
        `Command '${command}' requires a logged in user. Use the '${scriptName} auth login' command to log in.`
    );
}
