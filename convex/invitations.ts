/**
 * Invitation management functions
 *
 * Handles inviting athletic trainers and physicians to join teams.
 * Uses token-based email invitations with expiration.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireAuth,
  requireOrgAdmin,
  verifyTeamInOrg,
  logAuditEvent,
  generateToken,
  now,
} from "./authz";
import { sendEmail } from "./email";

// Role options for invitations
const inviteRoleValidator = v.union(
  v.literal("athletic_trainer"),
  v.literal("physician")
);

// Status validator
const inviteStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("expired")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all invitations for the organization (org admin only)
 */
export const list = query({
  args: {
    status: v.optional(inviteStatusValidator),
    teamId: v.optional(v.id("teams")),
  },
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      email: v.string(),
      role: inviteRoleValidator,
      teamId: v.id("teams"),
      teamName: v.string(),
      status: inviteStatusValidator,
      expiresAt: v.number(),
      createdAt: v.number(),
      invitedByName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    let invitations;
    const statusFilter = args.status;
    if (statusFilter) {
      invitations = await ctx.db
        .query("invitations")
        .withIndex("by_orgId_and_status", (q) =>
          q.eq("orgId", auth.orgId).eq("status", statusFilter)
        )
        .collect();
    } else {
      invitations = await ctx.db
        .query("invitations")
        .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }

    // Filter by team if specified
    if (args.teamId) {
      invitations = invitations.filter((i) => i.teamId === args.teamId);
    }

    // Enrich with team names and inviter names
    const result = await Promise.all(
      invitations.map(async (inv) => {
        const team = await ctx.db.get(inv.teamId);
        const inviter = await ctx.db.get(inv.invitedByUserId);
        return {
          _id: inv._id,
          email: inv.email,
          role: inv.role,
          teamId: inv.teamId,
          teamName: team?.name || "Unknown Team",
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          invitedByName: inviter?.fullName || "Unknown",
        };
      })
    );

    return result;
  },
});

/**
 * Get invitation by token (for acceptance flow - no auth required)
 */
export const getByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("invitations"),
      email: v.string(),
      role: inviteRoleValidator,
      teamName: v.string(),
      orgName: v.string(),
      orgId: v.id("organizations"),
      teamId: v.id("teams"),
      isExpired: v.boolean(),
      isAccepted: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) return null;

    const team = await ctx.db.get(invitation.teamId);
    const org = await ctx.db.get(invitation.orgId);

    if (!team || !org || org.isDeleted) return null;

    const timestamp = now();

    return {
      _id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      teamName: team.name,
      orgName: org.name,
      orgId: invitation.orgId,
      teamId: invitation.teamId,
      isExpired: invitation.status === "expired" || invitation.expiresAt < timestamp,
      isAccepted: invitation.status === "accepted",
    };
  },
});

/**
 * Check if an email has a pending invitation
 */
