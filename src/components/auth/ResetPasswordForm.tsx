import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetPasswordFormProps {
  email: string;
  onBack: () => void;
}

export default function ResetPasswordForm({
  email,
  onBack,
}: ResetPasswordFormProps) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        setIsLoading(false);
        return;
      }

      const { error } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password: newPassword,
      });

      if (error) {
        toast.error(error?.message || "Failed to reset password.");
        setIsLoading(false);
        return;
      }

      toast.success("Password reset successfully!");
      navigate("/login");
    } catch {
      toast.error("Failed to reset password. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { error } = await authClient.forgetPassword.emailOtp({
        email,
      });

      if (error) {
        toast.error(error?.message || "Failed to resend code.");
        setIsResending(false);
        return;
      }

      toast.success("New code sent!");
    } catch {
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <div className="text-center">
        <h1 className="font-heading text-center font-medium text-2xl">
          Set new password
        </h1>
        <p className="text-center mt-2 mb-8 text-muted-foreground">
          Create a new password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter a new password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>
        <p className="text-sm text-slate-800">
          Password must be at least 8 characters long and include uppercase,
          lowercase, numbers, and special characters.
        </p>

        <Button
          type="submit"
          className="w-full cursor-pointer disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Processing...
            </span>
          ) : (
            "Confirm"
          )}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="cursor-pointer font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending ? "Sending new code..." : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer font-medium text-primary hover:text-primary/80"
        >
          Use a different email
        </button>
      </div>

      <div className="text-center mt-4">
        <Link
          to="/login"
          className="text-sm font-medium text-primary hover:text-primary/80 cursor-pointer"
        >
          Back to login
        </Link>
      </div>
    </>
  );
}
