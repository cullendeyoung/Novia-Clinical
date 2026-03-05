/**
 * CMA Chart Component
 * Recharts-based visualization for clinical metrics
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
} from "recharts";
import { format } from "date-fns";

export interface GraphConfig {
  type: "line" | "bar" | "scatter" | "comparison" | "multi_axis";
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

interface CMAChartProps {
  config: GraphConfig;
  data: Array<Record<string, unknown>>;
  className?: string;
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
];

function formatTooltipValue(
  value: unknown,
  unit: string
): string {
  if (typeof value === "number") {
    return `${value.toFixed(1)} ${unit}`;
  }
  return String(value);
}

export function CMAChart({ config, data, className }: CMAChartProps) {
  const processedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      // Format date for display if needed
      formattedDate:
        config.xAxis.type === "date" && typeof item[config.xAxis.field] === "number"
          ? format(new Date(item[config.xAxis.field] as number), "MMM d")
          : item[config.xAxis.field],
    }));
  }, [data, config.xAxis]);

  const renderChart = () => {
    switch (config.type) {
      case "line":
        return (
          <LineChart data={processedData}>
            {config.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            )}
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: unknown, name: string | undefined) => {
                const yAxis = config.yAxes.find(
                  (y) => y.field === name || y.label === name
                );
                return [formatTooltipValue(value, yAxis?.unit || ""), yAxis?.label || name || ""];
              }}
            />
            {config.showLegend && (
              <Legend
                wrapperStyle={{ paddingTop: "16px" }}
                formatter={(value: string) => {
                  const yAxis = config.yAxes.find((y) => y.field === value);
                  return <span className="text-sm text-slate-600">{yAxis?.label || value}</span>;
                }}
              />
            )}
            {config.yAxes.map((yAxis, index) => (
              <Line
                key={yAxis.field}
                type="monotone"
                dataKey={yAxis.field}
                name={yAxis.label}
                stroke={yAxis.color || CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: yAxis.color || CHART_COLORS[index % CHART_COLORS.length] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case "bar":
        return (
          <BarChart data={processedData}>
            {config.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            )}
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: unknown, name: string | undefined) => {
                const yAxis = config.yAxes.find(
                  (y) => y.field === name || y.label === name
                );
                return [formatTooltipValue(value, yAxis?.unit || ""), yAxis?.label || name || ""];
              }}
            />
            {config.showLegend && <Legend wrapperStyle={{ paddingTop: "16px" }} />}
            {config.yAxes.map((yAxis, index) => (
              <Bar
                key={yAxis.field}
                dataKey={yAxis.field}
                name={yAxis.label}
                fill={yAxis.color || CHART_COLORS[index % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case "scatter":
        return (
          <ScatterChart>
            {config.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            )}
            <XAxis
              dataKey={config.xAxis.field}
              name={config.xAxis.label}
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              dataKey={config.yAxes[0]?.field}
              name={config.yAxes[0]?.label}
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              width={50}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Scatter
              data={processedData}
              fill={config.yAxes[0]?.color || CHART_COLORS[0]}
            />
          </ScatterChart>
        );

      case "comparison":
      case "multi_axis":
        return (
          <ComposedChart data={processedData}>
            {config.showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            )}
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              width={50}
            />
            {config.yAxes.length > 1 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                width={50}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: unknown, name: string | undefined) => {
                const yAxis = config.yAxes.find(
                  (y) => y.field === name || y.label === name
                );
                return [formatTooltipValue(value, yAxis?.unit || ""), yAxis?.label || name || ""];
              }}
            />
            {config.showLegend && <Legend wrapperStyle={{ paddingTop: "16px" }} />}
            {config.yAxes.map((yAxis, index) => {
              const yAxisId = index === 0 ? "left" : "right";
              const color = yAxis.color || CHART_COLORS[index % CHART_COLORS.length];

              if (index === 0) {
                return (
                  <Area
                    key={yAxis.field}
                    type="monotone"
                    dataKey={yAxis.field}
                    name={yAxis.label}
                    yAxisId={yAxisId}
                    fill={color}
                    fillOpacity={0.1}
                    stroke={color}
                    strokeWidth={2}
                  />
                );
              }
              return (
                <Line
                  key={yAxis.field}
                  type="monotone"
                  dataKey={yAxis.field}
                  name={yAxis.label}
                  yAxisId={yAxisId}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={index > 1 ? "5 5" : undefined}
                  dot={{ r: 3, fill: color }}
                />
              );
            })}
          </ComposedChart>
        );

      default:
        return (
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" />
          </LineChart>
        );
    }
  };

  return (
    <div className={className}>
      {/* Chart Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{config.title}</h3>
        {config.yAxes.length > 0 && (
          <p className="text-sm text-slate-500 mt-1">
            {config.yAxes.map((y) => y.label).join(" vs ")}
          </p>
        )}
      </div>

      {/* Chart Container */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default CMAChart;
