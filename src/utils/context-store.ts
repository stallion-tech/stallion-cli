import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * The user's saved working context — the default org/project that commands
 * fall back to when their ids aren't passed as flags. Stored next to the
 * token at ~/.stallion/context.json.
 */
export interface StallionContext {
  orgId?: string;
  orgName?: string;
  region?: string;
  projectId?: string;
  projectName?: string;
}

function getContextFilePath(): string {
  return path.join(os.homedir(), ".stallion", "context.json");
}

export function getContext(): StallionContext {
  try {
    return JSON.parse(fs.readFileSync(getContextFilePath(), "utf8"));
  } catch {
    return {};
  }
}

/** Merge a patch into the saved context. Keys set to undefined are removed. */
export function setContext(patch: Partial<StallionContext>): StallionContext {
  const filePath = getContextFilePath();
  const next: StallionContext = { ...getContext(), ...patch };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function clearContext(): void {
  try {
    fs.rmSync(getContextFilePath());
  } catch {
    /* nothing to clear */
  }
}

export function getContextPath(): string {
  return getContextFilePath();
}
