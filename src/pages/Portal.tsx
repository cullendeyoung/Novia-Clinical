import { Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import PortalLogin from "@/components/auth/PortalLogin";
import { useAuthHydration } from "@/lib/auth-hydration";

/**
 * Portal - The main entry point for authenticated users
 *
 * This page serves as a bookmarkable URL for users to access the platform directly.
 * - If not logged in: Shows the portal login form
 * - If logged in: Routes to the appropriate dashboard based on user role
 */
export default function Portal() {
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth();
  const showLoader = useAuthHydration(convexLoading);
  const { data: session } = authClient.useSession();

  // Check if user has a user record (org admin, athletic trainer, etc.)
  const currentUser = useQuery(
    api.users.getCurrent,
    session?.user?.id ? {} : "skip"
  );

  // Check if user has a clinician profile
  const clinician = useQuery(
    api.clinicians.getByUserId,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  // Show loading while checking auth state
  if (showLoader) {
    return <FullPageSpinner />;
  }

  // Not authenticated - show the portal login page
  if (!isAuthenticated) {
    return <PortalLogin />;
  }

  // Still loading user data
  if (currentUser === undefined && clinician === undefined) {
    return <FullPageSpinner />;
  }

  // Route based on user type
  // Org admin -> org dashboard
  if (currentUser && currentUser.role === "org_admin") {
    return <Navigate to="/org" replace />;
  }

  // Athletic trainer -> org dashboard (they work within an org)
  if (currentUser && currentUser.role === "athletic_trainer") {
    return <Navigate to="/org" replace />;
  }

  // Physician -> org dashboard
  if (currentUser && currentUser.role === "physician") {
    return <Navigate to="/org" replace />;
  }

  // Clinician (legacy individual practitioner) -> clinician dashboard
  if (clinician) {
    return <Navigate to="/dashboard" replace />;
  }

  // Any other org user -> org dashboard
  if (currentUser) {
    return <Navigate to="/org" replace />;
  }

  // No profile found - redirect to dashboard which will show appropriate message
  return <Navigate to="/dashboard" replace />;
}
