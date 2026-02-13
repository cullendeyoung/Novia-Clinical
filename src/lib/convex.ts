import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

export const isConvexConfigured = Boolean(convexUrl);

// Create client only if configured, otherwise use a placeholder that will be checked
export const convex = convexUrl
  ? new ConvexReactClient(convexUrl)
  : (null as unknown as ConvexReactClient);
