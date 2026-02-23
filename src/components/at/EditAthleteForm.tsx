import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Phone,
  Heart,
  Shield,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

interface EditAthleteFormProps {
  athleteId: Id<"athletes">;
  onClose: () => void;
  onSaved: () => void;
}

type Sex = "M" | "F" | "Other";
type DominantHand = "Left" | "Right" | "Ambidextrous";

const CLASS_YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "5th Year",
  "Redshirt Freshman",
  "Redshirt Sophomore",
  "Redshirt Junior",
  "Redshirt Senior",
];

export default function EditAthleteForm({ athleteId, onClose, onSaved }: EditAthleteFormProps) {
  const athlete = useQuery(api.athletes.getById, { athleteId });
  const updateAthlete = useMutation(api.athletes.update);

  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("basic");

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    firstName: "",
    lastName: "",
    preferredName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    sex: "" as Sex | "",
    // Athletic Info
    classYear: "",
    jerseyNumber: "",
    position: "",
    heightFeet: "",
    heightInches: "",
    weightLbs: "",
    dominantHand: "" as DominantHand | "",
    // Emergency Contact 1
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    // Emergency Contact 2
    emergencyContact2Name: "",
    emergencyContact2Phone: "",
    emergencyContact2Relationship: "",
    // Medical History
    allergies: "",
    medications: "",
    medicalConditions: "",
    previousSurgeries: "",
    previousInjuries: "",
    // Insurance
    insuranceProvider: "",
    insurancePolicyNumber: "",
    insuranceGroupNumber: "",
    insurancePhone: "",
    policyHolderName: "",
    policyHolderRelationship: "",
    // Primary Care
    primaryPhysicianName: "",
    primaryPhysicianPhone: "",
    // Notes
    notes: "",
  });

  // Load athlete data into form
  useEffect(() => {
    if (athlete) {
      const heightFeet = athlete.heightInches ? Math.floor(athlete.heightInches / 12).toString() : "";
      const heightInchesRemainder = athlete.heightInches ? (athlete.heightInches % 12).toString() : "";

      setFormData({
        firstName: athlete.firstName || "",
        lastName: athlete.lastName || "",
        preferredName: athlete.preferredName || "",
        email: athlete.email || "",
        phone: athlete.phone || "",
        dateOfBirth: athlete.dateOfBirth || "",
        sex: (athlete.sex as Sex) || "",
        classYear: athlete.classYear || "",
        jerseyNumber: athlete.jerseyNumber || "",
        position: athlete.position || "",
        heightFeet,
        heightInches: heightInchesRemainder,
        weightLbs: athlete.weightLbs?.toString() || "",
        dominantHand: (athlete.dominantHand as DominantHand) || "",
        emergencyContactName: athlete.emergencyContactName || "",
        emergencyContactPhone: athlete.emergencyContactPhone || "",
        emergencyContactRelationship: athlete.emergencyContactRelationship || "",
        emergencyContact2Name: athlete.emergencyContact2Name || "",
        emergencyContact2Phone: athlete.emergencyContact2Phone || "",
        emergencyContact2Relationship: athlete.emergencyContact2Relationship || "",
        allergies: athlete.allergies || "",
        medications: athlete.medications || "",
        medicalConditions: athlete.medicalConditions || "",
        previousSurgeries: athlete.previousSurgeries || "",
        previousInjuries: athlete.previousInjuries || "",
        insuranceProvider: athlete.insuranceProvider || "",
        insurancePolicyNumber: athlete.insurancePolicyNumber || "",
        insuranceGroupNumber: athlete.insuranceGroupNumber || "",
        insurancePhone: athlete.insurancePhone || "",
        policyHolderName: athlete.policyHolderName || "",
        policyHolderRelationship: athlete.policyHolderRelationship || "",
        primaryPhysicianName: athlete.primaryPhysicianName || "",
        primaryPhysicianPhone: athlete.primaryPhysicianPhone || "",
        notes: athlete.notes || "",
      });
    }
  }, [athlete]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }

    setIsSaving(true);
    try {
      // Calculate height in inches
      const heightInches =
        formData.heightFeet || formData.heightInches
          ? (parseInt(formData.heightFeet || "0") * 12) + parseInt(formData.heightInches || "0")
          : undefined;

      await updateAthlete({
        athleteId,
        // Basic Info
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        preferredName: formData.preferredName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        sex: formData.sex || undefined,
        // Athletic Info
        classYear: formData.classYear || undefined,
        jerseyNumber: formData.jerseyNumber.trim() || undefined,
        position: formData.position.trim() || undefined,
        heightInches: heightInches || undefined,
        weightLbs: formData.weightLbs ? parseInt(formData.weightLbs) : undefined,
        dominantHand: formData.dominantHand || undefined,
        // Emergency Contacts
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: formData.emergencyContactRelationship.trim() || undefined,
        emergencyContact2Name: formData.emergencyContact2Name.trim() || undefined,
        emergencyContact2Phone: formData.emergencyContact2Phone.trim() || undefined,
        emergencyContact2Relationship: formData.emergencyContact2Relationship.trim() || undefined,
        // Medical History
        allergies: formData.allergies.trim() || undefined,
        medications: formData.medications.trim() || undefined,
        medicalConditions: formData.medicalConditions.trim() || undefined,
        previousSurgeries: formData.previousSurgeries.trim() || undefined,
        previousInjuries: formData.previousInjuries.trim() || undefined,
        // Insurance
        insuranceProvider: formData.insuranceProvider.trim() || undefined,
        insurancePolicyNumber: formData.insurancePolicyNumber.trim() || undefined,
        insuranceGroupNumber: formData.insuranceGroupNumber.trim() || undefined,
        insurancePhone: formData.insurancePhone.trim() || undefined,
        policyHolderName: formData.policyHolderName.trim() || undefined,
        policyHolderRelationship: formData.policyHolderRelationship.trim() || undefined,
        // Primary Care
        primaryPhysicianName: formData.primaryPhysicianName.trim() || undefined,
        primaryPhysicianPhone: formData.primaryPhysicianPhone.trim() || undefined,
        // Notes
        notes: formData.notes.trim() || undefined,
      });

      toast.success("Profile updated successfully");
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!athlete) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sections = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "athletic", label: "Athletic", icon: User },
    { id: "emergency", label: "Emergency", icon: Phone },
    { id: "medical", label: "Medical", icon: Heart },
    { id: "insurance", label: "Insurance", icon: Shield },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Edit Profile</h1>
            <p className="text-muted-foreground mt-0.5">
              {athlete.firstName} {athlete.lastName}
            </p>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeSection === section.id
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 max-w-4xl">
        {/* Basic Info Section */}
        {activeSection === "basic" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Basic Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="preferredName">Preferred Name / Nickname</Label>
                <Input
                  id="preferredName"
                  value={formData.preferredName}
                  onChange={(e) => handleChange("preferredName", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <div className="relative mt-1">
                  <select
                    id="sex"
                    value={formData.sex}
                    onChange={(e) => handleChange("sex", e.target.value)}
                    className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Athletic Info Section */}
        {activeSection === "athletic" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-green-500" />
              Athletic Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="classYear">Class Year</Label>
                <div className="relative mt-1">
                  <select
                    id="classYear"
                    value={formData.classYear}
                    onChange={(e) => handleChange("classYear", e.target.value)}
                    className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {CLASS_YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <Label htmlFor="jerseyNumber">Jersey Number</Label>
                <Input
                  id="jerseyNumber"
                  value={formData.jerseyNumber}
                  onChange={(e) => handleChange("jerseyNumber", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dominantHand">Dominant Hand</Label>
                <div className="relative mt-1">
                  <select
                    id="dominantHand"
                    value={formData.dominantHand}
                    onChange={(e) => handleChange("dominantHand", e.target.value)}
                    className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                    <option value="Ambidextrous">Ambidextrous</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <Label>Height</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Feet"
                      value={formData.heightFeet}
                      onChange={(e) => handleChange("heightFeet", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Inches"
                      value={formData.heightInches}
                      onChange={(e) => handleChange("heightInches", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="weightLbs">Weight (lbs)</Label>
                <Input
                  id="weightLbs"
                  type="number"
                  value={formData.weightLbs}
                  onChange={(e) => handleChange("weightLbs", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Emergency Contact Section */}
        {activeSection === "emergency" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-amber-500" />
                Primary Emergency Contact
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="emergencyContactName">Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleChange("emergencyContactName", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContactPhone">Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleChange("emergencyContactPhone", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Input
                    id="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => handleChange("emergencyContactRelationship", e.target.value)}
                    placeholder="e.g., Parent, Spouse"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-amber-500" />
                Secondary Emergency Contact
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="emergencyContact2Name">Name</Label>
                  <Input
                    id="emergencyContact2Name"
                    value={formData.emergencyContact2Name}
                    onChange={(e) => handleChange("emergencyContact2Name", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact2Phone">Phone</Label>
                  <Input
                    id="emergencyContact2Phone"
                    type="tel"
                    value={formData.emergencyContact2Phone}
                    onChange={(e) => handleChange("emergencyContact2Phone", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContact2Relationship">Relationship</Label>
                  <Input
                    id="emergencyContact2Relationship"
                    value={formData.emergencyContact2Relationship}
                    onChange={(e) => handleChange("emergencyContact2Relationship", e.target.value)}
                    placeholder="e.g., Parent, Spouse"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medical History Section */}
        {activeSection === "medical" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Medical History
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  <textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => handleChange("allergies", e.target.value)}
                    placeholder="List any known allergies (medications, foods, environmental)"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="medications">Current Medications</Label>
                  <textarea
                    id="medications"
                    value={formData.medications}
                    onChange={(e) => handleChange("medications", e.target.value)}
                    placeholder="List current medications and dosages"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="medicalConditions">Medical Conditions</Label>
                  <textarea
                    id="medicalConditions"
                    value={formData.medicalConditions}
                    onChange={(e) => handleChange("medicalConditions", e.target.value)}
                    placeholder="List any chronic conditions (asthma, diabetes, heart conditions, etc.)"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="previousSurgeries">Previous Surgeries</Label>
                  <textarea
                    id="previousSurgeries"
                    value={formData.previousSurgeries}
                    onChange={(e) => handleChange("previousSurgeries", e.target.value)}
                    placeholder="List any previous surgeries with dates"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="previousInjuries">Previous Injuries (Before Team)</Label>
                  <textarea
                    id="previousInjuries"
                    value={formData.previousInjuries}
                    onChange={(e) => handleChange("previousInjuries", e.target.value)}
                    placeholder="List any significant injuries prior to joining the team"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Primary Care Physician
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="primaryPhysicianName">Physician Name</Label>
                  <Input
                    id="primaryPhysicianName"
                    value={formData.primaryPhysicianName}
                    onChange={(e) => handleChange("primaryPhysicianName", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="primaryPhysicianPhone">Phone</Label>
                  <Input
                    id="primaryPhysicianPhone"
                    type="tel"
                    value={formData.primaryPhysicianPhone}
                    onChange={(e) => handleChange("primaryPhysicianPhone", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Notes</h2>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Any additional notes about this athlete"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px]"
              />
            </div>
          </div>
        )}

        {/* Insurance Section */}
        {activeSection === "insurance" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              Insurance Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={(e) => handleChange("insuranceProvider", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="insurancePhone">Insurance Phone</Label>
                <Input
                  id="insurancePhone"
                  type="tel"
                  value={formData.insurancePhone}
                  onChange={(e) => handleChange("insurancePhone", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                <Input
                  id="insurancePolicyNumber"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => handleChange("insurancePolicyNumber", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="insuranceGroupNumber">Group Number</Label>
                <Input
                  id="insuranceGroupNumber"
                  value={formData.insuranceGroupNumber}
                  onChange={(e) => handleChange("insuranceGroupNumber", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="policyHolderName">Policy Holder Name</Label>
                <Input
                  id="policyHolderName"
                  value={formData.policyHolderName}
                  onChange={(e) => handleChange("policyHolderName", e.target.value)}
                  placeholder="If different from athlete"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="policyHolderRelationship">Relationship to Policy Holder</Label>
                <Input
                  id="policyHolderRelationship"
                  value={formData.policyHolderRelationship}
                  onChange={(e) => handleChange("policyHolderRelationship", e.target.value)}
                  placeholder="e.g., Self, Dependent"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
