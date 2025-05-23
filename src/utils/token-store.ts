import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { toPairs } from "lodash";

export type TokenKeyType = string;
export type TokenValueType = { id: string | null; token: string };
export interface TokenEntry {
  key: TokenKeyType;
  accessToken: TokenValueType;
}

export interface TokenStore {
  getStoreFilePath(): string;
  list(): Promise<TokenEntry[]>;
  get(key: TokenKeyType): Promise<TokenEntry | null>;
  set(key: TokenKeyType, value: TokenValueType): Promise<void>;
  remove(key: TokenKeyType): Promise<void>;
}

export class FileTokenStore implements TokenStore {
  private filePath: string;
  private tokenStoreCache: Record<string, TokenValueType> | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  getStoreFilePath(): string {
    return this.filePath;
  }

  async list(): Promise<TokenEntry[]> {
    return toPairs(this.cache).map(
      ([key, value]: [string, TokenValueType]) => ({
        key,
        accessToken: value,
      })
    );
  }

  async get(key: TokenKeyType): Promise<TokenEntry | null> {
    const token = this.cache[key];
    return token ? { key, accessToken: token } : null;
  }

  async set(key: TokenKeyType, value: TokenValueType): Promise<void> {
    this.cache[key] = value;
    this.writeTokenStoreCache();
  }

  async remove(key: TokenKeyType): Promise<void> {
    delete this.cache[key];
    this.writeTokenStoreCache();
  }

  /**
   * Safe accessor that ensures cache is loaded
   */
  private get cache(): Record<string, TokenValueType> {
    if (this.tokenStoreCache === null) {
      this.loadTokenStoreCache();
    }
    return this.tokenStoreCache!;
  }

  private loadTokenStoreCache(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    } catch (err: any) {
      if (err.code !== "EEXIST") throw err;
    }

    try {
      const content = fs.readFileSync(this.filePath, "utf8");
      this.tokenStoreCache = JSON.parse(content);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.tokenStoreCache = {};
      } else {
        throw err;
      }
    }
  }

  private writeTokenStoreCache(): void {
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.cache, null, 2),
      "utf8"
    );
  }
}

export function createDefaultTokenStore(): TokenStore {
  const filePath = path.join(os.homedir(), ".stallion", "token-store.json");
  return new FileTokenStore(filePath);
}
