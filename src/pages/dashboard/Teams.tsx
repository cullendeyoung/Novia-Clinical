import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  UsersRound,
  Plus,
  Users,
  Activity,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

// Sports and seasons from convex/teams.ts
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

export default function Teams() {
  const navigate = useNavigate();
  const teams = useQuery(api.teams.list, {});
  const organization = useQuery(api.organizations.getCurrent);
  const createTeam = useMutation(api.teams.create);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [season, setSeason] = useState("");

  const teamLimit = organization?.teamCount ?? 0;
  const currentTeamCount = teams?.length ?? 0;
  const canCreateTeam = currentTeamCount < teamLimit;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sport) {
      toast.error("Please fill in the team name and sport");
      return;
    }

    setIsCreating(true);
    try {
      await createTeam({
        name: name.trim(),
        sport,
        season: season || undefined,
      });
      toast.success("Team created successfully!");
      setShowCreateForm(false);
      setName("");
      setSport("");
      setSeason("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create team";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getSportLabel = (value: string) => {
    return SPORTS.find((s) => s.value === value)?.label || value;
  };

  const getSeasonLabel = (value: string | undefined) => {
    if (!value) return null;
    return SEASONS.find((s) => s.value === value)?.label || value;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/org")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Teams
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your teams and their rosters. {currentTeamCount} of {teamLimit} teams used.
          </p>
        </div>
        {canCreateTeam ? (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Team limit reached</span>
          </div>
        )}
      </div>

      {/* Create Team Form */}
      {showCreateForm && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Create New Team
          </h2>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Men's Basketball"
                  required
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
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Team"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Teams List */}
      {!teams || teams.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
          <UsersRound className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-900">No teams yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first team to get started.
          </p>
          {canCreateTeam && (
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Team
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard
              key={team._id}
              team={team}
              onCopyCode={copyInviteCode}
              copiedCode={copiedCode}
              getSportLabel={getSportLabel}
              getSeasonLabel={getSeasonLabel}
              orgName={organization?.name || "Your Organization"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard({
  team,
  onCopyCode,
  copiedCode,
  getSportLabel,
  getSeasonLabel,
  orgName,
}: {
  team: {
    _id: Id<"teams">;
    name: string;
    sport: string;
    season?: string;
    inviteCode: string;
    isActive: boolean;
  };
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
  getSportLabel: (value: string) => string;
  getSeasonLabel: (value: string | undefined) => string | null;
  orgName: string;
}) {
  const stats = useQuery(api.teams.getStats, { teamId: team._id });
  const [copiedEmail, setCopiedEmail] = useState(false);

  const generateInviteEmail = () => {
    const registrationUrl = `${window.location.origin}/register/athlete?code=${team.inviteCode}`;

    const subject = `Join ${team.name} on Novia - Athletic Training Platform`;
    const body = `Hi,

You've been invited to join ${team.name} on Novia, our athletic training management platform.

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

- ${orgName} Athletic Training`;

    return { subject, body };
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-slate-900">
            {team.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {getSportLabel(team.sport)}
            {getSeasonLabel(team.season) && ` • ${getSeasonLabel(team.season)}`}
          </p>
        </div>
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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-sm">
            {stats?.athleteCount ?? 0} athletes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-400" />
          <span className="text-sm">
            {stats?.athleticTrainerCount ?? 0} ATs
          </span>
        </div>
      </div>

      {/* Invite Code & Email */}
      <div className="rounded-md bg-slate-50 p-3 mb-4">
        <p className="text-xs text-muted-foreground mb-2">Invite Athletes</p>
        <div className="flex items-center justify-between mb-2">
          <code className="font-mono text-sm font-medium">{team.inviteCode}</code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopyCode(team.inviteCode)}
            title="Copy code"
          >
            {copiedCode === team.inviteCode ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={copyInviteEmail}
          >
            {copiedEmail ? (
              <>
                <Check className="mr-1 h-3 w-3 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Copy Invite Email
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={openEmailClient}
          >
            <Mail className="mr-1 h-3 w-3" />
            Open in Email
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link to={`/org/teams/${team._id}/athletes`}>View Roster</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link to={`/org/teams/${team._id}`}>Manage</Link>
        </Button>
      </div>
    </div>
  );
}
