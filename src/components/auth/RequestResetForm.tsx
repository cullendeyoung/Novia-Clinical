import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RequestResetFormProps {
  onSuccess: (email: string) => void;
}

export default function RequestResetForm({ onSuccess }: RequestResetFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await authClient.forgetPassword.emailOtp({
        email,
      });

      if (error) {
        toast.success(
          "If an account exists with this email, you will receive a password reset code.",
        );
        setIsLoading(false);
        return;
      }

      toast.success(
        "If an account exists with this email, you will receive a password reset code.",
      );
      onSuccess(email);
    } catch {
      toast.success(
        "If an account exists with this email, you will receive a password reset code.",
      );
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center">
        <h1 className="font-heading text-2xl font-medium">Forgot password</h1>
        <p className="text-center mt-2 mb-8 text-muted-foreground">
          Enter your email address to reset your password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending...
            </span>
          ) : (
            "Send"
          )}
        </Button>
      </form>

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
