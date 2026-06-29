import { CONFIG } from "@/api/config";

export function getApiBaseUrl(region: string): string {
  if (!region) {
    return `http://localhost:8000/api/v1`;
  }

  return `http://localhost:8000/api/v1`;
}
