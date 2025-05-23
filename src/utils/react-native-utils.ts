import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as rimraf from "rimraf";
import { logger } from "./logger";
import * as childProcess from "child_process";
import { coerce, compare } from "semver";

function findUpwardReactNativePackageJson(
  startDir: string = process.cwd()
): string | null {
  let current = startDir;

  while (current !== path.parse(current).root) {
    const candidate = path.join(
      current,
      "node_modules",
      "react-native",
      "package.json"
    );
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }

  return null;
}

export function getReactNativeVersion(): string | null {
  const rnPackageJsonPath = findUpwardReactNativePackageJson();
  if (!rnPackageJsonPath) {
    return null;
  }

  const rnPackageJson = JSON.parse(fs.readFileSync(rnPackageJsonPath, "utf-8"));
  return rnPackageJson.version;
}

export function directoryExistsSync(dirname: string): boolean {
  try {
    return fs.statSync(dirname).isDirectory();
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return false;
}

function getReactNativePackagePath(): string {
  const rnPackageJsonPath = findUpwardReactNativePackageJson();
  if (rnPackageJsonPath) {
    return path.dirname(rnPackageJsonPath);
  }

  const result = childProcess.spawnSync("node", [
    "--print",
    "require.resolve('react-native/package.json')",
  ]);
  const packagePath = path.dirname(result.stdout.toString().trim());
  if (result.status === 0 && directoryExistsSync(packagePath)) {
    return packagePath;
  }

  return path.join("node_modules", "react-native");
}

export function isValidPlatform(platform: string): boolean {
  return (
    platform?.toLowerCase() === "android" || platform?.toLowerCase() === "ios"
  );
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
  return path.join("node_modules", ".bin", "react-native");
}

export async function runReactNativeBundleCommand(
  bundleName: string,
  entryFile: string,
  outputFolder: string,
  platform: string,
  devMode: boolean
) {
  const reactNativeBundleArgs: string[] = [];
  Array.prototype.push.apply(reactNativeBundleArgs, [
    getCliPath(),
    "bundle",
    "--dev",
    devMode,
    "--assets-dest",
    outputFolder,
    "--bundle-output",
    path.join(outputFolder, bundleName),
    "--entry-file",
    entryFile,
    "--platform",
    platform,
  ]);
  logger.info(`Running \"react-native bundle\" command`);
  logger.subtitle(reactNativeBundleArgs.join(" "));

  const reactNativeBundleProcess = childProcess.spawn(
    "node",
    reactNativeBundleArgs
  );

  return new Promise<void>((resolve, reject) => {
    reactNativeBundleProcess.stdout.on("data", (data: Buffer) => {
      console.log(data.toString().trim());
    });

    reactNativeBundleProcess.stderr.on("data", (data: Buffer) => {
      logger.error(data.toString().trim());
    });

    reactNativeBundleProcess.on("close", (exitCode: number, signal: string) => {
      if (exitCode !== 0) {
        reject(
          new Error(
            `\"react-native bundle\" command failed (exitCode=${exitCode}, signal=${signal}).`
          )
        );
      }

      resolve();
    });
  });
}

export async function runHermesEmitBinaryCommand(
  bundleName: string,
  outputFolder: string,
  hermesLogs: boolean = false
): Promise<void> {
  const hermesArgs: string[] = [];
  Array.prototype.push.apply(hermesArgs, [
    "-emit-binary",
    "-out",
    path.join(outputFolder, bundleName + ".hbc"),
    path.join(outputFolder, bundleName),
  ]);

  logger.info("Converting JS bundle to byte code via Hermes");
  const hermesCommand = await getHermesCommand();
  const hermesProcess = childProcess.spawn(hermesCommand, hermesArgs);
  logger.info(`Running: ${hermesCommand} ${hermesArgs.join(" ")}`);
  let logFile: fs.WriteStream | null = null;
  let isWarned = false;
  if (hermesLogs) {
    logFile = fs.createWriteStream("output.log", { flags: "a" });
  }
  return new Promise<void>((resolve, reject) => {
    hermesProcess.stdout.on("data", (data: Buffer) => {
      logger.info(data.toString().trim());
    });

    hermesProcess.stderr.on("data", (data: Buffer) => {
      if (isWarned) {
        if (hermesLogs && logFile) {
          logFile.write(data.toString().trim());
        }
        return;
      }
      isWarned = true;
      logger.warning(
        "⚠️ Hermes command executed successfully with some warnings. If you need full logs, use the --hermes-logs command.\n"
      );
    });

    hermesProcess.on("close", (exitCode: number, signal: string) => {
      if (hermesLogs && logFile) {
        logger.success("📕 Done writing logs in output.log file.");
        logFile.end();
      }

      if (exitCode !== 0) {
        reject(
          new Error(
            `\"❌ hermes\" command failed (exitCode=${exitCode}, signal=${signal}).\n`
          )
        );
      }

      const source = path.join(outputFolder, bundleName + ".hbc");
      const destination = path.join(outputFolder, bundleName);
      fs.copyFile(source, destination, (err) => {
        if (err) {
          console.error(err);
          reject(
            new Error(
              `Copying file ${source} to ${destination} failed. \"hermes\" previously exited with code ${exitCode}.`
            )
          );
        }
        fs.unlink(source, (err) => {
          if (err) {
            console.error(err);
            reject(err);
          }
          resolve();
        });
      });
    });
  });
}

function getHermesOSBin(): string {
  switch (process.platform) {
    case "win32":
      return "win64-bin";
    case "darwin":
      return "osx-bin";
    case "freebsd":
    case "linux":
    case "sunos":
    default:
      return "linux64-bin";
  }
}

function getHermesOSExe(): string {
  const versionObj = coerce(getReactNativeVersion());
  if (!versionObj?.version) {
    throw new Error("Unable to determine React Native version");
  }
  const react63orAbove = compare(versionObj.version, "0.63.0") !== -1;
  const hermesExecutableName = react63orAbove ? "hermesc" : "hermes";
  switch (process.platform) {
    case "win32":
      return hermesExecutableName + ".exe";
    default:
      return hermesExecutableName;
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch (e) {
    return false;
  }
}

async function getHermesCommand(): Promise<string> {
  const bundledHermesEngine = path.join(
    getReactNativePackagePath(),
    "sdks",
    "hermesc",
    getHermesOSBin(),
    getHermesOSExe()
  );
  if (fileExists(bundledHermesEngine)) {
    return bundledHermesEngine;
  }

  const hermesEngine = path.join(
    "node_modules",
    "hermes-engine",
    getHermesOSBin(),
    getHermesOSExe()
  );
  if (fileExists(hermesEngine)) {
    return hermesEngine;
  }
  return path.join("node_modules", "hermesvm", getHermesOSBin(), "hermes");
}
