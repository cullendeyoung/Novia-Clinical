import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Users,
  UserPlus,
  Mail,
  Check,
  Building,
  RefreshCw,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function Staff() {
  const users = useQuery(api.users.list, { role: "athletic_trainer" });
  const teams = useQuery(api.teams.list, {});
  const organization = useQuery(api.organizations.getCurrent);
  const updateUser = useMutation(api.users.update);

  const [updatingUserId, setUpdatingUserId] = useState<Id<"users"> | null>(null);

  const handleFullTimeTeamChange = async (userId: Id<"users">, teamId: string) => {
    setUpdatingUserId(userId);
    try {
      await updateUser({
        userId,
        fullTimeTeamId: teamId as Id<"teams">,
      });
    } catch (error) {
      console.error("Failed to update full-time team:", error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Staff Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your athletic trainers and their team assignments.
          </p>
        </div>
        <Button asChild>
          <a href="/org/staff/invite">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Staff
          </a>
        </Button>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Building className="mt-0.5 h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">Organization-Wide Access</p>
            <p className="text-sm text-blue-700">
              Athletic trainers can access all teams in {organization?.name || "your organization"}.
              The "Full-Time Team" is their default assignment and helps with scheduling and reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-heading font-semibold text-slate-900">
            Athletic Trainers ({users?.length ?? 0})
          </h2>
        </div>

        {!users || users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="font-medium text-slate-900">No athletic trainers yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Invite athletic trainers to help manage your athletes.
            </p>
            <Button className="mt-4" asChild>
              <a href="/org/staff/invite">
                <Mail className="mr-2 h-4 w-4" />
                Send Invitation
              </a>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                    {user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {user.isActive ? (
                      <>
                        <Check className="mr-1 h-3 w-3" />
                        Active
                      </>
                    ) : (
                      "Inactive"
                    )}
                  </span>

                  {/* Full-Time Team Selector */}
                  <div className="w-48">
                    <label className="sr-only">Full-Time Team</label>
                    {updatingUserId === user._id ? (
                      <div className="flex h-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                      </div>
                    ) : (
                      <Select
                        value={user.fullTimeTeamId || ""}
                        onChange={(e) =>
                          handleFullTimeTeamChange(user._id, e.target.value)
                        }
                        disabled={updatingUserId === user._id}
                        options={
                          teams?.map((team) => ({
                            value: team._id,
                            label: team.name,
                          })) || []
                        }
                        placeholder="Select team"
                        className="h-9"
                      />
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Full-time team
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teams Access Info */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="font-medium text-slate-900 mb-2">Team Access</h3>
        <p className="text-sm text-muted-foreground mb-4">
          All athletic trainers have access to all teams in your organization.
          This allows them to cover for each other when needed (e.g., a hockey AT covering soccer practice).
        </p>
        <div className="flex flex-wrap gap-2">
          {teams?.map((team) => (
            <span
              key={team._id}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {team.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
