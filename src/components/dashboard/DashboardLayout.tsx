import { Outlet } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import Sidebar from "./Sidebar";
import SubscriptionRequired from "@/pages/dashboard/SubscriptionRequired";
import SessionConflict from "@/pages/dashboard/SessionConflict";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { useEffect, useState } from "react";

// Generate a unique session ID for this browser tab
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Get or create session ID from sessionStorage (persists across page refreshes, but not new tabs)
function getSessionId() {
  let sessionId = sessionStorage.getItem("novia_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("novia_session_id", sessionId);
  }
  return sessionId;
}

export default function DashboardLayout() {
  const { data: session } = authClient.useSession();
  const [sessionId] = useState(getSessionId);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionConflict, setSessionConflict] = useState(false);

  const clinician = useQuery(
    api.clinicians.getByUserId,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  const subscriptionAccess = useQuery(
    api.subscriptions.checkAccess,
    clinician?._id ? { clinicianId: clinician._id } : "skip"
  );

  const startSession = useMutation(api.clinicians.startSession);
  const heartbeat = useMutation(api.clinicians.heartbeat);

  // Start session on mount
  useEffect(() => {
    if (!session?.user?.id || !clinician || sessionStarted) return;

    const initSession = async () => {
      const result = await startSession({
        userId: session.user.id,
        sessionId,
      });

      if (result.success) {
        setSessionStarted(true);
        setSessionConflict(false);
      } else if (result.existingSession) {
        setSessionConflict(true);
      }
    };

    initSession();
  }, [session?.user?.id, clinician, sessionId, sessionStarted, startSession]);

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!session?.user?.id || !sessionStarted) return;

    const interval = setInterval(() => {
      heartbeat({
        userId: session.user.id,
        sessionId,
      });
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [session?.user?.id, sessionStarted, sessionId, heartbeat]);

  // Handle force login
  const handleForceLogin = async () => {
    if (!session?.user?.id) return;

    const result = await startSession({
      userId: session.user.id,
      sessionId,
    });

    if (result.success) {
      setSessionStarted(true);
      setSessionConflict(false);
    }
  };

  // Loading state
  if (clinician === undefined || subscriptionAccess === undefined) {
    return <FullPageSpinner />;
  }

  // No clinician profile found
  if (clinician === null) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Profile Not Found
          </h1>
          <p className="mt-2 text-muted-foreground">
            Please complete your registration to continue.
          </p>
        </div>
      </div>
    );
  }

  // Session conflict - already logged in elsewhere
  if (sessionConflict && session?.user?.id) {
    return (
      <SessionConflict
        userId={session.user.id}
        onForceLogin={handleForceLogin}
      />
    );
  }

  // Check subscription status
  if (!subscriptionAccess.hasAccess) {
    return (
      <SubscriptionRequired
        reason={
          subscriptionAccess.reason as
            | "no_subscription"
            | "subscription_canceled"
            | "payment_past_due"
            | "trial_expired"
            | "unknown_status"
        }
      />
    );
  }

  // Everything checks out - render dashboard
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar
        clinicianName={clinician.fullName}
        practiceName={undefined} // Will be populated when practice is set up
      />
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet
          context={{
            clinician,
            subscription: subscriptionAccess.subscription,
          }}
        />
      </main>
    </div>
  );
}
