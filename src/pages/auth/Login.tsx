import { Link } from "react-router-dom";
import AuthForm from "@/components/auth/AuthForm";

export default function Login() {
  return (
    <div className="w-full rounded-lg bg-white p-4 shadow-sm md:max-w-[500px] md:p-12">
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
