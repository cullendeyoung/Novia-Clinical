/**
 * Custom Metric Analyzer (CMA) Module
 * HIPAA-compliant prompt-driven analytics for clinical metrics
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// =============================================================================
// VALIDATORS
// =============================================================================

const metricSourceTypeValidator = v.union(
  v.literal("encounter_extracted"),
  v.literal("manual_entry"),
  v.literal("verbal_dictation"),
  v.literal("imported")
);

const sideValidator = v.union(
  v.literal("L"),
  v.literal("R"),
  v.literal("Bilateral"),
  v.literal("NA")
);

const analysisTypeValidator = v.union(
  v.literal("patient"),
  v.literal("clinic"),
  v.literal("cohort")
);

const analyticsStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("archived"),
  v.literal("error")
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function requirePracticeAccess(
  ctx: { db: { get: (id: Id<"practiceUsers">) => Promise<{ practiceId: Id<"clinicPractices">; role: string; isDeleted: boolean; isActive: boolean } | null> } },
  practiceUserId: Id<"practiceUsers">,
  requiredRoles?: string[]
): Promise<{ practiceId: Id<"clinicPractices">; role: string }> {
  const user = await ctx.db.get(practiceUserId);
  if (!user || user.isDeleted || !user.isActive) {
    throw new Error("User not found or inactive");
  }
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
  return { practiceId: user.practiceId, role: user.role };
}

async function verifyPatientAccess(
  ctx: { db: { get: (id: Id<"practicePatients">) => Promise<{ practiceId: Id<"clinicPractices">; assignedClinicianId?: Id<"practiceUsers">; isDeleted: boolean } | null> } },
  patientId: Id<"practicePatients">,
  practiceId: Id<"clinicPractices">,
  userId: Id<"practiceUsers">,
  role: string
): Promise<boolean> {
  const patient = await ctx.db.get(patientId);
  if (!patient || patient.isDeleted || patient.practiceId !== practiceId) {
    return false;
  }
  // Admins can access all patients
  if (role === "practice_admin") {
    return true;
  }
  // Clinicians can access their assigned patients
  if (role === "clinician" && patient.assignedClinicianId === userId) {
    return true;
  }
  return false;
}

// =============================================================================
// CLINICAL METRICS QUERIES
// =============================================================================

/**
 * Get all metrics for a specific patient
 */
export const getPatientMetrics = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.id("practicePatients"),
    metricType: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("clinicalMetrics"),
      _creationTime: v.number(),
      metricType: v.string(),
      metricName: v.string(),
      bodyRegion: v.optional(v.string()),
      side: v.optional(sideValidator),
      numericValue: v.optional(v.number()),
      unit: v.optional(v.string()),
      textValue: v.optional(v.string()),
      measurementDate: v.number(),
      measurementContext: v.optional(v.string()),
      sourceType: metricSourceTypeValidator,
      verifiedByClinician: v.boolean(),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId
    );

    const hasAccess = await verifyPatientAccess(
      ctx,
      args.patientId,
      practiceId,
      args.practiceUserId,
      role
    );
    if (!hasAccess) {
      throw new Error("Access denied to patient data");
    }

    let metricsQuery = ctx.db
      .query("clinicalMetrics")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId));

    const metrics = await metricsQuery.collect();

    // Filter by criteria
    let filtered = metrics.filter((m) => !m.isDeleted);

    if (args.metricType) {
      filtered = filtered.filter((m) => m.metricType === args.metricType);
    }
    if (args.startDate) {
      filtered = filtered.filter((m) => m.measurementDate >= args.startDate!);
    }
    if (args.endDate) {
      filtered = filtered.filter((m) => m.measurementDate <= args.endDate!);
    }

    // Sort by measurement date descending
    filtered.sort((a, b) => b.measurementDate - a.measurementDate);

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered.map((m) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      metricType: m.metricType,
      metricName: m.metricName,
      bodyRegion: m.bodyRegion,
      side: m.side as "L" | "R" | "Bilateral" | "NA" | undefined,
      numericValue: m.numericValue,
      unit: m.unit,
      textValue: m.textValue,
      measurementDate: m.measurementDate,
      measurementContext: m.measurementContext,
      sourceType: m.sourceType as
        | "encounter_extracted"
        | "manual_entry"
        | "verbal_dictation"
        | "imported",
      verifiedByClinician: m.verifiedByClinician,
      notes: m.notes,
    }));
  },
});

