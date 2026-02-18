import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2,
  User,
  CreditCard,
  Shield,
  Save,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Mail,
  Globe,
  Users,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Settings() {
  const navigate = useNavigate();
  const organization = useQuery(api.organizations.getCurrent);
  const currentUser = useQuery(api.users.getCurrent);
  const stats = useQuery(api.organizations.getStats);

  const updateOrganization = useMutation(api.organizations.update);
  const updateUser = useMutation(api.users.update);

  // Organization form state
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [isOrgSaving, setIsOrgSaving] = useState(false);
  const [orgInitialized, setOrgInitialized] = useState(false);

  // Admin profile form state
  const [adminName, setAdminName] = useState("");
  const [isAdminSaving, setIsAdminSaving] = useState(false);
  const [adminInitialized, setAdminInitialized] = useState(false);

  // Initialize form values when data loads
  if (organization && !orgInitialized) {
    setOrgName(organization.name);
    setOrgDomain(organization.domain || "");
    setOrgInitialized(true);
  }

  if (currentUser && !adminInitialized) {
    setAdminName(currentUser.fullName);
    setAdminInitialized(true);
  }

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setIsOrgSaving(true);
    try {
      await updateOrganization({
        name: orgName.trim(),
        domain: orgDomain.trim() || undefined,
      });
      toast.success("Organization settings saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsOrgSaving(false);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminName.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsAdminSaving(true);
    try {
      await updateUser({
        fullName: adminName.trim(),
      });
      toast.success("Profile updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsAdminSaving(false);
    }
  };

  const openStripeBillingPortal = () => {
    // In production, this would redirect to Stripe Customer Portal
    // For now, show a message
    toast.success("Redirecting to billing portal...");
    // window.open("https://billing.stripe.com/p/login/...", "_blank");
  };

  if (!organization || !currentUser) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "trial":
        return "bg-blue-100 text-blue-700";
      case "past_due":
        return "bg-amber-100 text-amber-700";
      case "canceled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your organization and account settings
        </p>
      </div>

      <div className="space-y-8">
        {/* Organization Settings */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h2 className="font-heading text-lg font-semibold text-slate-900">
                Organization
              </h2>
            </div>
          </div>
          <form onSubmit={handleSaveOrganization} className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="University of Vermont Athletics"
                />
              </div>
              <div>
                <Label htmlFor="orgDomain">Email Domain (optional)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="orgDomain"
                    value={orgDomain}
                    onChange={(e) => setOrgDomain(e.target.value)}
                    placeholder="uvm.edu"
                    className="pl-10"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used to verify staff email addresses
                </p>
              </div>
            </div>

            {/* Organization Stats */}
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Plan Details</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(organization.status)}`}
                  >
                    {organization.status === "active" && <CheckCircle className="mr-1 h-3 w-3" />}
                    {organization.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teams</p>
                  <p className="mt-1 text-sm font-medium">
                    {stats?.teamCount ?? 0} / {organization.teamCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ATs per Team</p>
                  <p className="mt-1 text-sm font-medium">
                    {organization.maxAthleticTrainersPerTeam}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Athletes</p>
                  <p className="mt-1 text-sm font-medium">
                    {stats?.athleteCount ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isOrgSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isOrgSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>

        {/* Admin Profile */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-slate-600" />
              <h2 className="font-heading text-lg font-semibold text-slate-900">
                Admin Profile
              </h2>
            </div>
          </div>
          <form onSubmit={handleSaveAdmin} className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="adminName">Full Name</Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label htmlFor="adminEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="adminEmail"
                    value={currentUser.email}
                    disabled
                    className="pl-10 bg-slate-50"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Role</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground capitalize">
                {currentUser.role.replace("_", " ")}
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isAdminSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isAdminSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>

        {/* Billing & Subscription */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-slate-600" />
              <h2 className="font-heading text-lg font-semibold text-slate-900">
                Billing & Subscription
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="rounded-lg bg-slate-50 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Current Plan</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {organization.teamCount >= 15 ? "Program" :
                     organization.teamCount >= 5 ? "Department" :
                     organization.teamCount >= 2 ? "Multi-Team" : "Single Team"}
                    {" "}• {organization.teamCount} teams, {organization.maxAthleticTrainersPerTeam} ATs per team
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(organization.status)}`}>
                  {organization.status === "active" && <CheckCircle className="mr-1 h-4 w-4" />}
                  {organization.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={openStripeBillingPortal}
              >
                <span className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Payment Method
                </span>
                <ExternalLink className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={openStripeBillingPortal}
              >
                <span className="flex items-center">
                  <Activity className="mr-2 h-4 w-4" />
                  View Invoices & Billing History
                </span>
                <ExternalLink className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate("/athletic")}
              >
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Upgrade Plan
                </span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Need to make changes?</p>
                  <p className="text-sm text-amber-700 mt-1">
                    To upgrade your plan, add more teams, or modify your subscription,
                    click the buttons above to access the Stripe billing portal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-white">
          <div className="border-b border-red-200 px-6 py-4 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h2 className="font-heading text-lg font-semibold text-red-900">
                Danger Zone
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Cancel Subscription</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cancel your subscription and lose access to the platform
                </p>
              </div>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={openStripeBillingPortal}
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
