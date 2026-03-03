"use node";

/**
 * CMA AI Actions - OpenAI integration for prompt interpretation and insights
 * Uses Node.js runtime for OpenAI SDK
 */

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =============================================================================
// TYPES
// =============================================================================

interface InterpretedQuery {
  metricTypes: string[];
  metricNames: string[];
  bodyRegions: string[];
  sides: ("L" | "R" | "Bilateral")[];
  dateRange: {
    start?: string;
    end?: string;
    relative?: string; // "last_8_weeks", "all_time", etc.
  };
  graphType: "line" | "bar" | "scatter" | "comparison" | "multi_axis";
  xAxis: string;
  yAxes: string[];
  comparisons: string[];
  aggregation?: "none" | "average" | "max" | "min";
  title: string;
}

interface GraphConfig {
  type: string;
  title: string;
  xAxis: {
    field: string;
    label: string;
    type: "date" | "category" | "number";
  };
  yAxes: Array<{
    field: string;
    label: string;
    unit: string;
    color: string;
  }>;
  showLegend: boolean;
  showGrid: boolean;
}

interface Insight {
  type: "plateau" | "improvement" | "correlation" | "change" | "warning";
  text: string;
  confidence: number;
  dateRange?: { start: string; end: string };
  sources: Array<{
    type: string;
    id: string;
    date: string;
    excerpt?: string;
  }>;
}

// =============================================================================
// PROMPT INTERPRETATION
// =============================================================================

const INTERPRETATION_SYSTEM_PROMPT = `You are a clinical analytics assistant for a physical therapy EMR system. Your job is to interpret natural language requests about patient clinical metrics and convert them into structured queries.

Available metric types:
- rom (Range of Motion): hip_internal_rotation, hip_external_rotation, knee_flexion, knee_extension, shoulder_flexion, shoulder_abduction, ankle_dorsiflexion, etc.
- strength: quad_strength, hamstring_strength, hip_abductor_strength, grip_strength, etc.
- pain: vas_pain (0-10 scale), pain_at_rest, pain_with_activity
- functional: gait_speed, sit_to_stand, balance_score, timed_up_and_go
- balance: single_leg_stance, berg_balance_score
- custom: any user-defined metrics

Graph types:
- line: For trends over time
- bar: For comparing discrete values
- scatter: For correlation analysis
- comparison: For comparing two metrics
- multi_axis: For overlaying metrics with different scales

Respond with a JSON object containing:
{
  "metricTypes": ["rom", "pain"], // Array of metric type categories
  "metricNames": ["hip_internal_rotation"], // Specific metric names if mentioned
  "bodyRegions": ["hip"], // Body regions mentioned
  "sides": ["L", "R"], // L, R, or Bilateral
  "dateRange": {
    "start": "2024-01-01", // ISO date or null
    "end": "2024-03-01", // ISO date or null
    "relative": "last_8_weeks" // Or: "all_time", "last_4_weeks", "since_initial_eval"
  },
  "graphType": "line", // Best graph type for this request
  "xAxis": "date", // What to put on x-axis
  "yAxes": ["hip_internal_rotation"], // What to plot on y-axis
  "comparisons": ["pain"], // If comparing metrics
  "aggregation": "none", // "none", "average", "max", "min"
  "title": "Hip Internal Rotation Progression" // Suggested title
}

If the request is unclear, include a "clarificationNeeded" field with a question to ask the user.`;

/**
 * Interpret a natural language prompt into a structured query
 */
