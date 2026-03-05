# Custom Metric Analyzer (CMA) Module Architecture

## Overview

The CMA module is a HIPAA-compliant, prompt-driven analytics system for clinical metrics analysis within the Novia Clinical EMR platform. It provides AI-assisted data visualization, trend analysis, and clinical insights at both patient and clinic levels.

---

## Database Schema Design

### New Tables

#### 1. `clinicalMetrics` - Structured clinical measurements
Stores individual clinical measurements extracted from encounters or entered manually.

```typescript
clinicalMetrics: defineTable({
  practiceId: v.id("clinicPractices"),
  patientId: v.id("practicePatients"),
  encounterId: v.optional(v.id("practiceEncounters")),
  caseId: v.optional(v.id("practiceCases")),
  clinicianId: v.id("practiceUsers"),

  // Metric identification
  metricType: v.string(), // "rom", "strength", "pain", "functional", "balance", "gait", "custom"
  metricName: v.string(), // "hip_internal_rotation", "quad_strength", "vas_pain", etc.
  bodyRegion: v.optional(v.string()), // "hip", "knee", "shoulder", etc.
  side: v.optional(v.union(v.literal("L"), v.literal("R"), v.literal("Bilateral"), v.literal("NA"))),

  // Measurement values
  numericValue: v.optional(v.number()), // For numeric measurements
  unit: v.optional(v.string()), // "degrees", "lbs", "0-10", "seconds", etc.
  textValue: v.optional(v.string()), // For qualitative measurements
  normalRangeMin: v.optional(v.number()), // Reference range
  normalRangeMax: v.optional(v.number()),

  // Context
  measurementDate: v.number(), // Timestamp of measurement
  measurementContext: v.optional(v.string()), // "baseline", "post_treatment", "discharge", etc.
  notes: v.optional(v.string()),

  // Source tracking
  sourceType: v.union(
    v.literal("encounter_extracted"), // AI-extracted from encounter text
    v.literal("manual_entry"),        // Clinician entered directly
    v.literal("verbal_dictation"),    // From speech-to-text
    v.literal("imported")             // From external source
  ),
  sourceText: v.optional(v.string()), // Original text if extracted
  confidenceScore: v.optional(v.number()), // AI extraction confidence (0-1)
  verifiedByClinician: v.boolean(), // Clinician reviewed/confirmed

  createdAt: v.number(),
  updatedAt: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
```

#### 2. `cmaAnalytics` - Saved CMA analysis objects
Stores prompt-based analytics that auto-update with new data.

```typescript
cmaAnalytics: defineTable({
  practiceId: v.id("clinicPractices"),
  patientId: v.optional(v.id("practicePatients")), // null for clinic-level
  caseId: v.optional(v.id("practiceCases")),
  createdByUserId: v.id("practiceUsers"),

  // Analytics identification
  name: v.string(), // User-provided name for this analysis
  analysisType: v.union(
    v.literal("patient"),    // Individual patient analysis
    v.literal("clinic"),     // Clinic-wide aggregated
    v.literal("cohort")      // Specific patient cohort
  ),

  // Original prompt & interpretation
  originalPrompt: v.string(), // User's natural language request
  interpretedQuery: v.string(), // JSON: AI's interpretation of the query

  // Data dependencies (for auto-update)
  dataDependencies: v.string(), // JSON: { metricTypes, dateRange, patientIds, etc. }
  lastDataVersion: v.number(), // Timestamp of last data used

  // Graph configuration
  graphType: v.string(), // "line", "bar", "scatter", "comparison", "multi_axis"
  graphConfig: v.string(), // JSON: axes, colors, labels, etc.

  // Computed results (cached)
  resultData: v.string(), // JSON: The actual data points for rendering
  resultSummary: v.optional(v.string()), // Text summary of findings

  // AI insights
  insightsJson: v.optional(v.string()), // JSON: AI-generated insights
  insightsGeneratedAt: v.optional(v.number()),

  // Status
  status: v.union(
    v.literal("draft"),      // Being created
    v.literal("active"),     // Saved and auto-updating
    v.literal("archived"),   // No longer auto-updating
    v.literal("error")       // Failed to compute
  ),
  errorMessage: v.optional(v.string()),

  // Review tracking
  reviewedByClinician: v.boolean(),
  reviewedAt: v.optional(v.number()),
  reviewedByUserId: v.optional(v.id("practiceUsers")),

  createdAt: v.number(),
  updatedAt: v.number(),
  isDeleted: v.boolean(),
  deletedAt: v.optional(v.number()),
})
```

