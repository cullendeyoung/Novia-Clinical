import { Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";

/**
 * AuthRouter determines where an authenticated user should be directed:
 * - Org admins (with or without pending payment) -> /org
 * - Clinicians -> /dashboard
 * - Users with pending payment org -> /org (shows payment page)
 */
export default function AuthRouter() {
  const { data: session } = authClient.useSession();

  // Check for pending payment org by owner ID (works even without full auth context)
  const pendingOrg = useQuery(
    api.organizations.getPendingPaymentOrg,
    session?.user?.id ? { authUserId: session.user.id } : "skip"
  );

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
  if (pendingOrg === undefined && currentUser === undefined && clinician === undefined) {
    return <FullPageSpinner />;
  }

  // If user has a pending payment organization, redirect to org dashboard
  // This takes priority because they need to pay before accessing anything
  if (pendingOrg) {
    return <Navigate to="/org" replace />;
  }

  // If user is an org_admin, redirect to org dashboard
  if (currentUser && currentUser.role === "org_admin") {
    return <Navigate to="/org" replace />;
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
