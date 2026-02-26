import { useState } from "react";
import { ChevronDown, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Injury location data structure
interface InjuryLocation {
  id: string;
  area: string;
  x: number;
  y: number;
  severity: "mild" | "moderate" | "severe";
  diagnosis: string;
  metrics?: ExerciseMetric[];
}

// Exercise metric structure
interface ExerciseMetric {
  exercise: string;
  value: number;
  unit: string;
  comparison?: {
    contralateral?: number;
    baseline?: number;
    goal?: number;
  };
  date: string;
}

// Body imbalance data
interface BodyImbalance {
  exercise: string;
  leftSide: number;
  rightSide: number;
  imbalancePercent: number;
  trend: "improving" | "declining" | "stable";
}

interface HumanBodyDiagramProps {
  injuries: InjuryLocation[];
  imbalanceData?: BodyImbalance[];
  onAreaClick?: (injury: InjuryLocation) => void;
  className?: string;
}

// Mock exercises for dropdown
const AVAILABLE_EXERCISES = [
  { id: "knee-extension", label: "Knee Extension", unit: "Nm" },
  { id: "knee-flexion", label: "Knee Flexion", unit: "Nm" },
  { id: "hip-abduction", label: "Hip Abduction", unit: "Nm" },
  { id: "hip-flexion", label: "Hip Flexion", unit: "Nm" },
  { id: "cmj", label: "Countermovement Jump (CMJ)", unit: "cm" },
  { id: "squat-1rm", label: "Squat 1RM", unit: "kg" },
  { id: "single-leg-hop", label: "Single Leg Hop", unit: "cm" },
];

export function HumanBodyDiagram({
  injuries,
  imbalanceData = [],
  onAreaClick,
  className,
}: HumanBodyDiagramProps) {
  const [selectedExercise, setSelectedExercise] = useState(AVAILABLE_EXERCISES[0]);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [hoveredInjury, setHoveredInjury] = useState<InjuryLocation | null>(null);
  const [selectedInjury, setSelectedInjury] = useState<InjuryLocation | null>(null);

  // Get imbalance for selected exercise
  const currentImbalance = imbalanceData.find((d) => d.exercise === selectedExercise.id);

  const handleInjuryClick = (injury: InjuryLocation) => {
    setSelectedInjury(injury);
    onAreaClick?.(injury);
  };

  // Get severity color
  const getSeverityColor = (severity: InjuryLocation["severity"]) => {
    switch (severity) {
      case "severe":
        return "fill-red-500 stroke-red-600";
      case "moderate":
        return "fill-amber-500 stroke-amber-600";
      case "mild":
        return "fill-yellow-400 stroke-yellow-500";
      default:
        return "fill-red-500 stroke-red-600";
    }
  };

  // Get metric for selected exercise from injury
  const getMetricForExercise = (injury: InjuryLocation) => {
    return injury.metrics?.find((m) => m.exercise === selectedExercise.id);
  };

  return (
    <div className={cn("flex gap-6", className)}>
      {/* Left: Body Diagram */}
      <div className="relative flex-shrink-0">
        {/* Exercise Selector */}
        <div className="mb-4 relative">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
            Exercise Metrics
          </label>
          <button
            onClick={() => setShowExerciseDropdown(!showExerciseDropdown)}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors text-left"
          >
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="flex-1 text-sm font-medium">{selectedExercise.label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                showExerciseDropdown && "rotate-180"
              )}
            />
          </button>

          {showExerciseDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowExerciseDropdown(false)}
              />
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                {AVAILABLE_EXERCISES.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      setSelectedExercise(exercise);
                      setShowExerciseDropdown(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between",
                      selectedExercise.id === exercise.id && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <span>{exercise.label}</span>
                    <span className="text-xs text-slate-400">{exercise.unit}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* SVG Body Diagram */}
        <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
          <svg viewBox="0 0 200 400" className="w-48 h-auto" style={{ minHeight: "320px" }}>
            {/* Human Body Silhouette */}
            <g fill="none" stroke="#94a3b8" strokeWidth="1.5">
              {/* Head */}
              <circle cx="100" cy="30" r="22" fill="#e2e8f0" />

              {/* Neck */}
              <line x1="100" y1="52" x2="100" y2="62" />

              {/* Torso */}
              <path
                d="M65 62 L65 160 L75 170 L75 180 L125 180 L125 170 L135 160 L135 62 Z"
                fill="#e2e8f0"
              />

              {/* Left Arm */}
              <path d="M65 65 L40 90 L35 140 L40 145 L45 140 L50 100 L65 85" fill="#e2e8f0" />

              {/* Right Arm */}
              <path d="M135 65 L160 90 L165 140 L160 145 L155 140 L150 100 L135 85" fill="#e2e8f0" />

              {/* Left Leg */}
              <path d="M75 180 L70 260 L65 340 L60 360 L75 365 L80 350 L85 260 L85 180" fill="#e2e8f0" />

              {/* Right Leg */}
              <path
                d="M125 180 L130 260 L135 340 L140 360 L125 365 L120 350 L115 260 L115 180"
                fill="#e2e8f0"
              />

              {/* Joint indicators (subtle) */}
              {/* Shoulders */}
              <circle cx="65" cy="72" r="5" fill="#cbd5e1" stroke="none" />
              <circle cx="135" cy="72" r="5" fill="#cbd5e1" stroke="none" />

              {/* Elbows */}
              <circle cx="42" cy="110" r="4" fill="#cbd5e1" stroke="none" />
              <circle cx="158" cy="110" r="4" fill="#cbd5e1" stroke="none" />

              {/* Hips */}
              <circle cx="80" cy="180" r="5" fill="#cbd5e1" stroke="none" />
              <circle cx="120" cy="180" r="5" fill="#cbd5e1" stroke="none" />

              {/* Knees */}
              <circle cx="77" cy="270" r="5" fill="#cbd5e1" stroke="none" />
              <circle cx="123" cy="270" r="5" fill="#cbd5e1" stroke="none" />

              {/* Ankles */}
              <circle cx="70" cy="350" r="4" fill="#cbd5e1" stroke="none" />
              <circle cx="130" cy="350" r="4" fill="#cbd5e1" stroke="none" />
            </g>

            {/* Injury Markers */}
            {injuries.map((injury) => {
              const metric = getMetricForExercise(injury);
              const isHovered = hoveredInjury?.id === injury.id;
              const isSelected = selectedInjury?.id === injury.id;

              return (
                <g key={injury.id}>
                  {/* Injury marker (red dot with pulse) */}
                  <circle
                    cx={injury.x}
                    cy={injury.y}
                    r={isHovered || isSelected ? 12 : 10}
                    className={cn(
                      getSeverityColor(injury.severity),
                      "cursor-pointer transition-all duration-200",
                      (isHovered || isSelected) && "drop-shadow-lg"
                    )}
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredInjury(injury)}
                    onMouseLeave={() => setHoveredInjury(null)}
                    onClick={() => handleInjuryClick(injury)}
                  />

                  {/* Pulse animation for severe injuries */}
                  {injury.severity === "severe" && (
                    <circle
                      cx={injury.x}
                      cy={injury.y}
                      r="10"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      opacity="0.5"
                      className="animate-ping"
                    />
                  )}

                  {/* Data line and callout */}
                  {metric && (
                    <>
                      {/* Line from injury to callout */}
                      <line
                        x1={injury.x}
                        y1={injury.y}
                        x2={injury.x > 100 ? 180 : 20}
                        y2={injury.y - 10}
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        opacity="0.7"
                      />

                      {/* Callout box */}
                      <g transform={`translate(${injury.x > 100 ? 175 : -15}, ${injury.y - 30})`}>
                        <rect
                          x={injury.x > 100 ? 0 : -55}
                          y="-15"
                          width="55"
                          height="30"
                          rx="4"
                          fill="white"
                          stroke="#3b82f6"
                          strokeWidth="1"
                          className="drop-shadow-sm"
                        />
                        <text
                          x={injury.x > 100 ? 27.5 : -27.5}
                          y="-2"
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-slate-900"
                        >
                          {metric.value}
                        </text>
                        <text
                          x={injury.x > 100 ? 27.5 : -27.5}
                          y="10"
                          textAnchor="middle"
                          className="text-[8px] fill-slate-500"
                        >
                          {metric.unit}
                        </text>
                      </g>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredInjury && (
            <div
              className="absolute z-30 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg pointer-events-none"
              style={{
                left: hoveredInjury.x > 100 ? "auto" : 16,
                right: hoveredInjury.x > 100 ? 16 : "auto",
                top: (hoveredInjury.y / 400) * 320 + 60,
              }}
            >
              <p className="font-medium">{hoveredInjury.area}</p>
              <p className="text-slate-300">{hoveredInjury.diagnosis}</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600">Severe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-600">Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-slate-600">Mild</span>
          </div>
        </div>
      </div>

      {/* Right: Data Panel */}
      <div className="flex-1 space-y-4">
        {/* Body Imbalance Card */}
        {currentImbalance && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 text-sm">Body Imbalance</h4>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  currentImbalance.imbalancePercent <= 10
                    ? "bg-emerald-100 text-emerald-700"
                    : currentImbalance.imbalancePercent <= 20
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                )}
              >
                {currentImbalance.trend === "improving" && <TrendingUp className="h-3 w-3" />}
                {currentImbalance.trend === "declining" && <TrendingDown className="h-3 w-3" />}
                {currentImbalance.trend === "stable" && <Minus className="h-3 w-3" />}
                {currentImbalance.imbalancePercent}% difference
              </span>
            </div>

            {/* Visual imbalance comparison */}
            <div className="flex items-center gap-4">
              {/* Left Side */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Left</span>
                  <span className="text-sm font-bold text-slate-900">
                    {currentImbalance.leftSide} {selectedExercise.unit}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${(currentImbalance.leftSide / Math.max(currentImbalance.leftSide, currentImbalance.rightSide)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* vs */}
              <span className="text-xs text-slate-400 font-medium">vs</span>

              {/* Right Side */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Right</span>
                  <span className="text-sm font-bold text-slate-900">
                    {currentImbalance.rightSide} {selectedExercise.unit}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{
                      width: `${(currentImbalance.rightSide / Math.max(currentImbalance.leftSide, currentImbalance.rightSide)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Imbalance threshold indicator */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Acceptable threshold: &lt;10%</span>
                <span
                  className={cn(
                    "font-medium",
                    currentImbalance.imbalancePercent <= 10 ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {currentImbalance.imbalancePercent <= 10 ? "Within range" : "Needs attention"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Injury Detail */}
        {selectedInjury && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "w-3 h-3 rounded-full",
                  selectedInjury.severity === "severe"
                    ? "bg-red-500"
                    : selectedInjury.severity === "moderate"
                      ? "bg-amber-500"
                      : "bg-yellow-400"
                )}
              />
              <h4 className="font-semibold text-slate-900 text-sm">{selectedInjury.area}</h4>
            </div>
            <p className="text-sm text-slate-600 mb-3">{selectedInjury.diagnosis}</p>

            {/* Metrics for this injury */}
            {selectedInjury.metrics && selectedInjury.metrics.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Latest Measurements
                </p>
                {selectedInjury.metrics.map((metric, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 bg-white rounded-lg"
                  >
                    <span className="text-sm text-slate-700">{metric.exercise}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {metric.value} {metric.unit}
                      </span>
                      {metric.comparison?.baseline && (
                        <span
                          className={cn(
                            "text-xs",
                            metric.value >= metric.comparison.baseline
                              ? "text-emerald-600"
                              : "text-red-600"
                          )}
                        >
                          {metric.value >= metric.comparison.baseline ? "+" : ""}
                          {Math.round(
                            ((metric.value - metric.comparison.baseline) /
                              metric.comparison.baseline) *
                              100
                          )}
                          %
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No injury selected state */}
        {!selectedInjury && injuries.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">Click on an injury marker to view details</p>
          </div>
        )}

        {/* No injuries state */}
        {injuries.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No injuries documented</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Analytics and Trends Component
interface TrendDataPoint {
  date: string;
  value: number;
}

interface PatientAnalyticsProps {
  painTrend: TrendDataPoint[];
  romTrend: TrendDataPoint[];
  strengthTrend: TrendDataPoint[];
  functionalScore: number;
  visitCount: number;
  progressPercentage: number;
}

export function PatientAnalytics({
  painTrend,
  romTrend,
  strengthTrend,
  functionalScore,
  visitCount,
  progressPercentage,
}: PatientAnalyticsProps) {
  // Get trend direction
  const getPainTrend = () => {
    if (painTrend.length < 2) return "stable";
    const recent = painTrend[painTrend.length - 1].value;
    const previous = painTrend[painTrend.length - 2].value;
    if (recent < previous) return "improving";
    if (recent > previous) return "worsening";
    return "stable";
  };

  const getStrengthTrend = () => {
    if (strengthTrend.length < 2) return "stable";
    const recent = strengthTrend[strengthTrend.length - 1].value;
    const previous = strengthTrend[strengthTrend.length - 2].value;
    if (recent > previous) return "improving";
    if (recent < previous) return "declining";
    return "stable";
  };

  const painStatus = getPainTrend();
  const strengthStatus = getStrengthTrend();

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{visitCount}</p>
          <p className="text-xs text-slate-500 mt-1">Total Visits</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{progressPercentage}%</p>
          <p className="text-xs text-slate-500 mt-1">Goal Progress</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{functionalScore}</p>
          <p className="text-xs text-slate-500 mt-1">Functional Score</p>
        </div>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pain Trend */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900 text-sm">Pain Level</h4>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                painStatus === "improving"
                  ? "bg-emerald-100 text-emerald-700"
                  : painStatus === "worsening"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
              )}
            >
              {painStatus === "improving" && <TrendingDown className="h-3 w-3" />}
              {painStatus === "worsening" && <TrendingUp className="h-3 w-3" />}
              {painStatus === "stable" && <Minus className="h-3 w-3" />}
              {painStatus}
            </span>
          </div>

          {/* Mini sparkline chart */}
          <div className="flex items-end gap-1 h-12">
            {painTrend.map((point, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-200 rounded-t"
                style={{ height: `${(point.value / 10) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{painTrend[0]?.date}</span>
            <span>{painTrend[painTrend.length - 1]?.date}</span>
          </div>
        </div>

        {/* Strength Trend */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900 text-sm">Strength</h4>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                strengthStatus === "improving"
                  ? "bg-emerald-100 text-emerald-700"
                  : strengthStatus === "declining"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
              )}
            >
              {strengthStatus === "improving" && <TrendingUp className="h-3 w-3" />}
              {strengthStatus === "declining" && <TrendingDown className="h-3 w-3" />}
              {strengthStatus === "stable" && <Minus className="h-3 w-3" />}
              {strengthStatus}
            </span>
          </div>

          {/* Mini sparkline chart */}
          <div className="flex items-end gap-1 h-12">
            {strengthTrend.map((point, i) => {
              const maxVal = Math.max(...strengthTrend.map((p) => p.value));
              return (
                <div
                  key={i}
                  className="flex-1 bg-emerald-200 rounded-t"
                  style={{ height: `${(point.value / maxVal) * 100}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{strengthTrend[0]?.date}</span>
            <span>{strengthTrend[strengthTrend.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* ROM Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="font-medium text-slate-900 text-sm mb-3">Range of Motion Progress</h4>
        <div className="space-y-3">
          {romTrend.map((point, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16">{point.date}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${point.value}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-700 w-12 text-right">
                {point.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HumanBodyDiagram;
