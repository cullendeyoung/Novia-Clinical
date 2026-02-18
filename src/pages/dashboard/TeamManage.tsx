import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
  Settings,
  RefreshCw,
  Save,
  Copy,
  Check,
  Mail,
  Calendar,
  Stethoscope,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

const SPORTS = [
  { value: "baseball", label: "Baseball" },
  { value: "basketball", label: "Basketball" },
  { value: "cross_country", label: "Cross Country" },
  { value: "field_hockey", label: "Field Hockey" },
  { value: "football", label: "Football" },
  { value: "golf", label: "Golf" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "ice_hockey", label: "Ice Hockey" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "rowing", label: "Rowing" },
  { value: "rugby", label: "Rugby" },
  { value: "skiing", label: "Skiing" },
  { value: "soccer", label: "Soccer" },
  { value: "softball", label: "Softball" },
  { value: "swimming", label: "Swimming & Diving" },
  { value: "tennis", label: "Tennis" },
  { value: "track_field", label: "Track & Field" },
  { value: "volleyball", label: "Volleyball" },
  { value: "water_polo", label: "Water Polo" },
  { value: "wrestling", label: "Wrestling" },
  { value: "other", label: "Other" },
];

const SEASONS = [
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
  { value: "year_round", label: "Year-Round" },
];

