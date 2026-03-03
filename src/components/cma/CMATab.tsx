/**
 * CMA Tab Component - Patient Level
 * Main container for the Custom Metric Analyzer in patient charts
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CMAPromptInput } from "./CMAPromptInput";
import { CMAChart, GraphConfig } from "./CMAChart";
import { CMAInsights, Insight } from "./CMAInsights";
import { CMASavedAnalytics, SavedAnalytic } from "./CMASavedAnalytics";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Save,
  RotateCcw,
  Download,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CMATabProps {
  practiceUserId: Id<"practiceUsers">;
  patientId: Id<"practicePatients">;
  patientName: string;
}

interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  currentPrompt: string | null;
  graphConfig: GraphConfig | null;
  resultData: Array<Record<string, unknown>> | null;
  insights: Insight[] | null;
  clarificationNeeded: string | null;
}

export function CMATab({ practiceUserId, patientId, patientName }: CMATabProps) {
  // State
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isLoading: false,
    error: null,
    currentPrompt: null,
    graphConfig: null,
    resultData: null,
    insights: null,
    clarificationNeeded: null,
  });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [analyticsName, setAnalyticsName] = useState("");
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);

  // Convex queries
  const savedAnalytics = useQuery(api.cma.getPatientAnalytics, {
    practiceUserId,
    patientId,
    status: "active",
  });

  const metricTypes = useQuery(api.cma.getPatientMetricTypes, {
    practiceUserId,
    patientId,
  });

  // Convex mutations/actions
  const saveAnalytics = useMutation(api.cma.saveAnalytics);
  const archiveAnalytics = useMutation(api.cma.archiveAnalytics);
  const markReviewed = useMutation(api.cma.markAnalyticsReviewed);
  const interpretPrompt = useAction(api.cmaActions.interpretPrompt);
  const generateGraphData = useAction(api.cmaActions.generateGraphData);
  const generateInsights = useAction(api.cmaActions.generateInsights);

  // Handle prompt submission
  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      setAnalysisState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        currentPrompt: prompt,
        clarificationNeeded: null,
      }));

      try {
        // Step 1: Interpret the prompt
        const interpretResult = await interpretPrompt({
          practiceUserId,
          patientId,
          promptText: prompt,
          isClinicLevel: false,
        });

        if (!interpretResult.success) {
          throw new Error(interpretResult.error || "Failed to interpret prompt");
        }

        if (interpretResult.clarificationNeeded) {
          setAnalysisState((prev) => ({
            ...prev,
            isLoading: false,
            clarificationNeeded: interpretResult.clarificationNeeded,
          }));
          return;
        }

        if (!interpretResult.interpretedQuery) {
          throw new Error("No interpreted query returned");
        }

        // Step 2: Generate graph data
        const graphResult = await generateGraphData({
          practiceUserId,
          patientId,
          interpretedQuery: interpretResult.interpretedQuery,
        });

        if (!graphResult.success) {
          throw new Error(graphResult.error || "Failed to generate graph data");
        }

        const graphConfig = JSON.parse(graphResult.graphConfig!) as GraphConfig;
        const resultData = JSON.parse(graphResult.resultData!) as Array<
          Record<string, unknown>
        >;

        // Step 3: Generate insights
        const insightsResult = await generateInsights({
          practiceUserId,
          patientId,
          resultData: graphResult.resultData!,
          graphConfig: graphResult.graphConfig!,
        });

        let insights: Insight[] = [];
        if (insightsResult.success && insightsResult.insightsJson) {
          const parsed = JSON.parse(insightsResult.insightsJson);
          insights = parsed.insights || [];
        }

        setAnalysisState((prev) => ({
          ...prev,
          isLoading: false,
          graphConfig,
          resultData,
          insights,
        }));
      } catch (error) {
        setAnalysisState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Analysis failed",
        }));
      }
    },
    [practiceUserId, patientId, interpretPrompt, generateGraphData, generateInsights]
  );

  // Handle save to chart
  const handleSaveToChart = useCallback(async () => {
    if (!analysisState.currentPrompt || !analysisState.graphConfig) return;

    try {
      await saveAnalytics({
        practiceUserId,
        patientId,
        name: analyticsName || `Analysis - ${new Date().toLocaleDateString()}`,
        analysisType: "patient",
        originalPrompt: analysisState.currentPrompt,
        interpretedQuery: JSON.stringify({}), // Would store actual interpreted query
        dataDependencies: JSON.stringify({
          metricTypes: analysisState.graphConfig.yAxes.map((y) => y.field),
        }),
        graphType: analysisState.graphConfig.type,
        graphConfig: JSON.stringify(analysisState.graphConfig),
        resultData: JSON.stringify(analysisState.resultData),
        insightsJson: analysisState.insights
          ? JSON.stringify({ insights: analysisState.insights })
          : undefined,
      });

      setSaveDialogOpen(false);
      setAnalyticsName("");
    } catch (error) {
      console.error("Failed to save analytics:", error);
    }
  }, [
    analysisState,
    analyticsName,
    practiceUserId,
    patientId,
    saveAnalytics,
  ]);

  // Handle analytics selection
  const handleSelectAnalytics = useCallback(async (id: string) => {
    setSelectedAnalyticsId(id);
    // Would load the full analytics data here
  }, []);

  // Handle archive
  const handleArchiveAnalytics = useCallback(
    async (id: string) => {
      try {
        await archiveAnalytics({
          practiceUserId,
          analyticsId: id as Id<"cmaAnalytics">,
        });
      } catch (error) {
        console.error("Failed to archive:", error);
      }
    },
    [practiceUserId, archiveAnalytics]
  );

  // Handle review
  const handleReview = useCallback(async () => {
    // Would mark as reviewed if we have a saved analytics ID
  }, []);

  // Reset analysis
  const handleReset = useCallback(() => {
    setAnalysisState({
      isLoading: false,
      error: null,
      currentPrompt: null,
      graphConfig: null,
      resultData: null,
      insights: null,
      clarificationNeeded: null,
    });
  }, []);

  // Build suggestions based on available metrics
  const suggestions = metricTypes
    ? [
        ...metricTypes.slice(0, 3).map((t) => `Show ${t.metricType} trends over time`),
        "Compare pain scores with workload",
        "Graph strength progression",
      ]
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Custom Metric Analyzer</h2>
          <p className="text-sm text-slate-500 mt-1">
            AI-powered analytics for {patientName}'s clinical metrics
          </p>
        </div>
        {metricTypes && metricTypes.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{metricTypes.reduce((acc, t) => acc + t.count, 0)} metrics tracked</span>
            <span>•</span>
            <span>{metricTypes.length} metric types</span>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <CMAPromptInput
        onSubmit={handlePromptSubmit}
        isLoading={analysisState.isLoading}
        suggestions={suggestions}
      />

      {/* Error State */}
      {analysisState.error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Analysis Error</p>
            <p className="text-sm text-red-600">{analysisState.error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset
          </Button>
        </div>
      )}

      {/* Clarification Needed */}
      {analysisState.clarificationNeeded && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Clarification Needed</p>
            <p className="text-sm text-amber-600">{analysisState.clarificationNeeded}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {analysisState.isLoading && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-slate-200 bg-white">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Analyzing clinical data...</p>
          <p className="text-xs text-slate-400 mt-1">This may take a moment</p>
        </div>
      )}

      {/* Results */}
      {!analysisState.isLoading &&
        analysisState.graphConfig &&
        analysisState.resultData && (
          <div className="space-y-6">
            {/* Chart */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Based on: "{analysisState.currentPrompt}"</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    New Analysis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveDialogOpen(true)}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    Save
                  </Button>
                </div>
              </div>

              <CMAChart
                config={analysisState.graphConfig}
                data={analysisState.resultData}
              />
            </div>

            {/* Insights */}
            {analysisState.insights && analysisState.insights.length > 0 && (
              <CMAInsights
                insights={analysisState.insights}
                onReview={handleReview}
                isReviewed={false}
                onSaveToChart={() => setSaveDialogOpen(true)}
              />
            )}

            {/* Save Dialog */}
            {saveDialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Save Analysis to Chart
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Analysis Name
                      </label>
                      <Input
                        value={analyticsName}
                        onChange={(e) => setAnalyticsName(e.target.value)}
                        placeholder={`Analysis - ${new Date().toLocaleDateString()}`}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      This analysis will auto-update when new relevant data is added to the
                      patient's chart.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSaveDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveToChart}>Save Analysis</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* Saved Analytics */}
      {savedAnalytics && savedAnalytics.length > 0 && (
        <CMASavedAnalytics
          analytics={savedAnalytics as SavedAnalytic[]}
          onSelect={handleSelectAnalytics}
          onArchive={handleArchiveAnalytics}
          onRefresh={(id) => console.log("Refresh:", id)}
          selectedId={selectedAnalyticsId || undefined}
        />
      )}

      {/* Empty State */}
      {!analysisState.isLoading &&
        !analysisState.graphConfig &&
        (!savedAnalytics || savedAnalytics.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ask CMA to analyze patient data
            </h3>
            <p className="text-sm text-slate-500 text-center max-w-md mb-6">
              Use natural language to request clinical metric visualizations, trend analyses,
              and AI-generated insights based on documented patient data.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {["ROM trends", "Pain progression", "Strength comparison", "Functional outcomes"].map(
                (example) => (
                  <span
                    key={example}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-full text-slate-600"
                  >
                    {example}
                  </span>
                )
              )}
            </div>
          </div>
        )}
    </div>
  );
}

export default CMATab;
