import { CONFIG } from "@/api/config";

export function getApiBaseUrl(region: string): string {
  if (!region) {
    return CONFIG.API.BASE_URL;
  }

  return `https://api-${region}.stalliontech.io/api/v1`;
}
