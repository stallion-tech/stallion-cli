import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as rimraf from 'rimraf';
import { out } from '../interaction-output';
import * as chalk from 'chalk';
import * as childProcess from 'child_process';
import { coerce, compare } from 'semver';

export function getReactNativeVersion(): string {
    let packageJsonFilename;
    let projectPackageJson;
    try {
        packageJsonFilename = path.join(process.cwd(), 'package.json');
        projectPackageJson = JSON.parse(fs.readFileSync(packageJsonFilename, 'utf-8'));
    } catch (error) {
        throw new Error(
            `Unable to find or read "package.json" in the CWD. The "publish-bundle" command must be executed in a React Native project folder.`
        );
    }

    const projectName: string = projectPackageJson.name;
    if (!projectName) {
        throw new Error(`The "package.json" file in the CWD does not have the "name" field set.`);
    }

    return (
        (projectPackageJson.dependencies && projectPackageJson.dependencies['react-native']) ||
        (projectPackageJson.devDependencies && projectPackageJson.devDependencies['react-native'])
    );
}

export function directoryExistsSync(dirname: string): boolean {
    try {
        return fs.statSync(dirname).isDirectory();
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
    return false;
}

export function checkForStallionEnabled() {
    const output = childProcess.spawnSync(
        'node',
        ['node_modules/@redhorse-tech/react-native-stallion/src/nativeScripts/getStallionEnabled'],
        { encoding: 'utf8' }
    );
    if (output.stderr) {
        throw 'Stallion SDK is not installed. Please run npm install react-native-stallion';
    }
    const result = output.stdout.trim();
    if (!result) throw 'Stallion not enabled in stallion.config.js';
    return true;
}

function getReactNativePackagePath(): string {
    const result = childProcess.spawnSync('node', ['--print', "require.resolve('react-native/package.json')"]);
    const packagePath = path.dirname(result.stdout.toString());
    if (result.status === 0 && directoryExistsSync(packagePath)) {
        return packagePath;
    }

    return path.join('node_modules', 'react-native');
}

export function isValidPlatform(platform: string): boolean {
    return platform?.toLowerCase() === 'android' || platform?.toLowerCase() === 'ios';
}

export function fileDoesNotExistOrIsDirectory(path: string): boolean {
    try {
        return isDirectory(path);
    } catch (error) {
        return true;
    }
}

export function isDirectory(path: string): boolean {
    return fs.statSync(path).isDirectory();
}

export function createEmptyTmpReleaseFolder(folderPath: string): void {
    rimraf.sync(folderPath);
    fs.mkdirSync(folderPath);
}

export function removeReactTmpDir(): void {
    rimraf.sync(`${os.tmpdir()}/react-*`);
}

function getCliPath(): string {
    return path.join('node_modules', '.bin', 'react-native');
}

export async function runReactNativeBundleCommand(
    bundleName: string,
    entryFile: string,
    outputFolder: string,
    platform: string,
    devMode: boolean
) {
    const reactNativeBundleArgs: string[] = [];
    const reactNativeCliPath = getCliPath();
    console.log(reactNativeCliPath);
    Array.prototype.push.apply(reactNativeBundleArgs, [
        getCliPath(),
        'bundle',
        '--dev',
        devMode,
        '--assets-dest',
        outputFolder,
        '--bundle-output',
        path.join(outputFolder, bundleName),
        '--entry-file',
        entryFile,
        '--platform',
        platform
    ]);
    out.text(chalk.cyan('Running "react-native bundle" command:\n'));

    const reactNativeBundleProcess = childProcess.spawn('node', reactNativeBundleArgs);
    out.text(`node ${reactNativeBundleArgs.join(' ')}`);

    return new Promise<void>((resolve, reject) => {
        reactNativeBundleProcess.stdout.on('data', (data: Buffer) => {
            out.text(data.toString().trim());
        });

        reactNativeBundleProcess.stderr.on('data', (data: Buffer) => {
            console.error(data.toString().trim());
        });

        reactNativeBundleProcess.on('close', (exitCode: number, signal: string) => {
            if (exitCode !== 0) {
                reject(new Error(`"react-native bundle" command failed (exitCode=${exitCode}, signal=${signal}).`));
            }

            resolve(null as void);
        });
    });
}

export async function runHermesEmitBinaryCommand(bundleName: string, outputFolder: string): Promise<void> {
    const hermesArgs: string[] = [];
    Array.prototype.push.apply(hermesArgs, [
        '-emit-binary',
        '-out',
        path.join(outputFolder, bundleName + '.hbc'),
        path.join(outputFolder, bundleName)
    ]);

    out.text(chalk.cyan('Converting JS bundle to byte code via Hermes, running command:\n'));
    const hermesCommand = await getHermesCommand();
    const hermesProcess = childProcess.spawn(hermesCommand, hermesArgs);
    out.text(`${hermesCommand} ${hermesArgs.join(' ')}`);

    return new Promise<void>((resolve, reject) => {
        hermesProcess.stdout.on('data', (data: Buffer) => {
            out.text(data.toString().trim());
        });

        hermesProcess.stderr.on('data', (data: Buffer) => {
            console.error(data.toString().trim());
        });

        hermesProcess.on('close', (exitCode: number, signal: string) => {
            if (exitCode !== 0) {
                reject(new Error(`"hermes" command failed (exitCode=${exitCode}, signal=${signal}).`));
            }
            // Copy HBC bundle to overwrite JS bundle
            const source = path.join(outputFolder, bundleName + '.hbc');
            const destination = path.join(outputFolder, bundleName);
            fs.copyFile(source, destination, (err) => {
                if (err) {
                    console.error(err);
                    reject(
                        new Error(`Copying file ${source} to ${destination} failed. "hermes" previously exited with code ${exitCode}.`)
                    );
                }
                fs.unlink(source, (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }
                    resolve(null as void);
                });
            });
        });
    });
}

function getHermesOSBin(): string {
    switch (process.platform) {
        case 'win32':
            return 'win64-bin';
        case 'darwin':
            return 'osx-bin';
        case 'freebsd':
        case 'linux':
        case 'sunos':
        default:
            return 'linux64-bin';
    }
}

function getHermesOSExe(): string {
    const react63orAbove = compare(coerce(getReactNativeVersion()).version, '0.63.0') !== -1;
    const hermesExecutableName = react63orAbove ? 'hermesc' : 'hermes';
    switch (process.platform) {
        case 'win32':
            return hermesExecutableName + '.exe';
        default:
            return hermesExecutableName;
    }
}

async function getHermesCommand(): Promise<string> {
    const fileExists = (file: string): boolean => {
        try {
            return fs.statSync(file).isFile();
        } catch (e) {
            return false;
        }
    };
    // Hermes is bundled with react-native since 0.69
    const bundledHermesEngine = path.join(getReactNativePackagePath(), 'sdks', 'hermesc', getHermesOSBin(), getHermesOSExe());
    if (fileExists(bundledHermesEngine)) {
        return bundledHermesEngine;
    }

    const hermesEngine = path.join('node_modules', 'hermes-engine', getHermesOSBin(), getHermesOSExe());
    if (fileExists(hermesEngine)) {
        return hermesEngine;
    }
    return path.join('node_modules', 'hermesvm', getHermesOSBin(), 'hermes');
}
