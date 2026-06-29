import { ApiClient } from "@/api/api-client";
import { CONFIG } from "@/api/config";
import { ENDPOINTS } from "@/api/endpoints";
import { getApiBaseUrl } from "@/utils/common";
import { createDefaultTokenStore } from "@/utils/token-store";
import { promptSelect } from "@/utils/prompt";
import { getContext, setContext } from "@/utils/context-store";

/**
 * Read the stored login JWT, or throw a friendly error if the user is not
 * logged in. Mirrors how BaseCommand.verifyLogin reads the token.
 */
export async function getUserToken(): Promise<string> {
  const tokenStore = createDefaultTokenStore();
  const tokenData = await tokenStore.get("cli");
  const token = tokenData?.accessToken?.token;
  if (!token) {
    throw new Error('You are not logged in. Run "stallion login" first.');
  }
  return token;
}

/**
 * Build an ApiClient authenticated with the logged-in user's token.
 * Pass a region to target that region's regional API (buckets, bundles and
 * releases live on the regional DB); omit it to hit the global API (used for
 * org and project listings).
 */
export async function createUserApiClient(region?: string): Promise<ApiClient> {
  const token = await getUserToken();
  const client = new ApiClient(
    region ? getApiBaseUrl(region) : CONFIG.API.BASE_URL
  );
  client.setToken(token);
  return client;
}

export interface OrgSummary {
  orgId: string;
  name: string;
  region: string;
  access: string;
}

/** Fetch the user's organizations (with their region) from the global API. */
export async function fetchOrgs(client: ApiClient): Promise<OrgSummary[]> {
  const res = await client.get<{ data: any[] }>(ENDPOINTS.ORG.LIST);
  const orgs = res?.data ?? [];
  return orgs.map((o: any) => ({
    orgId: String(o.orgId),
    name: o.orgData?.[0]?.name ?? "(unknown)",
    region: o.orgData?.[0]?.region ?? "ap",
    access: o.access ?? "",
  }));
}

/**
 * Resolve the org id and its region. Precedence: explicit flag > saved context
 * > interactive pick. An interactive pick is saved back to the context (and
 * clears any project from a different org). Pass useSaved: false to force a
 * fresh pick (used by `stallion use`).
 */
export async function resolveOrgContext(
  orgId?: string,
  opts: { useSaved?: boolean } = {}
): Promise<{ orgId: string; region: string }> {
  const useSaved = opts.useSaved !== false;
  if (!orgId && useSaved) {
    const ctx = getContext();
    if (ctx.orgId) {
      return { orgId: ctx.orgId, region: ctx.region ?? "ap" };
    }
  }

  const client = await createUserApiClient();
  const orgs = await fetchOrgs(client);
  if (!orgs.length) {
    throw new Error("No organizations found for this account.");
  }
  if (orgId) {
    const match = orgs.find((o) => o.orgId === orgId);
    return { orgId, region: match?.region ?? "ap" };
  }

  const chosen = await promptSelect<string>(
    "Select an organization",
    orgs.map((o) => ({
      name: o.name,
      value: o.orgId,
      description: `region: ${o.region}   id: ${o.orgId}`,
    }))
  );
  const match = orgs.find((o) => o.orgId === chosen);
  const region = match?.region ?? "ap";

  const prev = getContext();
  const patch: Partial<{
    orgId: string;
    orgName: string;
    region: string;
    projectId: string | undefined;
    projectName: string | undefined;
  }> = { orgId: chosen, orgName: match?.name, region };
  // Picking a different org invalidates a project saved under the old org.
  if (prev.orgId !== chosen) {
    patch.projectId = undefined;
    patch.projectName = undefined;
  }
  setContext(patch);

  return { orgId: chosen, region };
}

/**
 * Resolve a project id. Precedence: explicit flag > saved context (when it
 * belongs to this org) > interactive pick. An interactive pick is saved back
 * to the context. Pass useSaved: false to force a fresh pick.
 */
export async function resolveProjectId(
  orgId: string,
  projectId?: string,
  opts: { useSaved?: boolean } = {}
): Promise<string> {
  if (projectId) return projectId;
  const useSaved = opts.useSaved !== false;
  if (useSaved) {
    const ctx = getContext();
    if (ctx.projectId && ctx.orgId === orgId) {
      return ctx.projectId;
    }
  }

  const client = await createUserApiClient();
  const res = await client.post<{ data: any[] }>(ENDPOINTS.PROJECT.LIST, {
    orgId,
  });
  const projects = res?.data ?? [];
  if (!projects.length) {
    throw new Error("No projects found in this organization.");
  }
  const chosen = await promptSelect<string>(
    "Select a project",
    projects.map((p: any) => {
      const id = String(p.id ?? p._id);
      const platforms = [
        p.androidEnabled ? "android" : null,
        p.iosEnabled ? "ios" : null,
      ]
        .filter(Boolean)
        .join("/");
      return {
        name: p.name,
        value: id,
        description: `${platforms || "no platforms"}   id: ${id}`,
      };
    })
  );
  const proj = projects.find((p: any) => String(p.id ?? p._id) === chosen);
  setContext({ orgId, projectId: chosen, projectName: proj?.name });
  return chosen;
}

/** Resolve a bucket id, prompting from the project's bucket list if omitted. */
export async function resolveBucketId(
  region: string,
  projectId: string,
  bucketId?: string
): Promise<string> {
  if (bucketId) return bucketId;
  const client = await createUserApiClient(region);
  const res = await client.post<{ data: any[] }>(ENDPOINTS.BUCKET.LIST, {
    projectId,
  });
  const buckets = res?.data ?? [];
  if (!buckets.length) {
    throw new Error("No buckets found in this project.");
  }
  return promptSelect<string>(
    "Select a bucket",
    buckets.map((b: any) => {
      const id = String(b.id ?? b._id);
      return { name: b.name, value: id, description: `id: ${id}` };
    })
  );
}

/** Prompt for a platform when one isn't supplied via flags. */
export async function resolvePlatform(platform?: string): Promise<string> {
  if (platform) return platform;
  return promptSelect<string>("Select a platform", [
    { name: "android", value: "android" },
    { name: "ios", value: "ios" },
  ]);
}