export const interpretPrompt = action({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.optional(v.id("practicePatients")),
    promptText: v.string(),
    isClinicLevel: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    interpretedQuery: v.optional(v.string()),
    clarificationNeeded: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    interpretedQuery?: string;
    clarificationNeeded?: string;
    error?: string;
  }> => {
    const startTime = Date.now();

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "OpenAI API key not configured",
      };
    }

    try {
      // Get user info for access validation
      const user = await ctx.runQuery(api.practiceUsers.getById, {
        userId: args.practiceUserId,
      });
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Build context message
      let contextMessage = `Analyze this clinical metrics request: "${args.promptText}"`;
      if (args.isClinicLevel) {
        contextMessage +=
          "\n\nThis is a CLINIC-LEVEL analytics request. The query should work with aggregated, de-identified data across multiple patients.";
      } else if (args.patientId) {
        contextMessage +=
          "\n\nThis is for a specific patient. Return patient-level analysis.";
      }

      // Call OpenAI
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: INTERPRETATION_SYSTEM_PROMPT },
            { role: "user", content: contextMessage },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;
      const aiResponse = data.choices[0].message.content;
      const parsed = JSON.parse(aiResponse);

      // Log the prompt
      await ctx.runMutation(internal.cma.logPrompt, {
        practiceId: user.practiceId,
        userId: args.practiceUserId,
        patientId: args.patientId,
        promptText: args.promptText,
        aiModel: "gpt-4o",
        aiRequestId: data.id,
        tokensUsed: data.usage?.total_tokens,
        processingTimeMs: processingTime,
        interpretedQuery: aiResponse,
        responseType: parsed.clarificationNeeded ? "clarification_needed" : "success",
        dataFieldsAccessed: JSON.stringify(parsed.metricTypes || []),
      });

      if (parsed.clarificationNeeded) {
        return {
          success: true,
          clarificationNeeded: parsed.clarificationNeeded,
        };
      }

      return {
        success: true,
        interpretedQuery: aiResponse,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log the error
      const user = await ctx.runQuery(api.practiceUsers.getById, {
        userId: args.practiceUserId,
      });
      if (user) {
        await ctx.runMutation(internal.cma.logPrompt, {
          practiceId: user.practiceId,
          userId: args.practiceUserId,
          patientId: args.patientId,
          promptText: args.promptText,
          aiModel: "gpt-4o",
          processingTimeMs: processingTime,
          responseType: "error",
          errorDetails: errorMessage,
        });
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

// =============================================================================
// GRAPH DATA GENERATION
// =============================================================================

/**
 * Generate graph data from metrics based on interpreted query
 */
export const generateGraphData = action({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.id("practicePatients"),
    interpretedQuery: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    graphConfig: v.optional(v.string()),
    resultData: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    graphConfig?: string;
    resultData?: string;
    error?: string;
  }> => {
    try {
      const query: InterpretedQuery = JSON.parse(args.interpretedQuery);

      // Calculate date range
      let startDate: number | undefined;
      let endDate: number | undefined;

      if (query.dateRange.relative) {
        const now = Date.now();
        switch (query.dateRange.relative) {
          case "last_4_weeks":
            startDate = now - 28 * 24 * 60 * 60 * 1000;
            break;
          case "last_8_weeks":
            startDate = now - 56 * 24 * 60 * 60 * 1000;
            break;
          case "last_12_weeks":
            startDate = now - 84 * 24 * 60 * 60 * 1000;
            break;
          case "all_time":
            // No start date filter
            break;
        }
        endDate = now;
      } else {
        if (query.dateRange.start) {
          startDate = new Date(query.dateRange.start).getTime();
        }
        if (query.dateRange.end) {
          endDate = new Date(query.dateRange.end).getTime();
        }
      }

      // Fetch metrics data
      const metricsData = await ctx.runQuery(api.cma.getPatientMetricsByType, {
        practiceUserId: args.practiceUserId,
        patientId: args.patientId,
        metricTypes: query.metricTypes,
        startDate,
        endDate,
      });

      // Build graph config
      const colors = [
        "#3b82f6", // blue
        "#ef4444", // red
        "#10b981", // green
        "#f59e0b", // amber
        "#8b5cf6", // purple
      ];

      const graphConfig: GraphConfig = {
        type: query.graphType,
        title: query.title,
        xAxis: {
          field: "date",
          label: "Date",
          type: "date",
        },
        yAxes: query.yAxes.map((field, index) => ({
          field,
          label: field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          unit: query.metricTypes.includes("rom")
            ? "degrees"
            : query.metricTypes.includes("pain")
              ? "0-10"
              : "",
          color: colors[index % colors.length],
        })),
        showLegend: query.yAxes.length > 1 || query.comparisons.length > 0,
        showGrid: true,
      };

      // Transform data for charting
      const chartData: Array<Record<string, unknown>> = [];
      const dateMap = new Map<number, Record<string, unknown>>();

      for (const [metricType, dataPoints] of Object.entries(metricsData)) {
        for (const point of dataPoints) {
          const dateKey = Math.floor(point.date / (24 * 60 * 60 * 1000)); // Day precision
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { date: point.date });
          }
          const entry = dateMap.get(dateKey)!;

          // Build field name (e.g., "hip_internal_rotation_L")
          let fieldName = point.metricName;
          if (point.side && point.side !== "NA" && point.side !== "Bilateral") {
            fieldName += `_${point.side}`;
          }

          entry[fieldName] = point.value ?? point.textValue;
        }
      }

      // Convert map to sorted array
      const sortedData = Array.from(dateMap.values()).sort(
        (a, b) => (a.date as number) - (b.date as number)
      );

      return {
        success: true,
        graphConfig: JSON.stringify(graphConfig),
        resultData: JSON.stringify(sortedData),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate graph data",
      };
    }
  },
});

// =============================================================================
// INSIGHTS GENERATION
// =============================================================================

const INSIGHTS_SYSTEM_PROMPT = `You are a clinical analytics assistant for a physical therapy EMR. Analyze patient clinical data trends and generate clinically relevant insights.

Guidelines:
1. Identify plateaus, improvements, regressions, and correlations
2. Reference specific dates or date ranges when discussing changes
3. Phrase insights as "documentation-supported hypotheses" or "possible contributing factors"
4. NEVER make autonomous medical diagnoses or treatment decisions
5. Always acknowledge that clinician review is required
6. Focus on objective findings from the data

For each insight, provide:
- type: "plateau" | "improvement" | "correlation" | "change" | "warning"
- text: Clear, professional summary (1-2 sentences)
- confidence: 0.0 to 1.0 based on data support
- dateRange: { start, end } if applicable
- contributingFactors: Possible factors if identifiable from documentation

Format response as JSON array of insight objects.`;

