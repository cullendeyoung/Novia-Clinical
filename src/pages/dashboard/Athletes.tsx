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
  const createAthlete = useMutation(api.athletes.create);

  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [classYear, setClassYear] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setJerseyNumber("");
    setPosition("");
    setClassYear("");
    setSex("");
    setDateOfBirth("");
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter the athlete's name");
      return;
    }

    if (!teamId) return;

    setIsAdding(true);
    try {
      await createAthlete({
        teamId: teamId as Id<"teams">,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        jerseyNumber: jerseyNumber || undefined,
        position: position || undefined,
        classYear: classYear || undefined,
        sex: sex as "M" | "F" | "Other" | undefined,
        dateOfBirth: dateOfBirth || undefined,
      });
      toast.success("Athlete added successfully!");
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add athlete";
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
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
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Athlete
        </Button>
      </div>

      {/* Add Athlete Form */}
      {showAddForm && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Add New Athlete
          </h2>
          <form onSubmit={handleAddAthlete} className="space-y-4">
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
                <Label htmlFor="jerseyNumber">Jersey Number</Label>
                <Input
                  id="jerseyNumber"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  placeholder="23"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Point Guard"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
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
            <div className="flex gap-2">
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
