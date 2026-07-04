export const ENDPOINTS = {
  CLI_LOGIN: "https://console.stalliontech.io/dashboard/cli/user",
  USER: {
    VERIFY: "/auth/user-profile",
  },
  UPLOAD: {
    GENERATE_SIGNED_URL: "/cli/gen-signed-url",
    GENERATE_SIGNED_URL_WITH_CI_TOKEN: "/cli/ci/gen-signed-url",
  },
  PROMOTE: {
    PROMOTE_BUNDLE: "/cli/ci/promote",
    UPDATE_RELEASE: "/cli/ci/update-release",
  },
  // All reads go through CLI-owned /cli routes (lean payloads, stable contract).
  // Project-scoped reads also have a /cli/ci variant for CI-token auth.
  ORG: {
    GET_ORG_REGION: "/cli/org/get-region",
    LIST: "/cli/list-orgs", // user token only (org scope needs a user)
  },
  PROJECT: {
    LIST: "/cli/list-projects", // user token only
  },
  BUCKET: {
    LIST: "/cli/list-buckets",
    CI_LIST: "/cli/ci/list-buckets",
  },
  BUNDLE: {
    LIST: "/cli/list-bundles",
    CI_LIST: "/cli/ci/list-bundles",
    // Existence check polled by publish-bundle after upload.
    BY_HASH: "/cli/bundle-by-hash",
    CI_BY_HASH: "/cli/ci/bundle-by-hash",
  },
  PATCH: {
    // Patches generated toward a release bundle (delta updates).
    INFO: "/cli/patch-info",
    CI_INFO: "/cli/ci/patch-info",
  },
  PROMOTED: {
    LISTING: "/cli/list-releases",
    CI_LISTING: "/cli/ci/list-releases",
    LIST_APP_VERSIONS: "/cli/list-app-versions",
    CI_LIST_APP_VERSIONS: "/cli/ci/list-app-versions",
    DETAIL: "/cli/release-info",
    CI_DETAIL: "/cli/ci/release-info",
  },
} as const;
