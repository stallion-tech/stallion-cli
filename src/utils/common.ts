import { CONFIG } from "@/api/config";

/** Platforms a Stallion bundle can target — the single source of truth. */
export const PLATFORMS = ["android", "ios"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function getApiBaseUrl(region: string): string {
  if (!region) {
    return CONFIG.API.BASE_URL;
  }

  return `https://api-${region}.stalliontech.io/api/v1`;
}
