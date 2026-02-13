import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { crossDomainClient } from "@/lib/cross-domain-client";

// Derive the Convex site URL from the cloud URL
// e.g., https://abc-123.convex.cloud -> https://abc-123.convex.site
const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const convexSiteUrl = convexUrl?.replace(".convex.cloud", ".convex.site");

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient(), crossDomainClient(), emailOTPClient()],
  sessionOptions: {
    refetchOnWindowFocus: false,
    refetchInterval: 0,
  },
});
