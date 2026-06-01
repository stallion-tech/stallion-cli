import { CONFIG } from "@/api/config";

export function getApiBaseUrl(region: string): string {
  if (!region || region === "ap") {
    return CONFIG.API.BASE_URL;
  }
  if(region === "us") {
    return CONFIG.API.BASE_URL;
  } else if (region === "ap") {
    return "https://api-staging.starbase.stalliontech.io/api/v1";
  }
  return CONFIG.API.BASE_URL;
}
