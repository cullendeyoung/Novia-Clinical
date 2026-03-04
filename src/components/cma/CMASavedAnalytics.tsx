/**
 * CMA Saved Analytics List
 * Shows saved analytics objects that auto-update
 */

import { useState } from "react";
import {
  BarChart3,
  RefreshCw,
  Archive,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface SavedAnalytic {
  _id: string;
  name: string;
  originalPrompt: string;
  graphType: string;
  status: "draft" | "active" | "archived" | "error";
  reviewedByClinician: boolean;
  createdAt: number;
  updatedAt: number;
}

interface CMASavedAnalyticsProps {
  analytics: SavedAnalytic[];
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  onRefresh: (id: string) => void;
  selectedId?: string;
  className?: string;
}

const STATUS_CONFIG = {
  active: {
    label: "Active",
    icon: RefreshCw,
    color: "text-emerald-600 bg-emerald-50",
  },
  draft: {
    label: "Draft",
    icon: Clock,
    color: "text-slate-600 bg-slate-100",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    color: "text-slate-400 bg-slate-50",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    color: "text-red-600 bg-red-50",
  },
};

const GRAPH_TYPE_LABELS: Record<string, string> = {
  line: "Line Chart",
  bar: "Bar Chart",
  scatter: "Scatter Plot",
  comparison: "Comparison",
  multi_axis: "Multi-Axis",
};

export function CMASavedAnalytics({
  analytics,
  onSelect,
  onArchive,
  onRefresh,
  selectedId,
  className,
}: CMASavedAnalyticsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (analytics.length === 0) {
    return (
      <div className={cn("rounded-xl border border-slate-200 bg-white p-6", className)}>
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 mb-3">
            <BarChart3 className="h-6 w-6 text-slate-400" />
          </div>
          <h4 className="font-medium text-slate-900 mb-1">No Saved Analyses</h4>
          <p className="text-sm text-slate-500 max-w-xs">
            Run a CMA analysis and save it to see it here. Saved analyses auto-update with new data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Saved Analyses</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {analytics.length}
          </span>
        </div>
      </div>

      {/* Analytics List */}
      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {analytics.map((analytic) => {
          const statusConfig = STATUS_CONFIG[analytic.status];
          const StatusIcon = statusConfig.icon;
          const isSelected = selectedId === analytic._id;
          const isHovered = hoveredId === analytic._id;

          return (
            <div
              key={analytic._id}
              className={cn(
                "relative p-4 transition-colors cursor-pointer",
                isSelected ? "bg-blue-50" : "hover:bg-slate-50"
              )}
              onClick={() => onSelect(analytic._id)}
              onMouseEnter={() => setHoveredId(analytic._id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  {/* Name & Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900 truncate">{analytic.name}</h4>
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                        statusConfig.color
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </span>
                    {analytic.reviewedByClinician && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {/* Original Prompt */}
                  <p className="text-sm text-slate-500 truncate mb-2">{analytic.originalPrompt}</p>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{GRAPH_TYPE_LABELS[analytic.graphType] || analytic.graphType}</span>
                    <span>•</span>
                    <span>
                      Updated {formatDistanceToNow(analytic.updatedAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className={cn(
                    "flex items-center gap-1 transition-opacity",
                    isHovered ? "opacity-100" : "opacity-0"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {analytic.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onRefresh(analytic._id)}
                      title="Refresh data"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onArchive(analytic._id)}
                    title={analytic.status === "archived" ? "Restore" : "Archive"}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Selection Indicator */}
                <ChevronRight
                  className={cn(
                    "h-5 w-5 text-slate-300 transition-transform flex-shrink-0",
                    isSelected && "text-blue-500 transform translate-x-0.5"
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CMASavedAnalytics;
