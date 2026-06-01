import { ApiClient } from "@/api/api-client";
import { CONFIG } from "@/api/config";
import { ENDPOINTS } from "@/api/endpoints";
import { logger } from "./logger";

const REGIONS = ["ap", "us"] as const;

export function parseTokenRegion(token: string): string | null {
  logger.info(`Parsing token region: ${token}`);
  if (!token) return null;
  if (token.startsWith("stl_") && token.length === 43 && token[6] === "_") {
    const code = token.substring(4, 6);
    logger.info(`Parsed token region code: ${code}`);
    logger.info(`Returning code: ${code}`);
    return (REGIONS as readonly string[]).includes(code) ? code : null;
  }
  logger.info(`Parsed token region code: null`);
  logger.info(`Returning null`);
  return null;
}

export async function resolveRegion(opts: {
  uploadPath: string;
  ciToken?: string;
  accessToken?: string;
}): Promise<string> {
  if (opts.ciToken) {
    return parseTokenRegion(opts.ciToken) ?? "ap";
  }

  const client = new ApiClient(CONFIG.API.BASE_URL);
  if (opts.accessToken) {
    client.setToken(opts.accessToken);
  }

  const { data } = await client.post<{ data: { region: string } }>(
    ENDPOINTS.ORG.GET_ORG_REGION,
    { uploadPath: opts.uploadPath }
  );
  logger.info(`Resolved region: ${JSON.stringify(data)}`);
  return data?.region ?? "ap";
}