export default function TeamManage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const team = useQuery(
    api.teams.getById,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip"
  );
  const stats = useQuery(
    api.teams.getDetailedStats,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip"
  );
  const organization = useQuery(api.organizations.getCurrent);

  const updateTeam = useMutation(api.teams.update);
  const regenerateCode = useMutation(api.teams.regenerateInviteCode);

  // Edit form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [season, setSeason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialize form when team loads
  if (team && !formInitialized) {
    setName(team.name);
    setSport(team.sport);
    setSeason(team.season || "");
    setFormInitialized(true);
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sport) {
      toast.error("Team name and sport are required");
      return;
    }

    if (!teamId) return;

    setIsSaving(true);
    try {
      await updateTeam({
        teamId: teamId as Id<"teams">,
        name: name.trim(),
        sport,
        season: season || undefined,
      });
      toast.success("Team updated");
      setShowEditForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!teamId) return;

    setIsRegenerating(true);
    try {
      await regenerateCode({ teamId: teamId as Id<"teams"> });
      toast.success("Invite code regenerated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to regenerate";
      toast.error(message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyInviteCode = async () => {
    if (!team) return;
    await navigator.clipboard.writeText(team.inviteCode);
    setCopiedCode(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openEmailClient = () => {
    if (!team || !organization) return;

    const registrationUrl = `${window.location.origin}/register/athlete?code=${team.inviteCode}`;
    const subject = `Join ${team.name} on Novia - Athletic Training Platform`;
    const body = `Hi,

You've been invited to join ${team.name} on Novia, ${organization.name}'s athletic training management platform.

To complete your registration:
1. Click the link below or copy it into your browser
2. Create your account using this invite code: ${team.inviteCode}
3. Complete your profile

Registration Link: ${registrationUrl}

Invite Code: ${team.inviteCode}

Once registered, you'll be able to:
- View your health records
- Communicate with athletic trainers
- Track your injury recovery

If you have any questions, please contact your athletic training staff.

- ${organization.name} Athletic Training`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
  };

  const getSportLabel = (value: string) => {
    return SPORTS.find((s) => s.value === value)?.label || value;
  };

  const getSeasonLabel = (value: string | undefined) => {
    if (!value) return null;
    return SEASONS.find((s) => s.value === value)?.label || value;
  };

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
            {team.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {getSportLabel(team.sport)}
            {getSeasonLabel(team.season) && ` • ${getSeasonLabel(team.season)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditForm(!showEditForm)}>
            <Settings className="mr-2 h-4 w-4" />
            Edit Team
          </Button>
          <Button asChild>
            <Link to={`/org/teams/${teamId}/athletes`}>
              <Users className="mr-2 h-4 w-4" />
              View Roster
            </Link>
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Edit Team
          </h2>
          <form onSubmit={handleSaveTeam} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Men's Basketball"
                />
              </div>
              <div>
                <Label htmlFor="sport">Sport *</Label>
                <Select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  options={SPORTS}
                  placeholder="Select sport"
                />
              </div>
              <div>
                <Label htmlFor="season">Season</Label>
                <Select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  options={SEASONS}
                  placeholder="Select season"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Stats Overview */}
        <div className="md:col-span-2 space-y-6">
          {/* RTP Status Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Full Participation</p>
                  <p className="text-3xl font-bold text-green-800">
                    {stats?.athletesFull ?? 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Limited</p>
                  <p className="text-3xl font-bold text-amber-800">
                    {stats?.athletesLimited ?? 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">Out</p>
                  <p className="text-3xl font-bold text-red-800">
                    {stats?.athletesOut ?? 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Athletes</p>
                  <p className="text-xl font-semibold">{stats?.activeAthletes ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Injuries</p>
                  <p className="text-xl font-semibold">{stats?.totalActiveInjuries ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Today's Encounters</p>
                  <p className="text-xl font-semibold">{stats?.todayEncounters ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Stethoscope className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-xs text-muted-foreground">Athletic Trainers</p>
                  <p className="text-xl font-semibold">{stats?.athleticTrainers?.length ?? 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Injuries */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h2 className="font-heading text-lg font-semibold text-slate-900">
                    Recent Injuries
                  </h2>
                </div>
                <span className="text-sm text-muted-foreground">Last 7 days</span>
              </div>
            </div>
            <div className="p-6">
              {!stats?.recentInjuries || stats.recentInjuries.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-400" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No recent injuries reported
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentInjuries.map((injury, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            injury.rtpStatus === "out"
                              ? "bg-red-500"
                              : injury.rtpStatus === "limited"
                                ? "bg-amber-500"
                                : "bg-green-500"
                          }`}
                        />
                        <div>
                          <p className="font-medium text-slate-900">
                            {injury.athleteName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {injury.bodyRegion} ({injury.side})
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            injury.rtpStatus === "out"
                              ? "bg-red-100 text-red-700"
                              : injury.rtpStatus === "limited"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {injury.rtpStatus === "full"
                            ? "Full"
                            : injury.rtpStatus === "limited"
                              ? "Limited"
                              : "Out"}
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(injury.injuryDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Athletic Trainers */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-slate-600" />
                <h2 className="font-heading text-lg font-semibold text-slate-900">
                  Assigned Athletic Trainers
                </h2>
              </div>
            </div>
            <div className="p-6">
              {!stats?.athleticTrainers || stats.athleticTrainers.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No athletic trainers assigned
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/org/staff">Manage Staff</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.athleticTrainers.map((at) => (
                    <div
                      key={at._id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {at.fullName.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{at.fullName}</p>
                          <p className="text-sm text-muted-foreground">{at.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Team Info & Actions */}
        <div className="space-y-6">
          {/* Team Status */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-medium text-slate-900 mb-4">Team Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    team.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {team.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Invite Athletes */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-medium text-slate-900 mb-4">Invite Athletes</h3>
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Team Invite Code</p>
                <div className="flex items-center justify-between">
                  <code className="font-mono text-lg font-semibold">
                    {team.inviteCode}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyInviteCode}>
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button onClick={openEmailClient} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Invite Through Email
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleRegenerateCode}
                disabled={isRegenerating}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                {isRegenerating ? "Regenerating..." : "Regenerate Code"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Regenerate if the code has been compromised. Old code will stop working.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-medium text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to={`/org/teams/${teamId}/athletes`}>
                  <Users className="mr-2 h-4 w-4" />
                  View Full Roster
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/org/staff">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Manage ATs
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
                <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
