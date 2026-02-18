import { Link } from "react-router-dom";
import AuthForm from "@/components/auth/AuthForm";
import NoviaLogo from "@/components/ui/NoviaLogo";
import { Shield } from "lucide-react";

/**
 * PortalLogin - Dedicated login page for the /portal route
 *
 * This is a standalone login experience that users can bookmark
 * and access directly without going through the marketing homepage.
 */
export default function PortalLogin() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <NoviaLogo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-green-600" />
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="mb-8 text-center">
              <h1 className="font-heading text-2xl font-semibold text-slate-900">
                Sign in to your portal
              </h1>
              <p className="mt-2 text-muted-foreground">
                Access your dashboard and manage your account
              </p>
            </div>

            <AuthForm
              mode="signIn"
              beforeSubmit={
                <div className="flex items-center justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    Forgot Password?
                  </Link>
                </div>
              }
            />

            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign up
                </Link>
              </p>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Organization administrator?{" "}
                <Link
                  to="/register/organization"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Register your organization
                </Link>
              </p>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Bookmark this page for quick access to your portal
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Novia Clinical. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
