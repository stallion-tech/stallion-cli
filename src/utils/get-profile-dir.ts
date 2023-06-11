import * as os from 'os';
import * as path from 'path';

const profileDirName = '.stallion-cli';
export const tokenFile = 'tokens.json';

export function getProfileDir(): string {
    return path.join(getProfileDirParent(), profileDirName);
}

export function getProfileDirParent(): string {
    if (os.platform() === 'win32') {
        return process.env.AppData;
    } else {
        return os.homedir();
    }
}
