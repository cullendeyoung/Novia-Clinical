import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import {
  CheckCircle,
  Building2,
  Users,
  Shield,
  Activity,
} from "lucide-react";

const PRICING_PLANS = [
  {
    value: "single_team_trial",
    label: "Single Team Trial - $299/month",
    description: "1 team, 1 athletic trainer",
    teams: 1,
    atsPerTeam: 1,
  },
  {
    value: "department",
    label: "Department - $8,399/year",
    description: "Up to 5 teams, 2 athletic trainers per team",
    teams: 5,
    atsPerTeam: 2,
  },
  {
    value: "program",
    label: "Program - $17,999/year",
    description: "Up to 15 teams, 3 athletic trainers per team",
    teams: 15,
    atsPerTeam: 3,
  },
  {
    value: "enterprise",
    label: "Enterprise - Custom pricing",
    description: "Unlimited teams and athletic trainers",
    teams: 999,
    atsPerTeam: 999,
  },
];

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterOrganization() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: "",
    domain: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    plan: "",
  });

  const createOrganization = useMutation(api.organizations.create);

  // Check if signed-in user has a pending payment organization
  const pendingOrg = useQuery(
    api.organizations.getPendingPaymentOrg,
    session?.user?.id ? { authUserId: session.user.id } : "skip"
  );

  // Track if we're still checking for pending org
  const isCheckingPendingOrg = session?.user?.id && pendingOrg === undefined;

  // Redirect to payment if user has pending payment org
  useEffect(() => {
    if (pendingOrg) {
      const params = new URLSearchParams({
        plan: pendingOrg.plan,
        org: pendingOrg.name,
      });
      navigate(`/register/organization/payment?${params.toString()}`, { replace: true });
    }
  }, [pendingOrg, navigate]);

  // Show loading while checking for pending payment org
  if (isCheckingPendingOrg) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Checking account status...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!agreed) {
      toast.error("Please agree to the terms to continue");
      return;
    }

    if (!formData.organizationName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }

    if (!formData.plan) {
      toast.error("Please select a plan");
      return;
    }

    const selectedPlan = PRICING_PLANS.find((p) => p.value === formData.plan);
    if (!selectedPlan) {
      toast.error("Invalid plan selected");
      return;
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters"
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Create auth account first
      const { error, data } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
      });

      if (error) {
        toast.error(error?.message || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Create organization and org admin user
      if (data?.user?.id) {
        await createOrganization({
          name: formData.organizationName,
          domain: formData.domain || undefined,
          ownerAuthUserId: data.user.id,
          ownerEmail: formData.email,
          ownerFullName: formData.fullName,
          teamCount: selectedPlan.teams,
          maxAthleticTrainersPerTeam: selectedPlan.atsPerTeam,
        });
      }

      toast.success("Organization created successfully!");
      // Redirect to payment page with plan and org name
      const params = new URLSearchParams({
        plan: formData.plan,
        org: formData.organizationName,
      });
      navigate(`/register/organization/payment?${params.toString()}`, { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(
        `Registration failed: ${error instanceof Error ? error.message : "Please try again"}`
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        {/* Left side - Form */}
        <div className="w-full rounded-lg bg-white p-6 shadow-sm md:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-semibold mb-2">
              Register Your Organization
            </h1>
            <p className="text-muted-foreground">
              Set up your athletic department or organization
            </p>
            {/* Step Indicators */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  1
                </div>
                <span className="text-sm font-medium text-slate-900">Create Organization</span>
              </div>
              <div className="h-px w-8 bg-slate-300" />
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-500">
                  2
                </div>
                <span className="text-sm text-slate-500">Payment</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  placeholder="University of Vermont"
                  value={formData.organizationName}
                  onChange={(e) =>
                    setFormData({ ...formData, organizationName: e.target.value })
                  }
                />
              </div>

              {/* Domain (optional) */}
              <div className="space-y-2">
                <Label htmlFor="domain">Email Domain (Optional)</Label>
                <Input
                  id="domain"
                  name="domain"
                  type="text"
                  placeholder="uvm.edu"
                  value={formData.domain}
                  onChange={(e) =>
                    setFormData({ ...formData, domain: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Used for email verification of staff members
                </p>
              </div>

              <div className="border-t border-slate-200 my-4 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Your Account (Organization Admin)
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Dr. Jane Smith"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jsmith@university.edu"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Min 8 characters with uppercase, lowercase, numbers, and
                  special characters
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                />
              </div>

              <div className="border-t border-slate-200 my-4 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Confirm Your Plan
                </p>
              </div>

              {/* Plan Selection */}
              <div className="space-y-2">
                <Label htmlFor="plan">Select Plan</Label>
                <Select
                  id="plan"
                  name="plan"
                  required
                  options={PRICING_PLANS.map((plan) => ({
                    value: plan.value,
                    label: plan.label,
                  }))}
                  placeholder="Select a plan"
                  value={formData.plan}
                  onChange={(e) =>
                    setFormData({ ...formData, plan: e.target.value })
                  }
                />
                {formData.plan && (
                  <p className="text-sm text-muted-foreground">
                    {PRICING_PLANS.find((p) => p.value === formData.plan)?.description}
                  </p>
                )}
                {formData.plan === "enterprise" && (
                  <p className="text-xs text-primary">
                    Payment will be arranged after organization setup
                  </p>
                )}
              </div>
            </div>

            {/* Terms Agreement */}
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
                I agree to the{" "}
                <Link
                  to="/policies/terms"
                  className="underline text-foreground hover:text-foreground/80"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/policies/privacy"
                  className="underline text-foreground hover:text-foreground/80"
                >
                  Privacy Policy
                </Link>
                , including HIPAA compliance requirements and BAA agreement.
              </label>
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer disabled:cursor-not-allowed"
              disabled={isLoading || !agreed}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating organization...
                </span>
              ) : (
                "Continue to Payment"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You'll complete payment setup in the next step
            </p>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80"
              >
                Sign in
              </Link>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Looking for individual clinician plans?{" "}
              <Link
                to="/register"
                className="font-medium text-primary hover:text-primary/80"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Right side - Benefits */}
        <div className="hidden lg:flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-slate-900">
              Why athletic departments choose Novia
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Quick setup</div>
                  <div className="text-sm text-muted-foreground">
                    Get your teams up and running in minutes
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Unlimited athletes</div>
                  <div className="text-sm text-muted-foreground">
                    Add your entire roster at no extra cost
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">HIPAA compliant</div>
                  <div className="text-sm text-muted-foreground">
                    Enterprise-grade security with BAA available
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Complete injury tracking</div>
                  <div className="text-sm text-muted-foreground">
                    From initial eval to return-to-play clearance
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-6">
            <blockquote className="text-slate-700">
              "Novia has transformed how we document athletic injuries. Our ATs
              save hours every week, and our compliance has never been better."
            </blockquote>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                MJ
              </div>
              <div>
                <div className="font-medium text-slate-900">
                  Dr. Michael Johnson
                </div>
                <div className="text-sm text-muted-foreground">
                  Head Team Physician, State University
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