/**
 * Get metrics grouped by type for chart generation
 */
export const getPatientMetricsByType = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.id("practicePatients"),
    metricTypes: v.array(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.record(
    v.string(),
    v.array(
      v.object({
        date: v.number(),
        value: v.optional(v.number()),
        textValue: v.optional(v.string()),
        metricName: v.string(),
        side: v.optional(v.string()),
      })
    )
  ),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId
    );

    const hasAccess = await verifyPatientAccess(
      ctx,
      args.patientId,
      practiceId,
      args.practiceUserId,
      role
    );
    if (!hasAccess) {
      throw new Error("Access denied to patient data");
    }

    const metrics = await ctx.db
      .query("clinicalMetrics")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const filtered = metrics.filter((m) => {
      if (m.isDeleted) return false;
      if (!args.metricTypes.includes(m.metricType)) return false;
      if (args.startDate && m.measurementDate < args.startDate) return false;
      if (args.endDate && m.measurementDate > args.endDate) return false;
      return true;
    });

    // Group by metric type
    const grouped: Record<
      string,
      Array<{
        date: number;
        value: number | undefined;
        textValue: string | undefined;
        metricName: string;
        side: string | undefined;
      }>
    > = {};

    for (const metric of filtered) {
      if (!grouped[metric.metricType]) {
        grouped[metric.metricType] = [];
      }
      grouped[metric.metricType].push({
        date: metric.measurementDate,
        value: metric.numericValue,
        textValue: metric.textValue,
        metricName: metric.metricName,
        side: metric.side,
      });
    }

    // Sort each group by date
    for (const type of Object.keys(grouped)) {
      grouped[type].sort((a, b) => a.date - b.date);
    }

    return grouped;
  },
});

/**
 * Get available metric types for a patient (for UI dropdowns)
 */
export const getPatientMetricTypes = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.id("practicePatients"),
  },
  returns: v.array(
    v.object({
      metricType: v.string(),
      metricNames: v.array(v.string()),
      count: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId
    );

    const hasAccess = await verifyPatientAccess(
      ctx,
      args.patientId,
      practiceId,
      args.practiceUserId,
      role
    );
    if (!hasAccess) {
      throw new Error("Access denied to patient data");
    }

    const metrics = await ctx.db
      .query("clinicalMetrics")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    const filtered = metrics.filter((m) => !m.isDeleted);

    // Group by type and collect unique names
    const typeMap = new Map<string, Set<string>>();
    for (const metric of filtered) {
      if (!typeMap.has(metric.metricType)) {
        typeMap.set(metric.metricType, new Set());
      }
      typeMap.get(metric.metricType)!.add(metric.metricName);
    }

    return Array.from(typeMap.entries()).map(([type, names]) => ({
      metricType: type,
      metricNames: Array.from(names),
      count: filtered.filter((m) => m.metricType === type).length,
    }));
  },
});

// =============================================================================
// CLINICAL METRICS MUTATIONS
// =============================================================================

/**
 * Create a new clinical metric (manual entry)
 */