#### 3. `cmaPromptLogs` - Audit trail for AI interactions
HIPAA-compliant logging of all AI prompts and responses.

```typescript
cmaPromptLogs: defineTable({
  practiceId: v.id("clinicPractices"),
  userId: v.id("practiceUsers"),
  analyticsId: v.optional(v.id("cmaAnalytics")),
  patientId: v.optional(v.id("practicePatients")),

  // Request
  promptText: v.string(),
  promptTimestamp: v.number(),

  // AI Processing
  aiModel: v.string(), // "gpt-4", "gpt-4o", etc.
  aiRequestId: v.optional(v.string()), // OpenAI request ID
  tokensUsed: v.optional(v.number()),
  processingTimeMs: v.optional(v.number()),

  // Response
  interpretedQuery: v.optional(v.string()),
  responseType: v.string(), // "success", "clarification_needed", "error"
  errorDetails: v.optional(v.string()),

  // Data access tracking (HIPAA)
  dataFieldsAccessed: v.optional(v.string()), // JSON array of accessed fields
  patientIdsAccessed: v.optional(v.string()), // JSON array (for clinic-level)

  createdAt: v.number(),
})
```

#### 4. `cmaInsightSources` - Traceability for insights
Links insights to source documentation.

```typescript
cmaInsightSources: defineTable({
  practiceId: v.id("clinicPractices"),
  analyticsId: v.id("cmaAnalytics"),

  // Insight reference
  insightIndex: v.number(), // Which insight in the insightsJson array
  insightText: v.string(), // The insight statement

  // Source documentation
  sourceType: v.string(), // "encounter", "metric", "appointment"
  sourceId: v.string(), // ID of the source record
  sourceDate: v.number(),
  sourceExcerpt: v.optional(v.string()), // Relevant text excerpt

  createdAt: v.number(),
})
```

---

## API Design

### Convex Functions

#### Queries

1. **`cma.getPatientMetrics`** - Get all metrics for a patient
2. **`cma.getAnalytics`** - Get saved analytics for patient/clinic
3. **`cma.getAnalyticsById`** - Get specific analytics object
4. **`cma.getPromptHistory`** - Get prompt history for audit
5. **`cma.getClinicAggregates`** - Get de-identified clinic metrics (admin only)

#### Mutations

1. **`cma.createMetric`** - Manually add clinical metric
2. **`cma.updateMetric`** - Update metric value
3. **`cma.saveAnalytics`** - Save prompt-based analytics
4. **`cma.archiveAnalytics`** - Archive analytics object
5. **`cma.verifyMetric`** - Clinician verification of AI-extracted metric

#### Actions (AI Integration)

1. **`cma.interpretPrompt`** - Send prompt to OpenAI for interpretation
2. **`cma.generateGraphData`** - Compute graph data from metrics
3. **`cma.generateInsights`** - Generate AI insights for analytics
4. **`cma.extractMetricsFromEncounter`** - Extract structured metrics from encounter text
5. **`cma.refreshAnalytics`** - Re-compute analytics with new data

---

## Security & Compliance

### Role-Based Access

| Role | Patient CMA | Clinic CMA | View De-identified |
|------|-------------|------------|-------------------|
| practice_admin | ✓ (all patients) | ✓ | ✓ |
| clinician | ✓ (assigned only) | ✗ | ✗ |
| staff | ✗ | ✗ | ✗ |

### Data Isolation

1. **Patient-Level**: Only accessible to assigned clinician or admin
2. **Clinic-Level**: Aggregated/de-identified, admin only
3. **Cross-Patient**: Never show identifiable data in comparisons

