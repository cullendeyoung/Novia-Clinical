import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  UserPlus,
  AlertCircle,
  Check,
  Clock,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

const ROLE_OPTIONS = [
  { value: "athletic_trainer", label: "Athletic Trainer" },
  { value: "physician", label: "Physician" },
];

export default function InviteStaff() {
  const navigate = useNavigate();

  const teams = useQuery(api.teams.list, {});
  const invitations = useQuery(api.invitations.list, {});
  const organization = useQuery(api.organizations.getCurrent);
  const createInvitation = useMutation(api.invitations.create);
  const resendInvitation = useMutation(api.invitations.resend);
  const cancelInvitation = useMutation(api.invitations.cancel);

  const [isInviting, setIsInviting] = useState(false);
  const [resendingId, setResendingId] = useState<Id<"invitations"> | null>(null);
  const [cancelingId, setCancelingId] = useState<Id<"invitations"> | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("athletic_trainer");
  const [teamId, setTeamId] = useState("");

  const teamOptions = teams?.map((t) => ({ value: t._id, label: t.name })) || [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !teamId) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    try {
      await createInvitation({
        email: email.trim().toLowerCase(),
        role: role as "athletic_trainer" | "physician",
        teamId: teamId as Id<"teams">,
      });
      toast.success("Invitation sent!");
      setEmail("");
      setTeamId("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleResend = async (invitationId: Id<"invitations">) => {
    setResendingId(invitationId);
    try {
      await resendInvitation({ invitationId });
      toast.success("Invitation resent!");
    } catch {
      toast.error("Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  const handleCancel = async (invitationId: Id<"invitations">) => {
    setCancelingId(invitationId);
    try {
      await cancelInvitation({ invitationId });
      toast.success("Invitation cancelled");
    } catch {
      toast.error("Failed to cancel invitation");
    } finally {
      setCancelingId(null);
    }
  };

  const pendingInvitations = invitations?.filter((i) => i.status === "pending") || [];
  const acceptedInvitations = invitations?.filter((i) => i.status === "accepted") || [];

  // Check if no teams exist
  const noTeams = !teams || teams.length === 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/org/staff")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Staff
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Invite Staff
        </h1>
        <p className="mt-1 text-muted-foreground">
          Invite athletic trainers and physicians to join {organization?.name || "your organization"}.
        </p>
      </div>

      {/* Warning if no teams */}
      {noTeams && (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Create a team first</p>
              <p className="text-sm text-amber-700">
                You need to create at least one team before you can invite staff members.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigate("/org/teams")}
              >
                Create Team
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {!noTeams && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Send Invitation
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trainer@university.edu"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  options={ROLE_OPTIONS}
                />
              </div>
              <div>
                <Label htmlFor="team">Assign to Team *</Label>
                <Select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  options={teamOptions}
                  placeholder="Select team"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This will be their full-time team (they can still access all teams)
                </p>
              </div>
            </div>
            <Button type="submit" disabled={isInviting}>
              <Mail className="mr-2 h-4 w-4" />
              {isInviting ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </div>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Pending Invitations ({pendingInvitations.length})
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation._id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.role === "athletic_trainer"
                        ? "Athletic Trainer"
                        : "Physician"}{" "}
                      • {invitation.teamName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(invitation._id)}
                    disabled={resendingId === invitation._id}
                  >
                    {resendingId === invitation._id ? "..." : "Resend"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(invitation._id)}
                    disabled={cancelingId === invitation._id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {cancelingId === invitation._id ? "..." : <X className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Invitations */}
      {acceptedInvitations.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Recently Joined ({acceptedInvitations.length})
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
            {acceptedInvitations.slice(0, 5).map((invitation) => (
              <div
                key={invitation._id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{invitation.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {invitation.role === "athletic_trainer"
                        ? "Athletic Trainer"
                        : "Physician"}{" "}
                      • {invitation.teamName}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-green-600 font-medium">Accepted</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {invitations?.length === 0 && !noTeams && (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-900">No invitations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the form above to invite athletic trainers and physicians.
          </p>
        </div>
      )}
    </div>
  );
}
