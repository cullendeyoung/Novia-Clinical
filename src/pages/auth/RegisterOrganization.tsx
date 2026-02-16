import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
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

const TEAM_COUNTS = [
  { value: "1", label: "1 team" },
  { value: "3", label: "Up to 3 teams" },
  { value: "5", label: "Up to 5 teams" },
  { value: "10", label: "Up to 10 teams" },
  { value: "15", label: "Up to 15 teams" },
  { value: "25", label: "Up to 25 teams" },
];

const AT_PER_TEAM = [
  { value: "2", label: "2 athletic trainers per team" },
  { value: "3", label: "3 athletic trainers per team" },
  { value: "5", label: "5 athletic trainers per team" },
  { value: "10", label: "10 athletic trainers per team" },
];

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterOrganization() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: "",
    domain: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    teamCount: "",
    atsPerTeam: "",
  });

  const createOrganization = useMutation(api.organizations.create);

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

    if (!formData.teamCount) {
      toast.error("Please select how many teams you need");
      return;
    }

    if (!formData.atsPerTeam) {
      toast.error("Please select athletic trainers per team");
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
          teamCount: parseInt(formData.teamCount, 10),
          maxAthleticTrainersPerTeam: parseInt(formData.atsPerTeam, 10),
        });
      }

      toast.success("Organization created successfully!");
      navigate("/org/dashboard", { replace: true });
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
                  Plan Configuration
                </p>
              </div>

              {/* Team Count */}
              <div className="space-y-2">
                <Label htmlFor="teamCount">Number of Teams</Label>
                <Select
                  id="teamCount"
                  name="teamCount"
                  required
                  options={TEAM_COUNTS}
                  placeholder="Select team count"
                  value={formData.teamCount}
                  onChange={(e) =>
                    setFormData({ ...formData, teamCount: e.target.value })
                  }
                />
              </div>

              {/* ATs per Team */}
              <div className="space-y-2">
                <Label htmlFor="atsPerTeam">Athletic Trainers per Team</Label>
                <Select
                  id="atsPerTeam"
                  name="atsPerTeam"
                  required
                  options={AT_PER_TEAM}
                  placeholder="Select AT count"
                  value={formData.atsPerTeam}
                  onChange={(e) =>
                    setFormData({ ...formData, atsPerTeam: e.target.value })
                  }
                />
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
                "Create Organization"
              )}
            </Button>
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
