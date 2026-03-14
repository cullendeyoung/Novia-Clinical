import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { RefreshCw, Mail } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormProps {
  mode: "signIn" | "signUp";
  disableSubmit?: boolean;
  onDisabledSubmit?: () => void;
  beforeSubmit?: React.ReactNode;
}

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function AuthForm({
  mode,
  disableSubmit = false,
  onDisabledSubmit,
  beforeSubmit,
}: AuthFormProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const resendVerificationEmail = useAction(api.authEmail.resendVerificationEmail);

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;

    setIsResending(true);
    try {
      const result = await resendVerificationEmail({
        email: unverifiedEmail,
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (disableSubmit) {
      onDisabledSubmit?.();
      return;
    }

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      if (mode === "signUp") {
        if (!PASSWORD_REGEX.test(password)) {
          toast.error(
            "Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters",
          );
          setIsLoading(false);
          return;
        }

        const { error } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0],
        });

        if (error) {
          toast.error(error?.message || "Failed to create account.");
          setIsLoading(false);
          return;
        }

        toast.success("Account created!");
        navigate("/dashboard", { replace: true });
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/dashboard",
        });

        if (error) {
          const errorMessage = error?.message || "Authentication failed.";
          // Check if the error is about email verification
          if (errorMessage.toLowerCase().includes("verif") ||
              errorMessage.toLowerCase().includes("not verified")) {
            setUnverifiedEmail(email);
            setResendSuccess(false);
          }
          toast.error(errorMessage);
          setIsLoading(false);
          return;
        }

        toast.success("Welcome back!");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        `Authentication failed: ${error instanceof Error ? error.message : "Please try again."}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            minLength={8}
            placeholder={
              mode === "signUp" ? "Create a password" : "Enter your password"
            }
          />
          {mode === "signUp" && (
            <p className="text-sm text-muted-foreground">
              Minimum 8 characters, including uppercase, lowercase, numbers, and
              special characters.
            </p>
          )}
        </div>
      </div>

      {beforeSubmit}

      {/* Unverified email notice with resend option */}
      {mode === "signIn" && unverifiedEmail && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Email not verified</p>
              <p className="text-sm text-amber-700 mt-1">
                Please verify your email before signing in.
              </p>
              <div className="mt-3">
                {resendSuccess ? (
                  <p className="text-sm text-green-700">
                    Verification email sent to {unverifiedEmail}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="text-amber-700 border-amber-300 hover:bg-amber-100"
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
            </div>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full cursor-pointer disabled:cursor-not-allowed"
        disabled={isLoading || disableSubmit}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {mode === "signIn" ? "Signing in..." : "Creating account..."}
          </span>
        ) : mode === "signIn" ? (
          "Sign In"
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
