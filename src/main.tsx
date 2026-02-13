import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { router } from "./router.tsx";
import { convex, isConvexConfigured } from "./lib/convex.ts";
import { authClient } from "./lib/auth-client.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isConvexConfigured ? (
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <RouterProvider router={router} />
      </ConvexBetterAuthProvider>
    ) : (
      <RouterProvider router={router} />
    )}
  </StrictMode>
);
