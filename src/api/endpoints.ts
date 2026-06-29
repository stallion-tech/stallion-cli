export const ENDPOINTS = {
  CLI_LOGIN: "http://localhost:3000/dashboard/cli/user",
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
  ORG: {
    GET_ORG_REGION: "/cli/org/get-region",
    LIST: "/org/list",
  },
  PROJECT: {
    LIST: "/project/list",
    DETAIL: "/project/detail",
  },
  BUCKET: {
    LIST: "/bucket/list",
  },
  BUNDLE: {
    LIST: "/bundle/list",
    ADVANCE_LISTING: "/bundle/advance-listing",
  },
  PROMOTED: {
    LISTING: "/promoted/promoted-bundle-listing",
    LIST_APP_VERSIONS: "/promoted/list-app-versions",
    DETAIL: "/promoted/promoted-bundle-detail",
  },
} as const;