export const createMetric = mutation({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.id("practicePatients"),
    encounterId: v.optional(v.id("practiceEncounters")),
    caseId: v.optional(v.id("practiceCases")),
    metricType: v.string(),
    metricName: v.string(),
    bodyRegion: v.optional(v.string()),
    side: v.optional(sideValidator),
    numericValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    textValue: v.optional(v.string()),
    normalRangeMin: v.optional(v.number()),
    normalRangeMax: v.optional(v.number()),
    measurementDate: v.number(),
    measurementContext: v.optional(v.string()),
    notes: v.optional(v.string()),
    sourceType: v.optional(metricSourceTypeValidator),
  },
  returns: v.id("clinicalMetrics"),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin", "clinician"]
    );

    const hasAccess = await verifyPatientAccess(
      ctx,
      args.patientId,
      practiceId,
      args.practiceUserId,
      role
    );
    if (!hasAccess) {
      throw new Error("Access denied to patient data");
    }

    const now = Date.now();
    const metricId = await ctx.db.insert("clinicalMetrics", {
      practiceId,
      patientId: args.patientId,
      encounterId: args.encounterId,
      caseId: args.caseId,
      clinicianId: args.practiceUserId,
      metricType: args.metricType,
      metricName: args.metricName,
      bodyRegion: args.bodyRegion,
      side: args.side,
      numericValue: args.numericValue,
      unit: args.unit,
      textValue: args.textValue,
      normalRangeMin: args.normalRangeMin,
      normalRangeMax: args.normalRangeMax,
      measurementDate: args.measurementDate,
      measurementContext: args.measurementContext,
      notes: args.notes,
      sourceType: args.sourceType ?? "manual_entry",
      verifiedByClinician: true, // Manual entry is inherently verified
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    // Log audit event
    await ctx.db.insert("practiceAuditLogs", {
      practiceId,
      userId: args.practiceUserId,
      action: "cma_metric_created",
      entityType: "clinicalMetrics",
      entityId: metricId,
      metadataJson: JSON.stringify({
        patientId: args.patientId,
        metricType: args.metricType,
        metricName: args.metricName,
      }),
      createdAt: now,
    });

    return metricId;
  },
});

/**
 * Update a clinical metric
 */
export const updateMetric = mutation({
  args: {
    practiceUserId: v.id("practiceUsers"),
    metricId: v.id("clinicalMetrics"),
    numericValue: v.optional(v.number()),
    textValue: v.optional(v.string()),
    notes: v.optional(v.string()),
    verifiedByClinician: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin", "clinician"]
    );

    const metric = await ctx.db.get(args.metricId);
    if (!metric || metric.isDeleted || metric.practiceId !== practiceId) {
      throw new Error("Metric not found");
    }

    const hasAccess = await verifyPatientAccess(
      ctx,
      metric.patientId,
      practiceId,
      args.practiceUserId,
      role
    );
    if (!hasAccess) {
      throw new Error("Access denied to patient data");
    }

    const now = Date.now();
    await ctx.db.patch(args.metricId, {
      ...(args.numericValue !== undefined && { numericValue: args.numericValue }),
      ...(args.textValue !== undefined && { textValue: args.textValue }),
      ...(args.notes !== undefined && { notes: args.notes }),
      ...(args.verifiedByClinician !== undefined && {
        verifiedByClinician: args.verifiedByClinician,
      }),
      updatedAt: now,
    });

    // Log audit event
    await ctx.db.insert("practiceAuditLogs", {
      practiceId,
      userId: args.practiceUserId,
      action: "cma_metric_updated",
      entityType: "clinicalMetrics",
      entityId: args.metricId,
      metadataJson: JSON.stringify({
        patientId: metric.patientId,
        changes: Object.keys(args).filter((k) => k !== "practiceUserId" && k !== "metricId"),
      }),
      createdAt: now,
    });

    return null;
  },
});

/**
 * Soft delete a clinical metric
 */
export const deleteMetric = mutation({
  args: {
    practiceUserId: v.id("practiceUsers"),
    metricId: v.id("clinicalMetrics"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin", "clinician"]
    );

    const metric = await ctx.db.get(args.metricId);
    if (!metric || metric.isDeleted || metric.practiceId !== practiceId) {
      throw new Error("Metric not found");
    }

    const hasAccess = await verifyPatientAccess(
      ctx,
      metric.patientId,
      practiceId,
      args.practiceUserId,
      role
    );
    if (!hasAccess) {
      throw new Error("Access denied to patient data");
    }

    const now = Date.now();
    await ctx.db.patch(args.metricId, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });

    // Log audit event
    await ctx.db.insert("practiceAuditLogs", {
      practiceId,
      userId: args.practiceUserId,
      action: "cma_metric_deleted",
      entityType: "clinicalMetrics",
      entityId: args.metricId,
      metadataJson: JSON.stringify({ patientId: metric.patientId }),
      createdAt: now,
    });

    return null;
  },
});

// =============================================================================
// CMA ANALYTICS QUERIES
// =============================================================================

/**
 * Get saved analytics for a patient
 */
