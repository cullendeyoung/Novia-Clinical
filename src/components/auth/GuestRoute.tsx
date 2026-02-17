import { Navigate, Outlet } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useAuthHydration } from "@/lib/auth-hydration";

export default function GuestRoute() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const showLoader = useAuthHydration(isLoading);

  // Check if user is an org admin (has a user record with org_admin role)
  const currentUser = useQuery(
    api.users.getCurrent,
    isAuthenticated && session?.user?.id ? {} : "skip"
  );

  // Check if user has a clinician profile
  const clinician = useQuery(
    api.clinicians.getByUserId,
    isAuthenticated && session?.user?.id ? { userId: session.user.id } : "skip"
  );

  if (showLoader) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    // Still loading user data
    if (currentUser === undefined || clinician === undefined) {
      return <FullPageSpinner />;
    }

    // If user is an org_admin, redirect to org dashboard
    if (currentUser && currentUser.role === "org_admin") {
      return <Navigate to="/org" replace />;
    }

    // If user has a clinician profile, redirect to clinician dashboard
    if (clinician) {
      return <Navigate to="/dashboard" replace />;
    }

    // Default to dashboard (will handle edge cases there)
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
