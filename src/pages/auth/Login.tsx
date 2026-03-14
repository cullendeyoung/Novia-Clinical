import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Mail, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AuthForm from "@/components/auth/AuthForm";
import { Button } from "@/components/ui/button";

export default function Login() {
  const location = useLocation();
  const verificationMessage = location.state?.message as string | undefined;
  const registeredEmail = location.state?.email as string | undefined;
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const resendVerificationEmail = useAction(api.authEmail.resendVerificationEmail);

  const handleResendVerification = async () => {
    if (!registeredEmail) {
      toast.error("Email address not found. Please try registering again.");
      return;
    }

    setIsResending(true);
    try {
      const result = await resendVerificationEmail({
        email: registeredEmail,
        callbackURL: window.location.origin + "/login",
      });

      if (result.success) {
        setResendSuccess(true);
        toast.success("Verification email sent! Check your inbox.");
      } else {
        toast.error(result.error || "Failed to send verification email. Please try again.");
      }
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full rounded-lg bg-white p-4 shadow-sm md:max-w-[500px] md:p-12">
      {/* Verification message from registration */}
      {verificationMessage && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Check your email</p>
              <p className="text-sm text-blue-700 mt-1">{verificationMessage}</p>
              {registeredEmail && (
                <div className="mt-3">
                  {resendSuccess ? (
                    <p className="text-sm text-green-700">
                      Verification email sent to {registeredEmail}
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Resend verification email
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl font-semibold mb-2">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          Use your credentials to access your account
        </p>
      </div>

      <AuthForm
        mode="signIn"
        beforeSubmit={
          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary/80 cursor-pointer"
            >
              Forgot Password?
            </Link>
          </div>
        }
      />

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-primary hover:text-primary/80 cursor-pointer"
          >
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
