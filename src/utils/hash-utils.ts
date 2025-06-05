import * as fs from "fs/promises";
import * as fssync from "fs";
import * as path from "path";
import * as _ from "lodash";
import * as crypto from "crypto";
import * as stream from "stream";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { fileExists } from "./react-native-utils";
import * as jwt from "jsonwebtoken";
import { CONFIG } from "@/api/config";
const mime = require("mime");

export async function signBundle(
  bundlePath: string,
  privateKeyPath: string
): Promise<void> {
  if (!privateKeyPath) {
    return;
  }

  let privateKey: Buffer;
  try {
    privateKey = await fs.readFile(privateKeyPath);
  } catch {
    throw new Error(
      `The path specified for the signing key ("${privateKeyPath}") was not valid.`
    );
  }

  const signedFilePath = path.join(bundlePath, CONFIG.BUNDLE_EXTENSION);

  const fileHashMap = await generatePackageManifest(bundlePath, bundlePath);
  const packageHash = await computePackageHash(fileHashMap);

  const payload = { packageHash };

  try {
    const signedJwt = jwt.sign(payload, privateKey, { algorithm: "RS256" });
    await fs.writeFile(signedFilePath, signedJwt);
  } catch (err) {
    throw new Error(`Error signing bundle: ${(err as Error).message}`);
  }
}

export function fileExistsAndIsZip(path: string): boolean {
  const isFileExists = fileExists(path);
  const isValidZip = mime.getType(path) === "application/zip";
  return isFileExists && isValidZip;
}
export function calculateSHA2565Hash(path: string): string | null {
  if (!fileExistsAndIsZip(path)) {
    return null;
  }
  const fileStream = readFileSync(path);
  return createHash("sha256").update(fileStream).digest("hex");
}

const HASH_ALGORITHM = "sha256";

export async function generatePackageManifest(
  directoryPath: string,
  basePath: string
) {
  const fileHashMap = new Map<string, string>();
  const filePathList: string[] = await getFilePathsInDir(directoryPath);

  if (!filePathList || filePathList.length === 0) {
    throw new Error(
      "Error: Can't sign the release because no files were found."
    );
  }

  for (const filePath of filePathList) {
    const relativePath: string = normalizePath(
      path.relative(basePath, filePath)
    );
    if (!isIgnored(relativePath)) {
      const hash: string = await hashFile(filePath);
      fileHashMap.set(relativePath, hash);
    }
  }

  return fileHashMap;
}

export async function computePackageHash(
  fileHashMap: Map<string, string>
): Promise<string> {
  let entries: string[] = [];
  fileHashMap.forEach((hash: string, name: string): void => {
    entries.push(name + ":" + hash);
  });

  entries = entries.sort();

  return crypto
    .createHash(HASH_ALGORITHM)
    .update(JSON.stringify(entries))
    .digest("hex");
}

function hashFile(filePath: string): Promise<string> {
  const readStream: fssync.ReadStream = fssync.createReadStream(filePath);
  return hashStream(readStream);
}

async function hashStream(readStream: stream.Readable): Promise<string> {
  const hash = crypto.createHash(HASH_ALGORITHM);

  return new Promise<string>((resolve, reject) => {
    readStream.on("error", (error: any) => {
      reject(error);
    });

    hash.on("error", (error: any) => {
      reject(error);
    });

    const chunks: Buffer[] = [];
    hash.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    hash.on("end", () => {
      const result = Buffer.concat(chunks).toString("hex");
      resolve(result);
    });

    readStream.pipe(hash);
  });
}

function normalizePath(filePath: string): string {
  //replace all backslashes coming from cli running on windows machines by slashes
  return filePath.replace(/\\/g, "/");
}

async function getFilePathsInDir(dir: string): Promise<string[]> {
  const stats = await fs.stat(dir);
  if (stats.isDirectory()) {
    let files: string[] = [];
    for (const file of await fs.readdir(dir)) {
      files = files.concat(await getFilePathsInDir(path.join(dir, file)));
    }
    return files;
  } else {
    return [dir];
  }
}

function isIgnored(relativeFilePath: string): boolean {
  const __MACOSX = "__MACOSX/";
  const DS_STORE = ".DS_Store";
  const CODEPUSH_METADATA = ".codepushrelease";
  return (
    _.startsWith(relativeFilePath, __MACOSX) ||
    relativeFilePath === DS_STORE ||
    _.endsWith(relativeFilePath, "/" + DS_STORE) ||
    relativeFilePath === CODEPUSH_METADATA ||
    _.endsWith(relativeFilePath, "/" + CODEPUSH_METADATA)
  );
}
