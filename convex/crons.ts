/**
 * Scheduled Jobs (Cron) for HIPAA Compliance
 *
 * These cron jobs handle routine maintenance tasks:
 * 1. Rate limit cleanup - Removes expired rate limit records
 * 2. Audit log verification - Ensures retention compliance
 *
 * IMPORTANT: Audit logs are NEVER deleted within the 6-year retention period.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired rate limit records daily
// Runs at 2:00 AM UTC
crons.interval(
  "cleanup_rate_limits",
  { hours: 24 },
  internal.auditMaintenance.cleanupRateLimits,
  {}
);

// Verify audit log retention compliance weekly
// This is a read-only check to ensure we're maintaining proper retention
// Runs every 7 days
crons.interval(
  "verify_audit_retention",
  { hours: 168 }, // 7 days
  internal.auditMaintenance.verifyRetention,
  {}
);

export default crons;
