import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  AlertCircle,
  Building2,
  Lock,
} from "lucide-react";
import {
  getStoredRegistrationData,
  clearStoredRegistrationData,
} from "@/lib/registration-storage";

type Status = "loading" | "verifying" | "needs_password" | "creating" | "success" | "error" | "no_session";

type VerifiedData = {
  customerId: string;
  subscriptionId: string;
  organizationName: string;
  email: string;
  fullName: string;
  domain: string;
  plan: string;
  teams: number;
  atsPerTeam: number;
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [verifiedData, setVerifiedData] = useState<VerifiedData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const verifyCheckoutSession = useAction(api.stripe.verifyCheckoutSession);
  const createOrganization = useMutation(api.organizations.createWithSubscription);

  // Step 1: Verify the Stripe checkout session
  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");

      if (!sessionId) {
        setStatus("no_session");
        return;
      }

      setStatus("verifying");

      try {
        const result = await verifyCheckoutSession({ sessionId });

        if (!result.success) {
          setErrorMessage(result.error);
          setStatus("error");
          return;
        }

        // Store verified data from Stripe
        setVerifiedData({
          customerId: result.customerId,
          subscriptionId: result.subscriptionId,
          organizationName: result.organizationName,
          email: result.email,
          fullName: result.fullName,
          domain: result.domain,
          plan: result.plan,
          teams: result.teams,
          atsPerTeam: result.atsPerTeam,
        });

        // Check if we have password from localStorage
        const storedData = getStoredRegistrationData();
        if (storedData?.password && storedData.email === result.email) {
          // We have the password, proceed to create account automatically
          await createAccount(result, storedData.password);
        } else {
          // Need user to enter password
          setStatus("needs_password");
        }
      } catch (err) {
        console.error("Error verifying payment:", err);
        setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
        setStatus("error");
      }
    };

    verifyPayment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Create the account with the given password
  const createAccount = async (data: VerifiedData, userPassword: string) => {
    setStatus("creating");

    try {
      // Create auth account
      const { error, data: authData } = await authClient.signUp.email({
        email: data.email,
        password: userPassword,
        name: data.fullName,
      });

      if (error) {
        // Check if user already exists - try to sign in
        if (error.message?.includes("already exists") || error.message?.includes("already registered")) {
          const signInResult = await authClient.signIn.email({
            email: data.email,
            password: userPassword,
          });

          if (signInResult.error) {
            setErrorMessage("An account with this email already exists. Please sign in instead.");
            setStatus("error");
            return;
          }

          // Successfully signed in, they already have an account
          clearStoredRegistrationData();
          setStatus("success");
          toast.success("Welcome back! Signed in successfully.");
          return;
        }

        setErrorMessage(error.message || "Failed to create account");
        setStatus("error");
        return;
      }

      // Create organization with subscription
      if (authData?.user?.id) {
        await createOrganization({
          name: data.organizationName,
          domain: data.domain || undefined,
          ownerAuthUserId: authData.user.id,
          ownerEmail: data.email,
          ownerFullName: data.fullName,
          teamCount: data.teams,
          maxAthleticTrainersPerTeam: data.atsPerTeam,
          stripeCustomerId: data.customerId,
          stripeSubscriptionId: data.subscriptionId,
          plan: data.plan,
        });
      }

      clearStoredRegistrationData();
      setStatus("success");
      toast.success("Account created successfully!");
    } catch (err) {
      console.error("Error creating account:", err);
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
      setStatus("error");
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!PASSWORD_REGEX.test(password)) {
      toast.error("Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!verifiedData) {
      toast.error("Session data not found");
      return;
    }

    setIsCreating(true);
    await createAccount(verifiedData, password);
    setIsCreating(false);
  };

  // Redirect to dashboard after success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        navigate("/org");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  // Loading/Verifying state
  if (status === "loading" || status === "verifying") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h1 className="font-heading text-2xl font-semibold mb-2">
            {status === "loading" ? "Processing..." : "Verifying Payment..."}
          </h1>
          <p className="text-muted-foreground">
            {status === "loading"
              ? "Please wait while we process your request."
              : "Confirming your payment with Stripe."}
          </p>
        </div>
      </div>
    );
  }

  // Creating account state
  if (status === "creating") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h1 className="font-heading text-2xl font-semibold mb-2">
            Creating Your Account...
          </h1>
          <p className="text-muted-foreground">
            Setting up your organization and admin account.
          </p>
        </div>
      </div>
    );
  }

  // Password entry form
  if (status === "needs_password" && verifiedData) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-white p-6 shadow-sm md:p-10">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="font-heading text-2xl font-semibold mb-2">
                Payment Successful!
              </h1>
              <p className="text-muted-foreground">
                Set a password to complete your account setup.
              </p>
            </div>

            {/* Organization Info */}
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-slate-900">
                  {verifiedData.organizationName}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {verifiedData.email}
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Create a secure password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Min 8 characters with uppercase, lowercase, numbers, and special characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // No session found
  if (status === "no_session") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="font-heading text-2xl font-semibold mb-2">
            Session Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find your payment session. If you completed payment, please contact support.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/register/organization">Start New Registration</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="font-heading text-2xl font-semibold mb-2">
            Something Went Wrong
          </h1>
          <p className="text-muted-foreground mb-2">
            We couldn't create your account.
          </p>
          {errorMessage && (
            <p className="text-sm text-red-600 mb-6">{errorMessage}</p>
          )}
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/login">Try Signing In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/contact">Contact Support</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Your payment was processed. Our team can help set up your account.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="font-heading text-2xl font-semibold mb-2">
          Welcome to Novia!
        </h1>
        <p className="text-muted-foreground mb-2">
          Your account has been created successfully.
        </p>
        {verifiedData && (
          <div className="mt-4 mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-slate-900">
                {verifiedData.organizationName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as {verifiedData.email}
            </p>
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          Redirecting you to your dashboard...
        </p>
        <Button asChild className="w-full">
          <Link to="/org">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
