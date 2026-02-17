import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertCircle,
  Building2,
} from "lucide-react";
import {
  getStoredRegistrationData,
  clearStoredRegistrationData,
  type RegistrationData,
} from "@/lib/registration-storage";

type Status = "loading" | "verifying" | "creating" | "success" | "error" | "no_session";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  const verifyCheckoutSession = useAction(api.stripe.verifyCheckoutSession);
  const createOrganization = useMutation(api.organizations.createWithSubscription);

  useEffect(() => {
    const processPayment = async () => {
      const sessionId = searchParams.get("session_id");

      // If no session ID, check for stored registration data (fallback for old flow)
      if (!sessionId) {
        const storedData = getStoredRegistrationData();
        if (!storedData) {
          setStatus("no_session");
          return;
        }
        // Process with stored data only (legacy flow)
        await processWithStoredData(storedData);
        return;
      }

      // Verify Stripe checkout session
      setStatus("verifying");

      try {
        const result = await verifyCheckoutSession({ sessionId });

        if (!result.success) {
          setErrorMessage(result.error);
          setStatus("error");
          return;
        }

        // Get stored registration data for password
        const storedData = getStoredRegistrationData();
        if (!storedData) {
          setErrorMessage("Registration session expired. Please contact support with your payment confirmation.");
          setStatus("error");
          return;
        }

        // Update registration data with verified info from Stripe
        const verifiedData: RegistrationData = {
          organizationName: result.organizationName,
          email: result.email,
          fullName: result.fullName,
          domain: result.domain,
          plan: result.plan,
          teams: result.teams,
          atsPerTeam: result.atsPerTeam,
          password: storedData.password, // From session storage
          timestamp: storedData.timestamp,
        };

        setRegistrationData(verifiedData);
        setStatus("creating");

        // Create auth account
        const { error, data: authData } = await authClient.signUp.email({
          email: verifiedData.email,
          password: verifiedData.password,
          name: verifiedData.fullName,
        });

        if (error) {
          // Check if user already exists
          if (error.message?.includes("already exists") || error.message?.includes("already registered")) {
            const signInResult = await authClient.signIn.email({
              email: verifiedData.email,
              password: verifiedData.password,
            });

            if (signInResult.error) {
              setErrorMessage(signInResult.error.message || "Failed to sign in to existing account");
              setStatus("error");
              return;
            }

            clearStoredRegistrationData();
            setStatus("success");
            return;
          }

          setErrorMessage(error.message || "Failed to create account");
          setStatus("error");
          return;
        }

        // Create organization with subscription
        if (authData?.user?.id) {
          await createOrganization({
            name: verifiedData.organizationName,
            domain: verifiedData.domain || undefined,
            ownerAuthUserId: authData.user.id,
            ownerEmail: verifiedData.email,
            ownerFullName: verifiedData.fullName,
            teamCount: verifiedData.teams,
            maxAthleticTrainersPerTeam: verifiedData.atsPerTeam,
            stripeCustomerId: result.customerId,
            stripeSubscriptionId: result.subscriptionId,
            plan: verifiedData.plan,
          });
        }

        clearStoredRegistrationData();
        setStatus("success");
        toast.success("Account created successfully!");
      } catch (err) {
        console.error("Error processing payment:", err);
        setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
        setStatus("error");
      }
    };

    const processWithStoredData = async (data: RegistrationData) => {
      setRegistrationData(data);
      setStatus("creating");

      try {
        const { error, data: authData } = await authClient.signUp.email({
          email: data.email,
          password: data.password,
          name: data.fullName,
        });

        if (error) {
          if (error.message?.includes("already exists") || error.message?.includes("already registered")) {
            const signInResult = await authClient.signIn.email({
              email: data.email,
              password: data.password,
            });

            if (signInResult.error) {
              setErrorMessage(signInResult.error.message || "Failed to sign in");
              setStatus("error");
              return;
            }

            clearStoredRegistrationData();
            setStatus("success");
            return;
          }

          setErrorMessage(error.message || "Failed to create account");
          setStatus("error");
          return;
        }

        if (authData?.user?.id) {
          await createOrganization({
            name: data.organizationName,
            domain: data.domain || undefined,
            ownerAuthUserId: authData.user.id,
            ownerEmail: data.email,
            ownerFullName: data.fullName,
            teamCount: data.teams,
            maxAthleticTrainersPerTeam: data.atsPerTeam,
            stripeCustomerId: "", // No Stripe info for legacy flow
            stripeSubscriptionId: "",
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

    processPayment();
  }, [searchParams, verifyCheckoutSession, createOrganization]);

  // Redirect to dashboard after success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        navigate("/org");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  if (status === "loading" || status === "verifying" || status === "creating") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h1 className="font-heading text-2xl font-semibold mb-2">
            {status === "loading" && "Processing..."}
            {status === "verifying" && "Verifying Payment..."}
            {status === "creating" && "Creating Your Account..."}
          </h1>
          <p className="text-muted-foreground">
            {status === "loading" && "Please wait while we process your request."}
            {status === "verifying" && "Confirming your payment with Stripe."}
            {status === "creating" && "Setting up your organization and admin account."}
          </p>
        </div>
      </div>
    );
  }

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
            We couldn't find your payment session. If you completed payment, please contact support with your payment confirmation.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/register/organization">Start New Registration</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
              <Link to="/contact">Contact Support</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/register/organization">Try Again</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Don't worry - if your payment was processed, our team will help you set up your account.
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
        {registrationData && (
          <div className="mt-4 mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-slate-900">
                {registrationData.organizationName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as {registrationData.email}
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