### Audit Requirements

- Log all AI prompts with user ID and timestamp
- Track which patient data was accessed per request
- Store data access patterns for minimum necessary compliance
- Retain logs per HIPAA retention requirements

### PHI Handling

- OpenAI BAA covers AI processing
- No PHI in client-side logs or localStorage
- Encrypt metrics at rest (Convex handles this)
- All API calls over HTTPS (enforced)

---

## UI Components

### Patient-Level CMA Tab

Location: Patient Chart > CMA Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Custom Metric Analyzer                                       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Ask CMA: "Show hip ROM progression over rehab"    [Go] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    [GRAPH AREA]                         │ │
│ │              (Dynamic chart rendering)                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💡 AI Insights (requires clinician review)              │ │
│ │ • Progress plateau detected weeks 4-6. Contributing     │ │
│ │   factors may include: reduced visit frequency (1x/wk   │ │
│ │   vs 2x/wk), pain spike noted 4/15 encounter.          │ │
│ │ • Improvement correlation: ROM gains accelerated        │ │
│ │   following introduction of manual therapy (4/22).     │ │
│ │ ┌──────────────────┐                                    │ │
│ │ │ ☐ I have reviewed │ [Save to Chart]                  │ │
│ │ └──────────────────┘                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Saved Analyses                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ • Hip ROM Progression (auto-updating) - Created 4/10   │ │
│ │ • Pain vs Workload Comparison - Created 4/5            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Clinic-Level CMA Tab (Admin Only)

Location: Admin Dashboard > Clinic Analytics

```
┌─────────────────────────────────────────────────────────────┐
│ Clinic Analytics (Aggregated & De-identified)               │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Ask CMA: "Average ROM progression for ACL cases"  [Go] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ All data is aggregated. No patient names displayed.      │
│                                                             │
│ Filters: [Diagnosis ▼] [Date Range ▼] [Min Sample Size: 5] │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                [AGGREGATED GRAPH]                       │ │
│ │         Average ± SD across matching cases             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Current)
- [ ] Schema additions for clinical metrics & CMA tables
- [ ] Basic Convex queries/mutations for metrics CRUD
- [ ] Patient CMA tab UI shell
- [ ] Manual metric entry form

### Phase 2: AI Integration
- [ ] OpenAI action for prompt interpretation
- [ ] Metric extraction from encounter text
- [ ] Graph generation from interpreted queries
- [ ] Chart library integration (Recharts)

### Phase 3: Insights & Auto-Update
- [ ] AI insights generation
- [ ] Source traceability linking
- [ ] Auto-update logic for saved analytics
- [ ] Clinician review workflow

### Phase 4: Clinic-Level Analytics
- [ ] Aggregation queries with de-identification
- [ ] Admin-only access controls
- [ ] Cohort comparison capabilities

### Phase 5: AT Portal Replication
- [ ] Adapt schema for athletic training context
- [ ] Replicate UI components for AT dashboard
- [ ] Connect to athlete/injury data models

---

## Technology Stack

- **Charts**: Recharts (React-native, composable, good for time-series)
- **AI**: OpenAI GPT-4o (under BAA)
- **State**: Convex real-time subscriptions
- **UI**: Existing Tailwind + Radix patterns

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Clinician  │────▶│   Prompt     │────▶│   OpenAI     │
│   Input      │     │   (CMA Tab)  │     │   (BAA)      │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                     ┌───────────────────────────┘
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Interpreted │────▶│   Query      │────▶│   Metrics    │
│  Query JSON  │     │   Builder    │     │   Database   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                     ┌───────────────────────────┘
                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Graph      │◀────│   Data       │◀────│   Filtered   │
│   Render     │     │   Transform  │     │   Results    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
┌──────────────┐     ┌──────────────┐
│   AI         │────▶│   Insights   │
│   Analysis   │     │   + Sources  │
└──────────────┘     └──────────────┘
                            │
                            ▼
┌──────────────┐     ┌──────────────┐
│   Clinician  │◀────│   Review     │
│   Review     │     │   Required   │
└──────────────┘     └──────────────┘
```
