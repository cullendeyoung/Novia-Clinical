import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  AlertCircle,
  Shield,
  Heart,
  Edit,
  Save,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AthleteMyProfile() {
  const profile = useQuery(api.athletePortal.getMyProfile);
  const updateProfile = useMutation(api.athletePortal.updateMyProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contact: true,
    emergency: false,
    insurance: false,
    medical: false,
  });

  // Form state
  const [formData, setFormData] = useState({
    phone: "",
    addressStreet: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    emergencyContact2Name: "",
    emergencyContact2Phone: "",
    emergencyContact2Relationship: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    insuranceGroupNumber: "",
    insurancePhone: "",
    policyHolderName: "",
    policyHolderRelationship: "",
    primaryPhysicianName: "",
    primaryPhysicianPhone: "",
  });

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  const handleStartEditing = () => {
    setFormData({
      phone: profile.phone || "",
      addressStreet: profile.addressStreet || "",
      addressCity: profile.addressCity || "",
      addressState: profile.addressState || "",
      addressZip: profile.addressZip || "",
      emergencyContactName: profile.emergencyContactName || "",
      emergencyContactPhone: profile.emergencyContactPhone || "",
      emergencyContactRelationship: profile.emergencyContactRelationship || "",
      emergencyContact2Name: profile.emergencyContact2Name || "",
      emergencyContact2Phone: profile.emergencyContact2Phone || "",
      emergencyContact2Relationship: profile.emergencyContact2Relationship || "",
      insuranceProvider: profile.insuranceProvider || "",
      insurancePolicyNumber: profile.insurancePolicyNumber || "",
      insuranceGroupNumber: profile.insuranceGroupNumber || "",
      insurancePhone: profile.insurancePhone || "",
      policyHolderName: profile.policyHolderName || "",
      policyHolderRelationship: profile.policyHolderRelationship || "",
      primaryPhysicianName: profile.primaryPhysicianName || "",
      primaryPhysicianPhone: profile.primaryPhysicianPhone || "",
    });
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        phone: formData.phone || undefined,
        addressStreet: formData.addressStreet || undefined,
        addressCity: formData.addressCity || undefined,
        addressState: formData.addressState || undefined,
        addressZip: formData.addressZip || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        emergencyContactRelationship: formData.emergencyContactRelationship || undefined,
        emergencyContact2Name: formData.emergencyContact2Name || undefined,
        emergencyContact2Phone: formData.emergencyContact2Phone || undefined,
        emergencyContact2Relationship: formData.emergencyContact2Relationship || undefined,
        insuranceProvider: formData.insuranceProvider || undefined,
        insurancePolicyNumber: formData.insurancePolicyNumber || undefined,
        insuranceGroupNumber: formData.insuranceGroupNumber || undefined,
        insurancePhone: formData.insurancePhone || undefined,
        policyHolderName: formData.policyHolderName || undefined,
        policyHolderRelationship: formData.policyHolderRelationship || undefined,
        primaryPhysicianName: formData.primaryPhysicianName || undefined,
        primaryPhysicianPhone: formData.primaryPhysicianPhone || undefined,
      });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatHeight = (inches?: number) => {
    if (!inches) return null;
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  const renderField = (label: string, value: string | undefined | null, fieldKey?: keyof typeof formData) => {
    if (isEditing && fieldKey) {
      return (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">{label}</label>
          <input
            type="text"
            value={formData[fieldKey]}
            onChange={(e) => setFormData((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    }
    return (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            View and update your personal information
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={handleStartEditing}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancelEditing} disabled={isSaving}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Basic Info (Read-Only) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {profile.firstName} {profile.lastName}
              {profile.preferredName && ` (${profile.preferredName})`}
            </h2>
            <p className="text-muted-foreground">
              {profile.teamName} • {profile.position || "Athlete"}
              {profile.jerseyNumber && ` • #${profile.jerseyNumber}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Class Year</p>
            <p className="text-sm font-medium text-slate-900">{profile.classYear || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Height</p>
            <p className="text-sm font-medium text-slate-900">{formatHeight(profile.heightInches) || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Weight</p>
            <p className="text-sm font-medium text-slate-900">{profile.weightLbs ? `${profile.weightLbs} lbs` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dominant Hand</p>
            <p className="text-sm font-medium text-slate-900">{profile.dominantHand || "—"}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 italic">
          Contact your athletic trainer to update basic information like name, position, or jersey number.
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => toggleSection("contact")}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-500" />
            Contact Information
          </h3>
          {expandedSections.contact ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400" />
          )}
        </button>
        {expandedSections.contact && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-slate-900">{profile.email || "—"}</p>
              </div>
              {renderField("Phone", profile.phone, "phone")}
              {renderField("Street Address", profile.addressStreet, "addressStreet")}
              {renderField("City", profile.addressCity, "addressCity")}
              {renderField("State", profile.addressState, "addressState")}
              {renderField("ZIP Code", profile.addressZip, "addressZip")}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => toggleSection("emergency")}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Emergency Contacts
          </h3>
          {expandedSections.emergency ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400" />
          )}
        </button>
        {expandedSections.emergency && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Primary Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {renderField("Name", profile.emergencyContactName, "emergencyContactName")}
                {renderField("Phone", profile.emergencyContactPhone, "emergencyContactPhone")}
                {renderField("Relationship", profile.emergencyContactRelationship, "emergencyContactRelationship")}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Secondary Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {renderField("Name", profile.emergencyContact2Name, "emergencyContact2Name")}
                {renderField("Phone", profile.emergencyContact2Phone, "emergencyContact2Phone")}
                {renderField("Relationship", profile.emergencyContact2Relationship, "emergencyContact2Relationship")}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insurance Information */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => toggleSection("insurance")}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Insurance Information
          </h3>
          {expandedSections.insurance ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400" />
          )}
        </button>
        {expandedSections.insurance && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField("Insurance Provider", profile.insuranceProvider, "insuranceProvider")}
              {renderField("Policy Number", profile.insurancePolicyNumber, "insurancePolicyNumber")}
              {renderField("Group Number", profile.insuranceGroupNumber, "insuranceGroupNumber")}
              {renderField("Insurance Phone", profile.insurancePhone, "insurancePhone")}
              {renderField("Policy Holder Name", profile.policyHolderName, "policyHolderName")}
              {renderField("Policy Holder Relationship", profile.policyHolderRelationship, "policyHolderRelationship")}
            </div>
          </div>
        )}
      </div>

      {/* Medical Information */}
      <div className="bg-white rounded-xl border border-slate-200">
        <button
          onClick={() => toggleSection("medical")}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Medical Information
          </h3>
          {expandedSections.medical ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400" />
          )}
        </button>
        {expandedSections.medical && (
          <div className="px-6 pb-6 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {renderField("Primary Physician", profile.primaryPhysicianName, "primaryPhysicianName")}
              {renderField("Physician Phone", profile.primaryPhysicianPhone, "primaryPhysicianPhone")}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs text-muted-foreground">Allergies</p>
                <p className="text-sm text-slate-900">{profile.allergies || "None listed"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Medications</p>
                <p className="text-sm text-slate-900">{profile.medications || "None listed"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Medical Conditions</p>
                <p className="text-sm text-slate-900">{profile.medicalConditions || "None listed"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Previous Surgeries</p>
                <p className="text-sm text-slate-900">{profile.previousSurgeries || "None listed"}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 italic">
              Contact your athletic trainer to update medical history information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
