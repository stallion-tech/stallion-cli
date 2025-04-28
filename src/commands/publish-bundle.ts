import Command, { CommandArgs } from '../command-line/command';
import { hasArg, help, longName, shortName } from '../command-line/option-decorators';
import { StallionApiClient } from '../apis/api-client';
import { CommandResult, ErrorCodes, failure, success } from '../command-line/command-result';

import {
    createEmptyTmpReleaseFolder,
    fileDoesNotExistOrIsDirectory,
    getReactNativeVersion,
    isValidPlatform,
    removeReactTmpDir,
    runHermesEmitBinaryCommand,
    runReactNativeBundleCommand
} from '../utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mkdirp } from 'mkdirp';
import * as chalk from 'chalk';
import { out } from '../interaction-output';
import { createZip } from '../utils';
import { Endpoints } from '../apis/endpoints';
import * as rimraf from 'rimraf';
import { calculateSHA2565Hash } from '../utils';
import { readFileSync } from 'fs';
import { signBundle } from '../utils/sign-bundle';
@help('Publish bundle')
export default class PublishBundle extends Command {
    constructor(args: CommandArgs) {
        super(args);
        if (this.ciToken) {
            this.skipAuthCheck();
        }
    }

    @help('Name of JS bundle file, Default is index.android.bundle (android), main.jsbundle(ios)')
    @shortName('b')
    @longName('bundle-name')
    @hasArg
    public bundleName: string;

    @help('Path to entry JavaScript file. default is index.js')
    @shortName('e')
    @longName('entry-file')
    @hasArg
    public entryFile: string;

    @help('Path to entry JavaScript file. default is index.js')
    @shortName('p')
    @longName('platform')
    @hasArg
    public platform: string;

    @help('Enable hermes')
    @longName('hermes-disabled')
    public disableHermes: boolean;

    @help('Enable hermes logs')
    @longName('hermes-logs')
    public hermesLogs: boolean;

    @help('One liner release note')
    @shortName('r')
    @longName('release-note')
    @hasArg
    public releaseNote: string;

    @help('One liner release note')
    @shortName('up')
    @longName('upload-path')
    @hasArg
    public uploadPath: string;

    @help('CI token')
    @shortName('ct')
    @longName('ci-token')
    @hasArg
    public ciToken: string;

    @help('Private Key')
    @shortName('pk')
    @longName('private-key')
    @hasArg
    public privateKey: string;

    private devMode: boolean = false;

    private contentRootPath: string;

    async runCommand(client: StallionApiClient): Promise<CommandResult> {
        if (!this.uploadPath) {
            return failure(ErrorCodes.InvalidParameter, 'No upload path provided');
        }

        if (!this.releaseNote) this.releaseNote = '';

        if (!getReactNativeVersion()) {
            return failure(ErrorCodes.InvalidParameter, 'No react native project found in current directory');
        }

        const contentTempRootPath = await fs.mkdtemp('stallion-temp');
        this.contentRootPath = path.join(contentTempRootPath, 'Stallion');
        mkdirp.sync(this.contentRootPath);

        if (!isValidPlatform(this.platform)) {
            return failure(ErrorCodes.Exception, `Platform must be "android" or "ios".`);
        }

        if (!this.bundleName) {
            this.bundleName = this.platform === 'ios' ? 'main.jsbundle' : `index.android.bundle`;
        }

        if (!this.entryFile) {
            this.entryFile = 'index.js';
        } else {
            if (fileDoesNotExistOrIsDirectory(this.entryFile)) {
                return failure(ErrorCodes.NotFound, `Entry file "${this.entryFile}" does not exist.`);
            }
        }

        try {
            createEmptyTmpReleaseFolder(this.contentRootPath);
            removeReactTmpDir();
            await runReactNativeBundleCommand(this.bundleName, this.entryFile, this.contentRootPath, this.platform, this.devMode);

            const isHermesDisabled = this.disableHermes;
            if (!isHermesDisabled) {
                await runHermesEmitBinaryCommand(this.bundleName, this.contentRootPath, this.hermesLogs);
            }

            if (this.privateKey) {
                await out.progressV2(chalk.cyanBright('Signing Bundle...'), signBundle(this.contentRootPath, this.privateKey));
            }
            await out.progressV2(chalk.cyanBright('Archiving Bundle...'), createZip(this.contentRootPath, contentTempRootPath));
            const zipPath = path.resolve(contentTempRootPath, 'build.zip');
            await out.progressV2(chalk.cyanBright('Publishing bundle...'), this.uploadBundle(client, zipPath));
            out.text(chalk.greenBright('\nSuccess!, Published new version'));
        } catch (e) {
            return failure(ErrorCodes.Exception, e.toString());
        } finally {
            rimraf.sync(contentTempRootPath);
        }

        return success();
    }

    private async uploadBundle(client: StallionApiClient, filePath: string) {
        let token = this.token;
        if (token) {
            client.setHeaders({
                'x-access-token': token
            });
        }

        try {
            const hash = calculateSHA2565Hash(filePath);
            if (!hash) {
                throw new Error('Invalid path or not a valid zip file.');
            }
            const path = this.uploadPath?.toLowerCase();
            const data: any = {
                hash,
                uploadPath: path,
                platform: this.platform,
                releaseNote: this.releaseNote
            };
            if (this.ciToken) {
                data['ciToken'] = this.ciToken;
            }
            const { data: signedUrlResp } = await client.post(Endpoints.GENERATE_SIGNED_URL, data);
            const url = signedUrlResp?.data?.url;
            if (!url) {
                throw new Error('Internal Error: invalid signed url');
            }
            await client.put(url, readFileSync(filePath));
        } catch (e) {
            if (e.toString().includes('AxiosError:')) {
                throw e?.response?.data?.errors?.data?.[0]?.message ?? 'error while uploading bundle';
            } else {
                throw new Error(e);
            }
        }
    }
}
