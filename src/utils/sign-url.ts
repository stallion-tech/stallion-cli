import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { fileExists } from './react-native-utils';
const mime = require('mime');

export function fileExistsAndIsZip(path: string): boolean {
    const isFileExists = fileExists(path);
    const isValidZip = mime.getType(path) === 'application/zip';
    return isFileExists && isValidZip;
}
export function calculateSHA2565Hash(path: string): string | null {
    if (!fileExistsAndIsZip(path)) {
        return null;
    }
    const fileStream = readFileSync(path);
    return createHash('sha256').update(fileStream).digest('hex');
}
