import { promptText } from "@/utils/prompt";
import { ui } from "@/ui";
import { ENDPOINTS } from "@/api/endpoints";
import opener from "opener";
import os from "os";
import { createDefaultTokenStore } from "@/utils/token-store";
import { setContext } from "@/utils/context-store";
import { ApiClient } from "@/api/api-client";
import { CONFIG } from "@/api/config";
import { progress } from "@/utils/progress";
import { CommandOption } from "@/decorators/command.decorator";
import { camelCase } from "lodash";
export abstract class BaseCommand {
  abstract execute(options: Record<string, any>): Promise<void>;

  protected validateOptions(
    options: Record<string, any>,
    expected: CommandOption[] = []
  ): boolean {
    const missing = expected
      .filter((opt) => {
        return opt.required && !options[camelCase(opt.name)];
      })
      .map((opt) => `--${opt.name}`);

    if (missing.length) {
      ui.status.fail(`Missing required options: ${missing.join(", ")}`);
      return false;
    }

    // If a command supports custom bundle upload, disallow bundling-related flags.
    const supportsCustomBundlePath = expected.some(
      (opt) => opt.name === "custom-bundle-path"
    );
    const hasCustomBundlePath =
      supportsCustomBundlePath && options.customBundlePath !== undefined;

    if (hasCustomBundlePath) {
      const disallowedWhenCustomBundlePath = [
        "hermes-disabled",
        "entry-file",
        "hermes-logs",
        "hermesc-path",
        "sourcemap",
        "keep-artifacts",
      ];

      const providedDisallowed = disallowedWhenCustomBundlePath.filter(
        (name) => options[camelCase(name)] !== undefined
      );

      if (providedDisallowed.length) {
        ui.status.fail(
          `When --custom-bundle-path is provided, these options are not allowed: ${providedDisallowed
            .map((n) => `--${n}`)
            .join(", ")}`
        );
        return false;
      }
    }

    return true;
  }

  async login(): Promise<boolean> {
    try {
      ui.status.info(
        `Opening your browser...${os.EOL}• Visit ${ENDPOINTS.CLI_LOGIN} and enter the code:`
      );

      opener(ENDPOINTS.CLI_LOGIN);

      const token = await promptText("Enter your access token:");

      if (!token || token.trim().length < 5) {
        ui.status.fail("Invalid token entered.");
        return false;
      }

      const tokenStore = createDefaultTokenStore();

      await tokenStore.set("cli", {
        id: null,
        token: token.trim(),
      });
      await progress("Verifying login", () => this.verifyLogin());

      ui.status.ok("Token saved successfully. Login successful.");
      return true;
    } catch (error) {
      throw new Error("Failed to login and store token");
    }
  }

  async verifyLogin(): Promise<boolean> {
    try {
      const tokenStore = createDefaultTokenStore();
      const tokenData = await tokenStore.get("cli");
      if (!tokenData || !tokenData.accessToken?.token) {
        throw new Error();
      }
      const apiClient = new ApiClient(CONFIG.API.BASE_URL);
      apiClient.setToken(tokenData.accessToken.token);
      const res = await apiClient.get<{ data: any }>(ENDPOINTS.USER.VERIFY);
      // Cache the profile so the welcome banner can greet the user offline.
      try {
        const profile = res?.data;
        if (profile) {
          setContext({
            userName: profile.fullName,
            userEmail: profile.email,
          });
        }
      } catch {
        /* caching the name is best-effort; never fail auth for it */
      }
      return true;
    } catch (error: any) {
      throw new Error("Failed to authenticate. Invalid token.");
    }
  }

  async logout(): Promise<boolean> {
    try {
      const tokenStore = createDefaultTokenStore();
      await tokenStore.remove("cli");
      // Drop the cached profile so the greeting doesn't show a stale name.
      setContext({ userName: undefined, userEmail: undefined });
      ui.status.ok("Logged out successfully");
      return true;
    } catch (error) {
      throw new Error("Failed to logout");
    }
  }
}
