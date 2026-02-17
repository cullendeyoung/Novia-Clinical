import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function DevSetup() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const createTestOrg = useMutation(api.organizations.createTestOrganization);

  const [orgName, setOrgName] = useState("Test University");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreateOrg = async () => {
    if (!session?.user) {
      toast.error("Please sign in first");
      return;
    }

    setIsLoading(true);
    try {
      await createTestOrg({
        name: orgName,
        ownerAuthUserId: session.user.id,
        ownerEmail: session.user.email,
        ownerFullName: session.user.name || "Test Admin",
      });
      setSuccess(true);
      toast.success("Organization created successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
            Sign In Required
          </h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to create a test organization.
          </p>
          <Button onClick={() => navigate("/login")}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
            Organization Created!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your test organization "{orgName}" has been created with active status.
          </p>
          <Button onClick={() => navigate("/org")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-6 shadow-sm md:p-10">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-2">
              Dev Setup
            </h1>
            <p className="text-muted-foreground">
              Create a test organization with active subscription status.
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              <strong>Signed in as:</strong> {session.user.email}
            </p>
            <p className="text-sm text-slate-500">
              User ID: {session.user.id}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>

            <Button
              onClick={handleCreateOrg}
              className="w-full"
              disabled={isLoading || !orgName.trim()}
            >
              {isLoading ? "Creating..." : "Create Test Organization"}
            </Button>
          </div>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            This creates an organization with "active" status, bypassing Stripe payment.
            Use only for development/testing.
          </p>
        </div>
      </div>
    </div>
  );
}
