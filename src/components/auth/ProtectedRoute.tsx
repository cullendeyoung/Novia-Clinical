import { Navigate, Outlet } from "react-router-dom";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useConvexAuth } from "convex/react";
import { useAuthHydration } from "@/lib/auth-hydration";

export default function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const showLoader = useAuthHydration(isLoading);

  if (showLoader) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