/**
 * Generate AI-powered insights for analytics
 */
export const generateInsights = action({
  args: {
    practiceUserId: v.id("practiceUsers"),
    patientId: v.id("practicePatients"),
    resultData: v.string(),
    graphConfig: v.string(),
    encounterSummaries: v.optional(v.string()), // JSON array of encounter excerpts
  },
  returns: v.object({
    success: v.boolean(),
    insightsJson: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    insightsJson?: string;
    error?: string;
  }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OpenAI API key not configured" };
    }

    try {
      const graphConfig = JSON.parse(args.graphConfig);
      const resultData = JSON.parse(args.resultData);

      // Build analysis context
      let contextMessage = `Analyze this clinical data for a physical therapy patient:

Title: ${graphConfig.title}
Data points: ${resultData.length} measurements

Data summary:
${JSON.stringify(resultData.slice(0, 20), null, 2)}
${resultData.length > 20 ? `... and ${resultData.length - 20} more data points` : ""}`;

      if (args.encounterSummaries) {
        const encounters = JSON.parse(args.encounterSummaries);
        contextMessage += `

Related encounter notes (for context):
${encounters.slice(0, 5).map((e: { date: string; excerpt: string }) => `- ${e.date}: ${e.excerpt}`).join("\n")}`;
      }

      contextMessage +=
        "\n\nProvide 2-4 clinically relevant insights based on this data.";

      // Call OpenAI
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
            { role: "user", content: contextMessage },
          ],
          temperature: 0.4,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const insightsResponse = data.choices[0].message.content;

      // Validate response structure
      const parsed = JSON.parse(insightsResponse);
      if (!parsed.insights || !Array.isArray(parsed.insights)) {
        // Wrap single insights array
        return {
          success: true,
          insightsJson: JSON.stringify({ insights: parsed }),
        };
      }

      return {
        success: true,
        insightsJson: insightsResponse,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate insights",
      };
    }
  },
});

// =============================================================================
// METRIC EXTRACTION FROM ENCOUNTERS
// =============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are a clinical data extraction assistant. Extract structured clinical metrics from physical therapy encounter notes.

Extract these metric types when present:
- ROM (Range of Motion): Look for degree measurements (e.g., "hip IR 35°", "knee flexion 120 degrees")
- Strength: Look for MMT grades, dynamometer readings, or descriptive strength (e.g., "quad 4/5", "grip strength 45 lbs")
- Pain: Look for VAS/NRS scores (e.g., "pain 6/10", "VAS 4")
- Functional: Look for outcome measures (e.g., "TUG 12 seconds", "6MWT 350m")

For each extracted metric, provide:
{
  "metricType": "rom|strength|pain|functional|custom",
  "metricName": "hip_internal_rotation", // snake_case
  "bodyRegion": "hip",
  "side": "L|R|Bilateral|NA",
  "numericValue": 35,
  "unit": "degrees|0-10|lbs|seconds|etc",
  "confidence": 0.0-1.0,
  "sourceText": "exact text from note"
}

If a metric is unclear or ambiguous, set confidence lower (< 0.7).
Return a JSON object with "metrics" array.`;

/**
 * Extract structured metrics from encounter text
 */
export const extractMetricsFromEncounter = action({
  args: {
    practiceUserId: v.id("practiceUsers"),
    encounterId: v.id("practiceEncounters"),
    encounterText: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    metrics: v.optional(
      v.array(
        v.object({
          metricType: v.string(),
          metricName: v.string(),
          bodyRegion: v.optional(v.string()),
          side: v.optional(v.string()),
          numericValue: v.optional(v.number()),
          unit: v.optional(v.string()),
          textValue: v.optional(v.string()),
          confidence: v.number(),
          sourceText: v.string(),
        })
      )
    ),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    metrics?: Array<{
      metricType: string;
      metricName: string;
      bodyRegion?: string;
      side?: string;
      numericValue?: number;
      unit?: string;
      textValue?: string;
      confidence: number;
      sourceText: string;
    }>;
    error?: string;
  }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OpenAI API key not configured" };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Extract clinical metrics from this encounter note:\n\n${args.encounterText}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      return {
        success: true,
        metrics: parsed.metrics || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract metrics",
      };
    }
  },
});

// =============================================================================
// AUTO-UPDATE ANALYTICS
// =============================================================================

/**
 * Check and refresh analytics that need updating
 */
export const refreshAnalytics = internalAction({
  args: {
    analyticsId: v.id("cmaAnalytics"),
  },
  returns: v.object({
    success: v.boolean(),
    updated: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    updated: boolean;
    error?: string;
  }> => {
    // This would be called by a scheduled job to refresh active analytics
    // Implementation would:
    // 1. Get the analytics object
    // 2. Check if new data exists since lastDataVersion
    // 3. If so, re-run the query and update resultData
    // 4. Optionally regenerate insights

    // For now, return success - full implementation requires scheduling setup
    return {
      success: true,
      updated: false,
    };
  },
});
