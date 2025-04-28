import * as fs from 'fs/promises';
import * as path from 'path';
import { computePackageHash, generatePackageManifest } from './hash-utils';
import * as jwt from 'jsonwebtoken';
import { SIGNED_BUNDLE_EXTENSION } from '../constants';

export async function signBundle(bundlePath: string, privateKeyPath: string): Promise<void> {
    if (!privateKeyPath) {
        return;
    }

    let privateKey: Buffer;
    try {
        privateKey = await fs.readFile(privateKeyPath);
    } catch {
        throw new Error(`The path specified for the signing key ("${privateKeyPath}") was not valid.`);
    }

    const signedFilePath = path.join(bundlePath, SIGNED_BUNDLE_EXTENSION);

    const fileHashMap = await generatePackageManifest(bundlePath, bundlePath);
    const packageHash = await computePackageHash(fileHashMap);

    const payload = { packageHash };

    try {
        const signedJwt = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
        await fs.writeFile(signedFilePath, signedJwt);
    } catch (err) {
        throw new Error(`Error signing bundle: ${(err as Error).message}`);
    }
}