export const getPatientAnalytics = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.id("practicePatients"),
    status: v.optional(analyticsStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("cmaAnalytics"),
      _creationTime: v.number(),
      name: v.string(),
      analysisType: analysisTypeValidator,
      originalPrompt: v.string(),
      graphType: v.string(),
      status: analyticsStatusValidator,
      reviewedByClinician: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId
    );

    const hasAccess = await verifyPatientAccess(
      ctx,
      args.patientId,
      practiceId,
      args.practiceUserId,
      role
    );
    if (!hasAccess) {
      throw new Error("Access denied to patient data");
    }

    const analytics = await ctx.db
      .query("cmaAnalytics")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    let filtered = analytics.filter((a) => !a.isDeleted);
    if (args.status) {
      filtered = filtered.filter((a) => a.status === args.status);
    }

    return filtered.map((a) => ({
      _id: a._id,
      _creationTime: a._creationTime,
      name: a.name,
      analysisType: a.analysisType as "patient" | "clinic" | "cohort",
      originalPrompt: a.originalPrompt,
      graphType: a.graphType,
      status: a.status as "draft" | "active" | "archived" | "error",
      reviewedByClinician: a.reviewedByClinician,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  },
});

/**
 * Get a specific analytics object with full data
 */
export const getAnalyticsById = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    analyticsId: v.id("cmaAnalytics"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("cmaAnalytics"),
      name: v.string(),
      analysisType: analysisTypeValidator,
      originalPrompt: v.string(),
      interpretedQuery: v.string(),
      graphType: v.string(),
      graphConfig: v.string(),
      resultData: v.string(),
      resultSummary: v.optional(v.string()),
      insightsJson: v.optional(v.string()),
      status: analyticsStatusValidator,
      reviewedByClinician: v.boolean(),
      reviewedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId
    );

    const analytics = await ctx.db.get(args.analyticsId);
    if (!analytics || analytics.isDeleted || analytics.practiceId !== practiceId) {
      return null;
    }

    // Check patient access if patient-level
    if (analytics.patientId) {
      const hasAccess = await verifyPatientAccess(
        ctx,
        analytics.patientId,
        practiceId,
        args.practiceUserId,
        role
      );
      if (!hasAccess) {
        throw new Error("Access denied to patient data");
      }
    } else if (analytics.analysisType === "clinic" && role !== "practice_admin") {
      // Clinic-level requires admin
      throw new Error("Admin access required for clinic analytics");
    }

    return {
      _id: analytics._id,
      name: analytics.name,
      analysisType: analytics.analysisType as "patient" | "clinic" | "cohort",
      originalPrompt: analytics.originalPrompt,
      interpretedQuery: analytics.interpretedQuery,
      graphType: analytics.graphType,
      graphConfig: analytics.graphConfig,
      resultData: analytics.resultData,
      resultSummary: analytics.resultSummary,
      insightsJson: analytics.insightsJson,
      status: analytics.status as "draft" | "active" | "archived" | "error",
      reviewedByClinician: analytics.reviewedByClinician,
      reviewedAt: analytics.reviewedAt,
      createdAt: analytics.createdAt,
      updatedAt: analytics.updatedAt,
    };
  },
});

/**
 * Get clinic-level analytics (admin only)
 */
export const getClinicAnalytics = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    status: v.optional(analyticsStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("cmaAnalytics"),
      name: v.string(),
      analysisType: analysisTypeValidator,
      originalPrompt: v.string(),
      graphType: v.string(),
      status: analyticsStatusValidator,
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin"]
    );

    const analytics = await ctx.db
      .query("cmaAnalytics")
      .withIndex("by_practiceId_and_analysisType", (q) =>
        q.eq("practiceId", practiceId).eq("analysisType", "clinic")
      )
      .collect();

    let filtered = analytics.filter((a) => !a.isDeleted);
    if (args.status) {
      filtered = filtered.filter((a) => a.status === args.status);
    }

    return filtered.map((a) => ({
      _id: a._id,
      name: a.name,
      analysisType: a.analysisType as "patient" | "clinic" | "cohort",
      originalPrompt: a.originalPrompt,
      graphType: a.graphType,
      status: a.status as "draft" | "active" | "archived" | "error",
      createdAt: a.createdAt,
    }));
  },
});

// =============================================================================
// CMA ANALYTICS MUTATIONS
// =============================================================================

/**
 * Save a new analytics object
 */