export const checkPendingByEmail = query({
  args: { email: v.string() },
  returns: v.union(
    v.object({
      hasPending: v.boolean(),
      orgName: v.optional(v.string()),
      teamName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!invitation || invitation.status !== "pending") {
      return { hasPending: false };
    }

    const org = await ctx.db.get(invitation.orgId);
    const team = await ctx.db.get(invitation.teamId);

    return {
      hasPending: true,
      orgName: org?.name,
      teamName: team?.name,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create and send an invitation (org admin only)
 */
export const create = mutation({
  args: {
    email: v.string(),
    role: inviteRoleValidator,
    teamId: v.id("teams"),
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const team = await verifyTeamInOrg(ctx, auth, args.teamId);
    const org = await ctx.db.get(auth.orgId);

    if (!org || org.isDeleted) {
      throw new Error("Organization not found");
    }

    // Check if AT limit is reached for this team
    if (args.role === "athletic_trainer") {
      const existingATs = await ctx.db
        .query("users")
        .withIndex("by_orgId_and_role", (q) =>
          q.eq("orgId", auth.orgId).eq("role", "athletic_trainer")
        )
        .collect();

      const atsOnTeam = existingATs.filter(
        (u) => u.isActive && !u.isDeleted && u.teamIds.includes(args.teamId)
      ).length;

      // Also count pending invitations
      const pendingInvites = await ctx.db
        .query("invitations")
        .withIndex("by_orgId_and_status", (q) =>
          q.eq("orgId", auth.orgId).eq("status", "pending")
        )
        .collect();

      const pendingATsForTeam = pendingInvites.filter(
        (i) => i.teamId === args.teamId && i.role === "athletic_trainer"
      ).length;

      if (atsOnTeam + pendingATsForTeam >= org.maxAthleticTrainersPerTeam) {
        throw new Error(
          `Athletic trainer limit reached for this team. Your plan allows ${org.maxAthleticTrainersPerTeam} ATs per team.`
        );
      }
    }

    // Check for existing pending invitation
    const existingInvite = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingInvite && existingInvite.status === "pending" && existingInvite.orgId === auth.orgId) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Check if user already exists in org
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_orgId_and_email", (q) =>
        q.eq("orgId", auth.orgId).eq("email", args.email.toLowerCase())
      )
      .first();

    if (existingUser && !existingUser.isDeleted) {
      throw new Error("A user with this email already exists in your organization");
    }

    const timestamp = now();
    const token = generateToken();
    const expiresAt = timestamp + 7 * 24 * 60 * 60 * 1000; // 7 days

    const invitationId = await ctx.db.insert("invitations", {
      orgId: auth.orgId,
      teamId: args.teamId,
      email: args.email.toLowerCase(),
      role: args.role,
      invitedByUserId: auth.userId,
      token,
      status: "pending",
      expiresAt,
      createdAt: timestamp,
    });

    // Log the invitation
    await logAuditEvent(ctx, auth, auth.orgId, "create", "invitation", invitationId, {
      email: args.email,
      role: args.role,
      teamName: team.name,
    });

    // Send invitation email
    const inviter = await ctx.db.get(auth.userId);
    const roleName = args.role === "athletic_trainer" ? "Athletic Trainer" : "Physician";
    const siteUrl = process.env.SITE_URL || "http://localhost:5173";
    const inviteUrl = `${siteUrl}/invite/${token}`;

    await sendEmail({
      to: args.email,
      subject: `You've been invited to join ${org.name} on Novia`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a; margin-bottom: 12px;">You're Invited!</h2>
          <p style="color: #475569; margin-bottom: 16px;">
            ${inviter?.fullName || "An administrator"} has invited you to join
            <strong>${org.name}</strong> as a <strong>${roleName}</strong> for the
            <strong>${team.name}</strong> team.
          </p>
          <p style="color: #475569; margin-bottom: 24px;">
            Click the button below to create your account and get started:
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; background-color: #0891b2; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;
                    font-weight: 600;">
            Accept Invitation
          </a>
          <p style="color: #64748b; margin-top: 24px; font-size: 14px;">
            This invitation expires in 7 days. If you didn't expect this invitation,
            you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return invitationId;
  },
});

/**
 * Accept an invitation (creates user account)
 */
export const accept = mutation({
  args: {
    token: v.string(),
    authUserId: v.string(),
    fullName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    userId: v.optional(v.id("users")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return { success: false, message: "Invalid invitation" };
    }

    if (invitation.status === "accepted") {
      return { success: false, message: "Invitation has already been used" };
    }

    const timestamp = now();

    if (invitation.status === "expired" || invitation.expiresAt < timestamp) {
      return { success: false, message: "Invitation has expired" };
    }

    // Check org is still active
    const org = await ctx.db.get(invitation.orgId);
    if (!org || org.isDeleted || org.status === "canceled") {
      return { success: false, message: "Organization is no longer active" };
    }

    // Check team is still active
    const team = await ctx.db.get(invitation.teamId);
    if (!team || !team.isActive) {
      return { success: false, message: "Team is no longer active" };
    }

    // Create user account
    const userId = await ctx.db.insert("users", {
      orgId: invitation.orgId,
      authUserId: args.authUserId,
      email: invitation.email,
      fullName: args.fullName,
      role: invitation.role,
      teamIds: [invitation.teamId],
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
    });

    // Log the acceptance
    await ctx.db.insert("orgAuditLogs", {
      orgId: invitation.orgId,
      userId,
      authUserId: args.authUserId,
      action: "accept",
      entityType: "invitation",
      entityId: invitation._id,
      metadataJson: JSON.stringify({
        email: invitation.email,
        role: invitation.role,
      }),
      createdAt: timestamp,
    });

    return {
      success: true,
      userId,
      message: "Welcome! Your account has been created.",
    };
  },
});

/**
 * Resend an invitation (org admin only)
 */
export const resend = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.orgId !== auth.orgId) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only resend pending invitations");
    }

    const org = await ctx.db.get(auth.orgId);
    const team = await ctx.db.get(invitation.teamId);
    const inviter = await ctx.db.get(auth.userId);

    if (!org || !team) {
      throw new Error("Organization or team not found");
    }

    // Generate new token and extend expiration
    const timestamp = now();
    const newToken = generateToken();
    const newExpiresAt = timestamp + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.patch(args.invitationId, {
      token: newToken,
      expiresAt: newExpiresAt,
    });

    // Send new email
    const roleName = invitation.role === "athletic_trainer" ? "Athletic Trainer" : "Physician";
    const siteUrl = process.env.SITE_URL || "http://localhost:5173";
    const inviteUrl = `${siteUrl}/invite/${newToken}`;

    await sendEmail({
      to: invitation.email,
      subject: `Reminder: You've been invited to join ${org.name} on Novia`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0f172a; margin-bottom: 12px;">Invitation Reminder</h2>
          <p style="color: #475569; margin-bottom: 16px;">
            ${inviter?.fullName || "An administrator"} has invited you to join
            <strong>${org.name}</strong> as a <strong>${roleName}</strong> for the
            <strong>${team.name}</strong> team.
          </p>
          <p style="color: #475569; margin-bottom: 24px;">
            Click the button below to create your account and get started:
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; background-color: #0891b2; color: white;
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;
                    font-weight: 600;">
            Accept Invitation
          </a>
          <p style="color: #64748b; margin-top: 24px; font-size: 14px;">
            This invitation expires in 7 days.
          </p>
        </div>
      `,
    });

    // Log the resend
    await logAuditEvent(ctx, auth, auth.orgId, "resend", "invitation", args.invitationId, {
      email: invitation.email,
    });

    return true;
  },
});

/**
 * Cancel/revoke an invitation (org admin only)
 */
export const cancel = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.orgId !== auth.orgId) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only cancel pending invitations");
    }

    await ctx.db.patch(args.invitationId, {
      status: "expired",
    });

    // Log the cancellation
    await logAuditEvent(ctx, auth, auth.orgId, "cancel", "invitation", args.invitationId, {
      email: invitation.email,
    });

    return true;
  },
});

/**
 * Expire old invitations (called by cron job)
 */
export const expireOldInvitations = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const timestamp = now();

    const pendingInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    let expiredCount = 0;
    for (const invitation of pendingInvitations) {
      if (invitation.expiresAt < timestamp) {
        await ctx.db.patch(invitation._id, {
          status: "expired",
        });
        expiredCount++;
      }
    }

    return expiredCount;
  },
});
