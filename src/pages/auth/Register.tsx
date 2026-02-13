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
import { CheckCircle } from "lucide-react";

const SPECIALTIES = [
  { value: "physician", label: "Physician / MD / DO" },
  { value: "physical_therapist", label: "Physical Therapist" },
  { value: "chiropractor", label: "Chiropractor" },
  { value: "dentist", label: "Dentist" },
  { value: "psychologist", label: "Psychologist" },
  { value: "psychiatrist", label: "Psychiatrist" },
  { value: "nurse_practitioner", label: "Nurse Practitioner" },
  { value: "physician_assistant", label: "Physician Assistant" },
  { value: "athletic_trainer", label: "Athletic Trainer" },
  { value: "personal_trainer", label: "Personal Trainer / Coach" },
  { value: "occupational_therapist", label: "Occupational Therapist" },
  { value: "speech_therapist", label: "Speech-Language Pathologist" },
  { value: "massage_therapist", label: "Massage Therapist" },
  { value: "acupuncturist", label: "Acupuncturist" },
  { value: "other", label: "Other Healthcare Provider" },
];

const PRACTICE_SIZES = [
  { value: "solo", label: "Solo Practice (1 clinician)" },
  { value: "small", label: "Small Practice (2-5 clinicians)" },
  { value: "medium", label: "Medium Practice (6-10 clinicians)" },
  { value: "large", label: "Large Practice (11+ clinicians)" },
];

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    specialty: "",
    practiceSize: "",
    hasExistingEhr: true, // Default to EHR integration (lower price)
  });

  const createClinician = useMutation(api.clinicians.create);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!agreed) {
      toast.error("Please agree to the terms to continue");
      return;
    }

    if (!formData.specialty) {
      toast.error("Please select your specialty");
      return;
    }

    if (!formData.practiceSize) {
      toast.error("Please select your practice size");
      return;
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters"
      );
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

      // Create clinician profile
      if (data?.user?.id) {
        await createClinician({
          userId: data.user.id,
          fullName: formData.fullName,
          email: formData.email,
          specialty: formData.specialty,
          practiceSize: formData.practiceSize,
          hasExistingEhr: formData.hasExistingEhr,
        });
      }

      toast.success("Account created successfully!");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(
        `Registration failed: ${error instanceof Error ? error.message : "Please try again"}`
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        {/* Left side - Form */}
        <div className="w-full rounded-lg bg-white p-6 shadow-sm md:p-10">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-2xl font-semibold mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Start documenting smarter with AI-powered clinical notes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
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
                  placeholder="jane@clinic.com"
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

              {/* Specialty */}
              <div className="space-y-2">
                <Label htmlFor="specialty">Profession / Specialty</Label>
                <Select
                  id="specialty"
                  name="specialty"
                  required
                  options={SPECIALTIES}
                  placeholder="Select your specialty"
                  value={formData.specialty}
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                />
              </div>

              {/* Practice Size */}
              <div className="space-y-2">
                <Label htmlFor="practiceSize">Practice Size</Label>
                <Select
                  id="practiceSize"
                  name="practiceSize"
                  required
                  options={PRACTICE_SIZES}
                  placeholder="Select practice size"
                  value={formData.practiceSize}
                  onChange={(e) =>
                    setFormData({ ...formData, practiceSize: e.target.value })
                  }
                />
              </div>

              {/* EHR Integration Choice */}
              <div className="space-y-3 rounded-lg border border-input p-4">
                <Label className="text-sm font-medium">
                  Documentation Storage
                </Label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input p-3 hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input
                      type="radio"
                      name="ehrChoice"
                      value="ehr"
                      checked={formData.hasExistingEhr}
                      onChange={() =>
                        setFormData({ ...formData, hasExistingEhr: true })
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">
                        I have an existing EHR/EMR
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Export notes directly to your current system (Epic,
                        Cerner, etc.)
                      </div>
                      <div className="mt-1 text-sm font-medium text-primary">
                        Starting at $199/month
                      </div>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input p-3 hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input
                      type="radio"
                      name="ehrChoice"
                      value="standalone"
                      checked={!formData.hasExistingEhr}
                      onChange={() =>
                        setFormData({ ...formData, hasExistingEhr: false })
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">
                        Use Novia as my documentation system
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Full patient management and note storage included
                      </div>
                      <div className="mt-1 text-sm font-medium text-primary">
                        Starting at $249/month
                      </div>
                    </div>
                  </label>
                </div>
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
                , including HIPAA compliance requirements.
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
                  Creating account...
                </span>
              ) : (
                "Create Account"
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
                Log in here
              </Link>
            </p>
          </div>
        </div>

        {/* Right side - Benefits */}
        <div className="hidden lg:flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            <h2 className="font-heading text-2xl font-semibold text-slate-900">
              Why clinicians love Novia
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">14-day free trial</div>
                  <div className="text-sm text-muted-foreground">
                    Try all features before committing
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">No credit card required</div>
                  <div className="text-sm text-muted-foreground">
                    Start your trial instantly
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">HIPAA compliant</div>
                  <div className="text-sm text-muted-foreground">
                    Your patient data is secure and encrypted
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Cancel anytime</div>
                  <div className="text-sm text-muted-foreground">
                    No long-term contracts or commitments
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-6">
            <blockquote className="text-slate-700">
              "Novia has cut my documentation time in half. I spend more time
              with patients and less time typing notes."
            </blockquote>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                SC
              </div>
              <div>
                <div className="font-medium text-slate-900">Dr. Sarah Chen</div>
                <div className="text-sm text-muted-foreground">
                  Family Physician
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