export const saveAnalytics = mutation({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.optional(v.id("practicePatients")),
    caseId: v.optional(v.id("practiceCases")),
    name: v.string(),
    analysisType: analysisTypeValidator,
    originalPrompt: v.string(),
    interpretedQuery: v.string(),
    dataDependencies: v.string(),
    graphType: v.string(),
    graphConfig: v.string(),
    resultData: v.string(),
    resultSummary: v.optional(v.string()),
    insightsJson: v.optional(v.string()),
  },
  returns: v.id("cmaAnalytics"),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin", "clinician"]
    );

    // Validate patient access for patient-level analytics
    if (args.patientId) {
      const hasAccess = await verifyPatientAccess(
        ctx,
        args.patientId,
        practiceId,
        args.practiceUserId,
        role
      );
      if (!hasAccess) {
        throw new Error("Access denied to patient data");
      }
    } else if (args.analysisType === "clinic" && role !== "practice_admin") {
      throw new Error("Admin access required for clinic analytics");
    }

    const now = Date.now();
    const analyticsId = await ctx.db.insert("cmaAnalytics", {
      practiceId,
      patientId: args.patientId,
      caseId: args.caseId,
      createdByUserId: args.practiceUserId,
      name: args.name,
      analysisType: args.analysisType,
      originalPrompt: args.originalPrompt,
      interpretedQuery: args.interpretedQuery,
      dataDependencies: args.dataDependencies,
      lastDataVersion: now,
      graphType: args.graphType,
      graphConfig: args.graphConfig,
      resultData: args.resultData,
      resultSummary: args.resultSummary,
      insightsJson: args.insightsJson,
      insightsGeneratedAt: args.insightsJson ? now : undefined,
      status: "active",
      reviewedByClinician: false,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    // Log audit event
    await ctx.db.insert("practiceAuditLogs", {
      practiceId,
      userId: args.practiceUserId,
      action: "cma_analytics_created",
      entityType: "cmaAnalytics",
      entityId: analyticsId,
      metadataJson: JSON.stringify({
        patientId: args.patientId,
        analysisType: args.analysisType,
        name: args.name,
      }),
      createdAt: now,
    });

    return analyticsId;
  },
});

/**
 * Mark analytics as reviewed by clinician
 */
