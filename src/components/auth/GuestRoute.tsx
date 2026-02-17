import { Navigate, Outlet } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useAuthHydration } from "@/lib/auth-hydration";

export default function GuestRoute() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const showLoader = useAuthHydration(isLoading);

  if (showLoader) {
    return <FullPageSpinner />;
  }

  // If authenticated, redirect to the auth router which will determine the correct destination
  if (isAuthenticated) {
    return <Navigate to="/auth-router" replace />;
  }

  return <Outlet />;
}
