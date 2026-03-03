/**
 * CMA Insights Component
 * AI-generated insights with clinician review requirement
 */

import { useState } from "react";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Link2,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Insight {
  type: "plateau" | "improvement" | "correlation" | "change" | "warning";
  text: string;
  confidence: number;
  dateRange?: { start: string; end: string };
  sources?: Array<{
    type: string;
    id: string;
    date: string;
    excerpt?: string;
  }>;
}

interface CMAInsightsProps {
  insights: Insight[];
  onReview: () => void;
  isReviewed: boolean;
  onSaveToChart: () => void;
  className?: string;
}

const INSIGHT_ICONS = {
  plateau: Minus,
  improvement: TrendingUp,
  correlation: Link2,
  change: TrendingDown,
  warning: AlertTriangle,
};

const INSIGHT_COLORS = {
  plateau: "text-amber-600 bg-amber-50 border-amber-200",
  improvement: "text-emerald-600 bg-emerald-50 border-emerald-200",
  correlation: "text-blue-600 bg-blue-50 border-blue-200",
  change: "text-purple-600 bg-purple-50 border-purple-200",
  warning: "text-red-600 bg-red-50 border-red-200",
};

export function CMAInsights({
  insights,
  onReview,
  isReviewed,
  onSaveToChart,
  className,
}: CMAInsightsProps) {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const [hasReviewed, setHasReviewed] = useState(isReviewed);

  const handleReviewToggle = () => {
    setHasReviewed(!hasReviewed);
    if (!hasReviewed) {
      onReview();
    }
  };

  const toggleInsightExpand = (index: number) => {
    setExpandedInsight(expandedInsight === index ? null : index);
  };

  if (insights.length === 0) {
    return (
      <div className={cn("rounded-xl border border-slate-200 bg-white p-6", className)}>
        <div className="flex items-center gap-3 text-slate-400">
          <Lightbulb className="h-5 w-5" />
          <p className="text-sm">No insights generated yet. Run an analysis to see AI-generated insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">AI Insights</h3>
            <p className="text-xs text-slate-500">Requires clinician review before finalizing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasReviewed ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Reviewed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Clock className="h-3.5 w-3.5" />
              Pending Review
            </span>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-3 bg-amber-50/50 border-b border-amber-100">
        <p className="text-xs text-amber-700">
          <strong>Important:</strong> These insights are AI-generated hypotheses based on documented data.
          They do not constitute medical advice or autonomous diagnoses.
          Clinician review and professional judgment are required.
        </p>
      </div>

      {/* Insights List */}
      <div className="divide-y divide-slate-100">
        {insights.map((insight, index) => {
          const Icon = INSIGHT_ICONS[insight.type] || Lightbulb;
          const colorClasses = INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.correlation;
          const isExpanded = expandedInsight === index;

          return (
            <div key={index} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("flex-shrink-0 p-2 rounded-lg border", colorClasses)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-relaxed">{insight.text}</p>

                  {/* Confidence & Date Range */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                    {insight.dateRange && (
                      <>
                        <span>•</span>
                        <span>
                          {insight.dateRange.start} - {insight.dateRange.end}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Sources (expandable) */}
                  {insight.sources && insight.sources.length > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => toggleInsightExpand(index)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Link2 className="h-3 w-3" />
                        {insight.sources.length} source{insight.sources.length !== 1 ? "s" : ""}
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 pl-4 border-l-2 border-slate-100 space-y-2">
                          {insight.sources.map((source, sourceIndex) => (
                            <div
                              key={sourceIndex}
                              className="text-xs text-slate-500 p-2 rounded bg-slate-50"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium capitalize">{source.type}</span>
                                <span>•</span>
                                <span>{source.date}</span>
                              </div>
                              {source.excerpt && (
                                <p className="text-slate-600 italic">"{source.excerpt}"</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review & Save Actions */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasReviewed}
            onChange={handleReviewToggle}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-600">
            I have reviewed these insights and approve them for documentation
          </span>
        </label>

        <Button
          onClick={onSaveToChart}
          disabled={!hasReviewed}
          size="sm"
        >
          Save to Chart
        </Button>
      </div>
    </div>
  );
}

export default CMAInsights;