export const markAnalyticsReviewed = mutation({
  args: {
    practiceUserId: v.id("practiceUsers"),
    analyticsId: v.id("cmaAnalytics"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin", "clinician"]
    );

    const analytics = await ctx.db.get(args.analyticsId);
    if (!analytics || analytics.isDeleted || analytics.practiceId !== practiceId) {
      throw new Error("Analytics not found");
    }

    // Verify access
    if (analytics.patientId) {
      const hasAccess = await verifyPatientAccess(
        ctx,
        analytics.patientId,
        practiceId,
        args.practiceUserId,
        role
      );
      if (!hasAccess) {
        throw new Error("Access denied to patient data");
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.analyticsId, {
      reviewedByClinician: true,
      reviewedAt: now,
      reviewedByUserId: args.practiceUserId,
      updatedAt: now,
    });

    // Log audit event
    await ctx.db.insert("practiceAuditLogs", {
      practiceId,
      userId: args.practiceUserId,
      action: "cma_analytics_reviewed",
      entityType: "cmaAnalytics",
      entityId: args.analyticsId,
      createdAt: now,
    });

    return null;
  },
});

/**
 * Archive an analytics object (stop auto-updating)
 */
export const archiveAnalytics = mutation({
  args: {
    practiceUserId: v.id("practiceUsers"),
    analyticsId: v.id("cmaAnalytics"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin", "clinician"]
    );

    const analytics = await ctx.db.get(args.analyticsId);
    if (!analytics || analytics.isDeleted || analytics.practiceId !== practiceId) {
      throw new Error("Analytics not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.analyticsId, {
      status: "archived",
      updatedAt: now,
    });

    // Log audit event
    await ctx.db.insert("practiceAuditLogs", {
      practiceId,
      userId: args.practiceUserId,
      action: "cma_analytics_archived",
      entityType: "cmaAnalytics",
      entityId: args.analyticsId,
      createdAt: now,
    });

    return null;
  },
});

// =============================================================================
// CMA PROMPT LOGGING
// =============================================================================

/**
 * Log a CMA prompt (internal use by actions)
 */
export const logPrompt = internalMutation({
  args: {
    practiceId: v.id("clinicPractices"),
    userId: v.id("practiceUsers"),
    analyticsId: v.optional(v.id("cmaAnalytics")),
    patientId: v.optional(v.id("practicePatients")),
    promptText: v.string(),
    aiModel: v.string(),
    aiRequestId: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    processingTimeMs: v.optional(v.number()),
    interpretedQuery: v.optional(v.string()),
    responseType: v.string(),
    errorDetails: v.optional(v.string()),
    dataFieldsAccessed: v.optional(v.string()),
    patientIdsAccessed: v.optional(v.string()),
  },
  returns: v.id("cmaPromptLogs"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("cmaPromptLogs", {
      practiceId: args.practiceId,
      userId: args.userId,
      analyticsId: args.analyticsId,
      patientId: args.patientId,
      promptText: args.promptText,
      promptTimestamp: now,
      aiModel: args.aiModel,
      aiRequestId: args.aiRequestId,
      tokensUsed: args.tokensUsed,
      processingTimeMs: args.processingTimeMs,
      interpretedQuery: args.interpretedQuery,
      responseType: args.responseType,
      errorDetails: args.errorDetails,
      dataFieldsAccessed: args.dataFieldsAccessed,
      patientIdsAccessed: args.patientIdsAccessed,
      createdAt: now,
    });
  },
});

/**
 * Get prompt history (for audit/debugging)
 */
export const getPromptHistory = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.optional(v.id("practicePatients")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("cmaPromptLogs"),
      promptText: v.string(),
      promptTimestamp: v.number(),
      responseType: v.string(),
      aiModel: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const { practiceId, role } = await requirePracticeAccess(
      ctx,
      args.practiceUserId,
      ["practice_admin"]
    );

    let logs;
    if (args.patientId) {
      logs = await ctx.db
        .query("cmaPromptLogs")
        .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
        .collect();
    } else {
      logs = await ctx.db
        .query("cmaPromptLogs")
        .withIndex("by_practiceId", (q) => q.eq("practiceId", practiceId))
        .collect();
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.promptTimestamp - a.promptTimestamp);

    if (args.limit) {
      logs = logs.slice(0, args.limit);
    }

    return logs.map((l) => ({
      _id: l._id,
      promptText: l.promptText,
      promptTimestamp: l.promptTimestamp,
      responseType: l.responseType,
      aiModel: l.aiModel,
    }));
  },
});

// =============================================================================
// METRIC DEFINITIONS
// =============================================================================

/**
 * Get available metric definitions
 */
export const getMetricDefinitions = query({
  args: {
    practiceUserId: v.id("practiceUsers"),
    metricType: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("cmaMetricDefinitions"),
      metricType: v.string(),
      metricName: v.string(),
      displayName: v.string(),
      description: v.optional(v.string()),
      unit: v.string(),
      normalRangeMin: v.optional(v.number()),
      normalRangeMax: v.optional(v.number()),
      higherIsBetter: v.boolean(),
      isSystemDefinition: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const { practiceId } = await requirePracticeAccess(ctx, args.practiceUserId);

    // Get system definitions
    const systemDefs = await ctx.db
      .query("cmaMetricDefinitions")
      .withIndex("by_isSystemDefinition", (q) => q.eq("isSystemDefinition", true))
      .collect();

    // Get practice-specific definitions
    const practiceDefs = await ctx.db
      .query("cmaMetricDefinitions")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", practiceId))
      .collect();

    let allDefs = [...systemDefs, ...practiceDefs].filter((d) => d.isActive);

    if (args.metricType) {
      allDefs = allDefs.filter((d) => d.metricType === args.metricType);
    }

    return allDefs.map((d) => ({
      _id: d._id,
      metricType: d.metricType,
      metricName: d.metricName,
      displayName: d.displayName,
      description: d.description,
      unit: d.unit,
      normalRangeMin: d.normalRangeMin,
      normalRangeMax: d.normalRangeMax,
      higherIsBetter: d.higherIsBetter,
      isSystemDefinition: d.isSystemDefinition,
    }));
  },
});
