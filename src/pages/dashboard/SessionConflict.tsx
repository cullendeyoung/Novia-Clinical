import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Monitor } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type SessionConflictProps = {
  userId: string;
  onForceLogin: () => void;
};

export default function SessionConflict({
  userId,
  onForceLogin,
}: SessionConflictProps) {
  const [isForcing, setIsForcing] = useState(false);
  const forceEndAllSessions = useMutation(api.clinicians.forceEndAllSessions);

  const handleForceLogin = async () => {
    setIsForcing(true);
    try {
      await forceEndAllSessions({ userId });
      toast.success("Other sessions ended. Logging you in...");
      onForceLogin();
    } catch {
      toast.error("Failed to end other sessions. Please try again.");
      setIsForcing(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
          <Monitor className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Already Logged In Elsewhere
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your account is currently active on another device or browser. For
          security reasons, only one active session is allowed at a time.
        </p>
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-left text-sm">
          <p className="font-medium text-slate-900">Options:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>1. Log out from the other device and try again</li>
            <li>2. Force login here (will end all other sessions)</li>
          </ul>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleForceLogin} disabled={isForcing} size="lg">
            {isForcing ? "Ending other sessions..." : "Force Login Here"}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          If you didn't initiate the other session, please change your password
          after logging in.
        </p>
      </div>
    </div>
  );
}
