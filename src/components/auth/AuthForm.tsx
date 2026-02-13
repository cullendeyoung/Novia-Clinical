import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
          toast.error(error?.message || "Authentication failed.");
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
