import { useState } from "react";
import { Link } from "react-router-dom";
import AuthForm from "@/components/auth/AuthForm";
import { Checkbox } from "@/components/ui/checkbox";

export default function Register() {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="w-full rounded-lg bg-white p-4 shadow-sm md:max-w-[500px] md:p-12">
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl font-semibold mb-2">
          Create your account
        </h1>
        <p className="text-muted-foreground">
          Sign up to get started with your health journey
        </p>
      </div>

      <AuthForm
        mode="signUp"
        disableSubmit={!agreed}
        beforeSubmit={
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked: boolean) => setAgreed(checked)}
              className="mt-1"
            />
            <label
              htmlFor="terms"
              className="text-sm font-light text-foreground leading-5"
            >
              I have read and agreed to the{" "}
              <Link
                to="/policies/refund"
                className="underline text-foreground hover:text-foreground/80 cursor-pointer"
              >
                refund policy
              </Link>
              , the{" "}
              <Link
                to="/policies/terms"
                className="underline text-foreground hover:text-foreground/80 cursor-pointer"
              >
                terms and conditions
              </Link>
              , and the{" "}
              <Link
                to="/policies/privacy"
                className="underline text-foreground hover:text-foreground/80 cursor-pointer"
              >
                privacy policy
              </Link>
              .
            </label>
          </div>
        }
      />

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary/80 cursor-pointer"
          >
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
