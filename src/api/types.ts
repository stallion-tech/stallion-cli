/**
 * Payload shapes returned by the CLI-owned /cli read routes. Optional fields
 * may be omitted by older deployments; some routes send `_id` instead of `id`.
 */

export interface UserProfile {
  fullName?: string;
  email?: string;
}

export interface ProjectSummary {
  id?: string;
  _id?: string;
  name?: string;
  androidEnabled?: boolean;
  iosEnabled?: boolean;
  isPatchEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BucketSummary {
  id?: string;
  _id?: string;
  name?: string;
  updatedAt?: string;
}

export interface BundleAuthor {
  fullName?: string;
  email?: string;
}

export interface BundleSummary {
  id?: string;
  _id?: string;
  version?: number;
  platform?: string;
  isPromoted?: boolean;
  size?: number;
  sha256Checksum?: string | null;
  createdAt?: string;
  releaseNote?: string;
  author?: BundleAuthor;
}

export interface AppVersionSummary {
  targetVersion?: string;
  count?: number;
  latestReleaseUserEmail?: string;
}

export interface ReleaseSummary {
  id?: string;
  bundleVersion?: number;
  hash?: string;
  rolloutPercent?: number;
  isPaused?: boolean;
  isRolledBack?: boolean;
  releaseNote?: string;
  createdAt?: string;
  author?: BundleAuthor;
}

export interface ReleaseDetail {
  bundleVersion?: number;
  platform?: string;
  appVersion?: string;
  rolloutPercent?: number;
  isPaused?: boolean;
  isRolledBack?: boolean;
  releaseNote?: string;
  totalUsers?: number;
  publishedBundle?: { sha256Checksum?: string };
  /** Adoption counters keyed by event name (e.g. INSTALLED_PROD). */
  eventCount?: Record<string, number>;
}

/** A release the patch diffs from/to, as embedded in patch-info. */
export interface PatchReleaseRef {
  bundleVersion?: number;
  appVersion?: string;
  platform?: string;
  createdAt?: string;
}

export interface PatchInfo {
  patchId?: string;
  bundleDiffSize?: number | null;
  totalPatchSize?: number | null;
  fromProdBundle?: PatchReleaseRef | null;
  toProdBundle?: PatchReleaseRef | null;
}
