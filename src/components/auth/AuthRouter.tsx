import { Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";

/**
 * AuthRouter determines where an authenticated user should be directed:
 * - Org admins -> /org
 * - Clinicians -> /dashboard
 * - Other users (athletic trainer, physician, etc.) -> /org
 */
export default function AuthRouter() {
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

  // Still waiting for session
  if (!session?.user?.id) {
    return <FullPageSpinner />;
  }

  // Still loading data - only show spinner if queries are truly loading (undefined)
  if (currentUser === undefined && clinician === undefined) {
    return <FullPageSpinner />;
  }

  // If user is an org_admin, redirect to org dashboard
  if (currentUser && currentUser.role === "org_admin") {
    return <Navigate to="/org" replace />;
  }

  // If user is an athlete, redirect to athlete portal
  if (currentUser && currentUser.role === "athlete") {
    return <Navigate to="/athlete" replace />;
  }

  // If user has a clinician profile, redirect to clinician dashboard
  if (clinician) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user has any user record (athletic trainer, physician, etc.), redirect to org dashboard
  if (currentUser) {
    return <Navigate to="/org" replace />;
  }

  // No profile found - redirect to dashboard which will show appropriate message
  // This handles edge cases like incomplete registration
  return <Navigate to="/dashboard" replace />;
}
