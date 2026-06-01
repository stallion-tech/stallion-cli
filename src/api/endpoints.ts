export const ENDPOINTS = {
  CLI_LOGIN: "https://console-staging.starbase.stalliontech.io/dashboard/cli/user",
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
  },
} as const;
