export const ENDPOINTS = {
  CLI_LOGIN: "https://console.stalliontech.io/dashboard/cli/user",
  USER: {
    VERIFY: "/auth/user-profile",
  },
  UPLOAD: {
    GENERATE_SIGNED_URL: "/cli/gen-signed-url",
  },
} as const;
