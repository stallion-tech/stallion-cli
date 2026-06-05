import { ApiClient } from "@/api/api-client";
import { CONFIG } from "@/api/config";
import { ENDPOINTS } from "@/api/endpoints";

const REGIONS = ["ap", "us"] as const;

export function parseTokenRegion(token: string): string | null {
  if (!token) return null;
  if (token.startsWith("stl_") && token.length === 43 && token[6] === "_") {
    const code = token.substring(4, 6);
    return (REGIONS as readonly string[]).includes(code) ? code : null;
  }
  return null;
}

export async function resolveRegion(opts: {
  uploadPath: string;
  ciToken?: string;
  accessToken?: string;
}): Promise<string> {
  try {
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
    return data?.region ?? "ap";
  } catch (error) {
    throw new Error("Something went wrong");
  }
}
