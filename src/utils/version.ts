import { readFileSync } from "fs";
import { join } from "path";

export const getVersion = (): string => {
  try {
    const packageJsonPath = join(__dirname, "../../", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
  } catch (error) {
    return "0.0.0"; // Fallback version if package.json cannot be read
  }
};
