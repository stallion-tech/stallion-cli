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
} from '../utils/react-native-utils';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mkdirp } from 'mkdirp';
import * as chalk from 'chalk';
import { out } from '../interaction-output';
import { createZip } from '../utils/archiver';
import { Endpoints } from '../apis/endpoints';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import * as rimraf from 'rimraf';
import { stallionConfigFile } from '../constants';

@help('Publish bundle')
export default class PublishBundle extends Command {
    constructor(args: CommandArgs) {
        super(args);
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
    @longName('hermes-enabled')
    public useHermes: boolean;

    @help('Access token, default is from root')
    @shortName('t')
    @longName('access-token')
    @hasArg
    public accessToken: string;

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

        //check for stallion.config.json file
        try {
            const data = await readFile(stallionConfigFile, { encoding: 'utf-8' });
            const stallionConfig = JSON.parse(data);
            if (!stallionConfig.isEnabled) {
                rimraf.sync(contentTempRootPath);
                return failure(ErrorCodes.Exception, 'stallion is disabled');
            }
        } catch (e) {
            rimraf.sync(contentTempRootPath);
            return failure(ErrorCodes.Exception, 'stallion.config.json file not found');
        }

        try {
            createEmptyTmpReleaseFolder(this.contentRootPath);
            removeReactTmpDir();
            await runReactNativeBundleCommand(this.bundleName, this.entryFile, this.contentRootPath, this.platform, this.devMode);

            const isHermesEnabled = this.useHermes;
            if (isHermesEnabled) {
                await runHermesEmitBinaryCommand(this.bundleName, this.contentRootPath);
            }
            out.text(chalk.cyan('\nArchiving Bundle'));
            await createZip(this.contentRootPath, contentTempRootPath);
            const zipPath = path.resolve(contentTempRootPath, 'build.zip');
            await out.progress('Publishing bundle', this.uploadBundle(client, zipPath));
            out.text(chalk.green('\nSuccess!, Published new version'));
        } catch (e) {
            return failure(ErrorCodes.Exception, e.toString());
        } finally {
            rimraf.sync(contentTempRootPath);
        }

        return success();
    }

    private async uploadBundle(client: StallionApiClient, filePath: string) {
        let token = this.token;
        if (this.accessToken) {
            token = this.accessToken;
        }
        client.setHeaders({
            'x-access-token': token
        });

        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('bundle', createReadStream(filePath));
            form.append('uploadPath', this.uploadPath);
            form.append('platform', this.platform);
            form.append('releaseNote', this.releaseNote);
            await client.post(Endpoints.UPLOAD_BUNDLE, form);
        } catch (e) {
            if (e.toString().includes('AxiosError:')) {
                throw e?.response?.data?.errors?.data?.[0]?.message ?? 'something went wrong';
            }
            throw new Error(e.toString());
        }
    }
}
