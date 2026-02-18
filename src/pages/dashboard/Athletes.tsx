import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Users,
  Plus,
  ArrowLeft,
  Search,
  AlertCircle,
  Mail,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

const CLASS_YEARS = [
  { value: "Freshman", label: "Freshman" },
  { value: "Sophomore", label: "Sophomore" },
  { value: "Junior", label: "Junior" },
  { value: "Senior", label: "Senior" },
  { value: "Graduate", label: "Graduate" },
  { value: "5th Year", label: "5th Year" },
  { value: "Redshirt Freshman", label: "Redshirt Freshman" },
  { value: "Redshirt Sophomore", label: "Redshirt Sophomore" },
  { value: "Redshirt Junior", label: "Redshirt Junior" },
  { value: "Redshirt Senior", label: "Redshirt Senior" },
];

const SEX_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "Other", label: "Other" },
];

export default function Athletes() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const team = useQuery(
    api.teams.getById,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip"
  );
  const athletes = useQuery(
    api.athletes.listByTeam,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip"
  );
  const organization = useQuery(api.organizations.getCurrent);
  const createAthlete = useMutation(api.athletes.create);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Form state - Essential info (AT fills)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [classYear, setClassYear] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Form state - Additional info (athlete can fill)
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");
  const [dominantHand, setDominantHand] = useState("");

  // Address
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");

  // Emergency Contacts
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState("");
  const [emergencyContact2Name, setEmergencyContact2Name] = useState("");
  const [emergencyContact2Phone, setEmergencyContact2Phone] = useState("");
  const [emergencyContact2Relationship, setEmergencyContact2Relationship] = useState("");

  // Medical History
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [previousSurgeries, setPreviousSurgeries] = useState("");
  const [previousInjuries, setPreviousInjuries] = useState("");

  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [insuranceGroupNumber, setInsuranceGroupNumber] = useState("");
  const [insurancePhone, setInsurancePhone] = useState("");
  const [policyHolderName, setPolicyHolderName] = useState("");
  const [policyHolderRelationship, setPolicyHolderRelationship] = useState("");

  // Primary Care
  const [primaryPhysicianName, setPrimaryPhysicianName] = useState("");
  const [primaryPhysicianPhone, setPrimaryPhysicianPhone] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    // Essential
    setFirstName("");
    setLastName("");
    setPreferredName("");
    setEmail("");
    setPhone("");
    setJerseyNumber("");
    setPosition("");
    setClassYear("");
    setSex("");
    setDateOfBirth("");
    // Physical
    setHeightFeet("");
    setHeightInches("");
    setWeight("");
    setDominantHand("");
    // Address
    setAddressStreet("");
    setAddressCity("");
    setAddressState("");
    setAddressZip("");
    // Emergency Contacts
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setEmergencyContactRelationship("");
    setEmergencyContact2Name("");
    setEmergencyContact2Phone("");
    setEmergencyContact2Relationship("");
    // Medical
    setAllergies("");
    setMedications("");
    setMedicalConditions("");
    setPreviousSurgeries("");
    setPreviousInjuries("");
    // Insurance
    setInsuranceProvider("");
    setInsurancePolicyNumber("");
    setInsuranceGroupNumber("");
    setInsurancePhone("");
    setPolicyHolderName("");
    setPolicyHolderRelationship("");
    // Primary Care
    setPrimaryPhysicianName("");
    setPrimaryPhysicianPhone("");
    // Notes
    setNotes("");
    setShowAdditionalInfo(false);
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter the athlete's name");
      return;
    }

    // Basic email validation if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!teamId) return;

    // Calculate height in inches if provided
    let totalHeightInches: number | undefined;
    if (heightFeet || heightInches) {
      const feet = parseInt(heightFeet) || 0;
      const inches = parseInt(heightInches) || 0;
      totalHeightInches = feet * 12 + inches;
    }

    setIsAdding(true);
    try {
      await createAthlete({
        teamId: teamId as Id<"teams">,
        // Basic Info
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        preferredName: preferredName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        sex: sex as "M" | "F" | "Other" | undefined,
        // Athletic Info
        classYear: classYear || undefined,
        jerseyNumber: jerseyNumber || undefined,
        position: position || undefined,
        heightInches: totalHeightInches,
        weightLbs: weight ? parseInt(weight) : undefined,
        dominantHand: dominantHand as "Left" | "Right" | "Ambidextrous" | undefined,
        // Address
        addressStreet: addressStreet.trim() || undefined,
        addressCity: addressCity.trim() || undefined,
        addressState: addressState.trim() || undefined,
        addressZip: addressZip.trim() || undefined,
        // Emergency Contacts
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: emergencyContactRelationship.trim() || undefined,
        emergencyContact2Name: emergencyContact2Name.trim() || undefined,
        emergencyContact2Phone: emergencyContact2Phone.trim() || undefined,
        emergencyContact2Relationship: emergencyContact2Relationship.trim() || undefined,
        // Medical History
        allergies: allergies.trim() || undefined,
        medications: medications.trim() || undefined,
        medicalConditions: medicalConditions.trim() || undefined,
        previousSurgeries: previousSurgeries.trim() || undefined,
        previousInjuries: previousInjuries.trim() || undefined,
        // Insurance
        insuranceProvider: insuranceProvider.trim() || undefined,
        insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
        insuranceGroupNumber: insuranceGroupNumber.trim() || undefined,
        insurancePhone: insurancePhone.trim() || undefined,
        policyHolderName: policyHolderName.trim() || undefined,
        policyHolderRelationship: policyHolderRelationship.trim() || undefined,
        // Primary Care
        primaryPhysicianName: primaryPhysicianName.trim() || undefined,
        primaryPhysicianPhone: primaryPhysicianPhone.trim() || undefined,
        // Notes
        notes: notes.trim() || undefined,
        sendInvite: !!email.trim(),
      });
      const successMessage = email.trim()
        ? "Athlete added! They'll receive an email to complete their profile."
        : "Athlete added successfully!";
      toast.success(successMessage);
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add athlete";
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  // Generate invite email template
  const generateInviteEmail = () => {
    const inviteCode = team?.inviteCode || "";
    const registrationUrl = `${window.location.origin}/register/athlete?code=${inviteCode}`;
    const orgName = organization?.name || "Your Organization";

    const subject = `Join ${team?.name} on Novia - Complete Your Registration`;
    const body = `Hi,

You've been invited to join ${team?.name} on Novia, ${orgName}'s athletic training management platform.

To complete your registration:
1. Click the link below or copy it into your browser
2. Create your account using this invite code: ${inviteCode}
3. Fill out your profile information

Registration Link: ${registrationUrl}

Invite Code: ${inviteCode}

Once registered, you'll be able to:
- View your health records and injury history
- Communicate with athletic trainers
- Track your recovery progress
- Access important team health information

If you have any questions, please contact your athletic training staff.

See you on the field!
${orgName} Athletic Training`;

    return { subject, body, inviteCode };
  };

  const copyInviteEmail = async () => {
    const { subject, body } = generateInviteEmail();
    const fullEmail = `Subject: ${subject}\n\n${body}`;

    await navigator.clipboard.writeText(fullEmail);
    setCopiedEmail(true);
    toast.success("Invite email copied! Paste into your email client.");
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const openEmailClient = () => {
    const { subject, body } = generateInviteEmail();
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
  };

  const copyInviteCode = async () => {
    const { inviteCode } = generateInviteEmail();
    await navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied!");
  };

  // Filter athletes by search
  const filteredAthletes = athletes?.filter((a) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
    return (
      fullName.includes(query) ||
      a.jerseyNumber?.toLowerCase().includes(query) ||
      a.position?.toLowerCase().includes(query)
    );
  });

  if (!team) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/org/teams")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Teams
        </Button>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            {team.name} Roster
          </h1>
          <p className="mt-1 text-muted-foreground">
            {athletes?.length ?? 0} athletes on this team
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowInvitePanel(!showInvitePanel)}>
            <Mail className="mr-2 h-4 w-4" />
            Invite Athletes
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Manually
          </Button>
        </div>
      </div>

      {/* Invite Athletes Panel */}
      {showInvitePanel && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-slate-900">
                Invite Athletes to Join
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Send athletes an email with the registration link. They'll create their own account and appear on your roster.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInvitePanel(false)}
              className="text-slate-500"
            >
              Close
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Option 1: Copy Email */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="font-medium text-slate-900 mb-2">Option 1: Copy & Paste</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Copy a pre-written invite email, then paste it into your email client (Gmail, Outlook, etc.) and add recipient emails.
              </p>
              <Button onClick={copyInviteEmail} className="w-full">
                {copiedEmail ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Invite Email
                  </>
                )}
              </Button>
            </div>

            {/* Option 2: Open Email Client */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="font-medium text-slate-900 mb-2">Option 2: Open Email App</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Opens your default email app with the invite pre-filled. Just add athlete emails to the "To" field and send.
              </p>
              <Button onClick={openEmailClient} variant="outline" className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Open in Email App
              </Button>
            </div>
          </div>

          {/* Invite Code Reference */}
          <div className="mt-4 rounded-md bg-slate-100 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Team Invite Code</p>
                <code className="font-mono text-lg font-semibold text-slate-900">
                  {team.inviteCode}
                </code>
              </div>
              <Button variant="ghost" size="sm" onClick={copyInviteCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Athlete Form */}
      {showAddForm && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Add New Athlete
          </h2>
          <form onSubmit={handleAddAthlete} className="space-y-4">
            {/* Essential Info */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@email.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Athlete will receive an invite to complete their profile
                </p>
              </div>
              <div>
                <Label htmlFor="jerseyNumber">Jersey Number</Label>
                <Input
                  id="jerseyNumber"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="23"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Point Guard"
                />
              </div>
              <div>
                <Label htmlFor="classYear">Class Year</Label>
                <Select
                  value={classYear}
                  onChange={(e) => setClassYear(e.target.value)}
                  options={CLASS_YEARS}
                  placeholder="Select year"
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  options={SEX_OPTIONS}
                  placeholder="Select"
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>

            {/* Collapsible Additional Info */}
            <div className="border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
                className="flex w-full items-center justify-between text-left py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-slate-700">
                    Additional Athlete Information
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    (can be filled out by athlete)
                  </span>
                </div>
                {showAdditionalInfo ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {showAdditionalInfo && (
                <div className="mt-4 space-y-6 rounded-lg bg-slate-50 p-4">
                  {/* Physical Information */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Physical Information</h4>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <Label>Height</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="8"
                            value={heightFeet}
                            onChange={(e) => setHeightFeet(e.target.value)}
                            placeholder="Ft"
                          />
                          <Input
                            type="number"
                            min="0"
                            max="11"
                            value={heightInches}
                            onChange={(e) => setHeightInches(e.target.value)}
                            placeholder="In"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight (lbs)</Label>
                        <Input
                          id="weight"
                          type="number"
                          min="0"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="180"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dominantHand">Dominant Hand</Label>
                        <Select
                          value={dominantHand}
                          onChange={(e) => setDominantHand(e.target.value)}
                          options={[
                            { value: "Right", label: "Right" },
                            { value: "Left", label: "Left" },
                            { value: "Ambidextrous", label: "Ambidextrous" },
                          ]}
                          placeholder="Select"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Home Address */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Home Address</h4>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="addressStreet">Street Address</Label>
                        <Input
                          id="addressStreet"
                          value={addressStreet}
                          onChange={(e) => setAddressStreet(e.target.value)}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <Label htmlFor="addressCity">City</Label>
                        <Input
                          id="addressCity"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          placeholder="City"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="addressState">State</Label>
                          <Input
                            id="addressState"
                            value={addressState}
                            onChange={(e) => setAddressState(e.target.value)}
                            placeholder="ST"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="addressZip">ZIP</Label>
                          <Input
                            id="addressZip"
                            value={addressZip}
                            onChange={(e) => setAddressZip(e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contacts */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Emergency Contacts</h4>
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label htmlFor="emergencyContactName">Contact 1 Name</Label>
                          <Input
                            id="emergencyContactName"
                            value={emergencyContactName}
                            onChange={(e) => setEmergencyContactName(e.target.value)}
                            placeholder="Jane Smith"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyContactPhone">Contact 1 Phone</Label>
                          <Input
                            id="emergencyContactPhone"
                            type="tel"
                            value={emergencyContactPhone}
                            onChange={(e) => setEmergencyContactPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                          <Input
                            id="emergencyContactRelationship"
                            value={emergencyContactRelationship}
                            onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                            placeholder="Mother"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label htmlFor="emergencyContact2Name">Contact 2 Name</Label>
                          <Input
                            id="emergencyContact2Name"
                            value={emergencyContact2Name}
                            onChange={(e) => setEmergencyContact2Name(e.target.value)}
                            placeholder="John Smith"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyContact2Phone">Contact 2 Phone</Label>
                          <Input
                            id="emergencyContact2Phone"
                            type="tel"
                            value={emergencyContact2Phone}
                            onChange={(e) => setEmergencyContact2Phone(e.target.value)}
                            placeholder="(555) 987-6543"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergencyContact2Relationship">Relationship</Label>
                          <Input
                            id="emergencyContact2Relationship"
                            value={emergencyContact2Relationship}
                            onChange={(e) => setEmergencyContact2Relationship(e.target.value)}
                            placeholder="Father"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medical History */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Medical History</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="allergies">Allergies</Label>
                        <textarea
                          id="allergies"
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                          placeholder="List any allergies (medications, food, environmental)..."
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="medications">Current Medications</Label>
                        <textarea
                          id="medications"
                          value={medications}
                          onChange={(e) => setMedications(e.target.value)}
                          placeholder="List current medications and dosages..."
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="medicalConditions">Medical Conditions</Label>
                        <textarea
                          id="medicalConditions"
                          value={medicalConditions}
                          onChange={(e) => setMedicalConditions(e.target.value)}
                          placeholder="Asthma, diabetes, heart conditions, etc..."
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="previousSurgeries">Previous Surgeries</Label>
                        <textarea
                          id="previousSurgeries"
                          value={previousSurgeries}
                          onChange={(e) => setPreviousSurgeries(e.target.value)}
                          placeholder="List any prior surgeries and dates..."
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="previousInjuries">Previous Injuries (prior to joining team)</Label>
                        <textarea
                          id="previousInjuries"
                          value={previousInjuries}
                          onChange={(e) => setPreviousInjuries(e.target.value)}
                          placeholder="List any previous injuries, fractures, concussions, etc..."
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Insurance Information */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Insurance Information</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                        <Input
                          id="insuranceProvider"
                          value={insuranceProvider}
                          onChange={(e) => setInsuranceProvider(e.target.value)}
                          placeholder="Blue Cross Blue Shield"
                        />
                      </div>
                      <div>
                        <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                        <Input
                          id="insurancePolicyNumber"
                          value={insurancePolicyNumber}
                          onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                          placeholder="ABC123456789"
                        />
                      </div>
                      <div>
                        <Label htmlFor="insuranceGroupNumber">Group Number</Label>
                        <Input
                          id="insuranceGroupNumber"
                          value={insuranceGroupNumber}
                          onChange={(e) => setInsuranceGroupNumber(e.target.value)}
                          placeholder="GRP001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="insurancePhone">Insurance Phone</Label>
                        <Input
                          id="insurancePhone"
                          type="tel"
                          value={insurancePhone}
                          onChange={(e) => setInsurancePhone(e.target.value)}
                          placeholder="(800) 555-1234"
                        />
                      </div>
                      <div>
                        <Label htmlFor="policyHolderName">Policy Holder Name</Label>
                        <Input
                          id="policyHolderName"
                          value={policyHolderName}
                          onChange={(e) => setPolicyHolderName(e.target.value)}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="policyHolderRelationship">Relationship to Athlete</Label>
                        <Input
                          id="policyHolderRelationship"
                          value={policyHolderRelationship}
                          onChange={(e) => setPolicyHolderRelationship(e.target.value)}
                          placeholder="Mother"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Primary Care Physician */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Primary Care Physician</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="primaryPhysicianName">Physician Name</Label>
                        <Input
                          id="primaryPhysicianName"
                          value={primaryPhysicianName}
                          onChange={(e) => setPrimaryPhysicianName(e.target.value)}
                          placeholder="Dr. John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="primaryPhysicianPhone">Physician Phone</Label>
                        <Input
                          id="primaryPhysicianPhone"
                          type="tel"
                          value={primaryPhysicianPhone}
                          onChange={(e) => setPrimaryPhysicianPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Additional Notes</h4>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any other relevant information about the athlete..."
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isAdding}>
                {isAdding ? "Adding..." : "Add Athlete"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      {athletes && athletes.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Athletes List */}
      {!athletes || athletes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-900">No athletes yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add athletes to this team's roster.
          </p>
          <Button className="mt-4" onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add First Athlete
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Athlete
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredAthletes?.map((athlete) => (
                <tr key={athlete._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {athlete.jerseyNumber || athlete.firstName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        {athlete.jerseyNumber && (
                          <p className="text-sm text-muted-foreground">
                            #{athlete.jerseyNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {athlete.position || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {athlete.classYear || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {athlete.activeInjuryCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          {athlete.activeInjuryCount} injury{athlete.activeInjuryCount !== 1 ? "ies" : "y"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Healthy
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/org/athletes/${athlete._id}`}>
                        View Profile
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
