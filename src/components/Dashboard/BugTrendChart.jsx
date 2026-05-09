import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

import Card from "../ui/Card";
import Skeleton from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import { Bug } from "lucide-react";

import useBugTrend from "../../hooks/useBugTrend";

/* Bug intake vs resolution trend, last N days. Two soft-area lines:
   intake in error-tinted red, resolved in success-tinted green. The
   gap between them is the metric — when red is above green, the
   backlog is growing. */

const formatTickDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTooltipDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const intake = payload.find((p) => p.dataKey === "intake")?.value ?? 0;
  const resolved = payload.find((p) => p.dataKey === "resolved")?.value ?? 0;
  return (
    <div className="bg-elevated border border-line rounded-md shadow-lg px-md py-sm text-bodySm">
      <p className="text-caption text-fg-subtle mb-xs">
        {formatTooltipDate(label)}
      </p>
      <div className="flex flex-col gap-[2px]">
        <span className="inline-flex items-center gap-xs text-fg">
          <span className="h-2 w-2 rounded-full bg-error-500" />
          <span className="tabular-nums">{intake}</span>
          <span className="text-fg-muted">filed</span>
        </span>
        <span className="inline-flex items-center gap-xs text-fg">
          <span className="h-2 w-2 rounded-full bg-success-500" />
          <span className="tabular-nums">{resolved}</span>
          <span className="text-fg-muted">resolved</span>
        </span>
      </div>
    </div>
  );
};

const BugTrendChart = ({ days = 30 }) => {
  const { data, loading } = useBugTrend(days);

  const summary = useMemo(() => {
    const intake = data.reduce((sum, d) => sum + (d.intake || 0), 0);
    const resolved = data.reduce((sum, d) => sum + (d.resolved || 0), 0);
    const net = intake - resolved;
    return { intake, resolved, net };
  }, [data]);

  return (
    <Card
      padded={false}
      header={
        <>
          <div>
            <h2 className="text-section text-fg">Bug trend</h2>
            <p className="text-caption text-fg-subtle mt-[2px] tabular-nums">
              Last {days} days · {summary.intake} filed · {summary.resolved} resolved
            </p>
          </div>
          {!loading && data.length > 0 && (
            <span
              className={`inline-flex items-center gap-xs h-controlSm px-md rounded-md text-caption font-medium tabular-nums
                ${
                  summary.net > 0
                    ? "bg-error-50 text-error-700"
                    : summary.net < 0
                    ? "bg-success-50 text-success-700"
                    : "bg-subtle text-fg-muted"
                }`}
              title="Net change in open bugs"
            >
              {summary.net > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {summary.net > 0 ? `+${summary.net}` : summary.net}
            </span>
          )}
        </>
      }
    >
      <div className="px-md pb-md pt-sm h-[260px]">
        {loading ? (
          <div className="h-full flex flex-col gap-sm justify-end">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : data.every((d) => !d.intake && !d.resolved) ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={Bug}
              title="No bug activity in this window"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
            >
              <defs>
                <linearGradient id="intakeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="resolvedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(var(--color-border-subtle))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatTickDate}
                tick={{ fill: "rgb(var(--color-fg-subtle))", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgb(var(--color-border-subtle))" }}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "rgb(var(--color-fg-subtle))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ stroke: "rgb(var(--color-border))", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="intake"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#intakeFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#EF4444" }}
                isAnimationActive
                animationDuration={400}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#resolvedFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#22C55E" }}
                isAnimationActive
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend strip below the chart — small and unobtrusive, lives
          inside the card so the chart area stays clean. */}
      {!loading && data.some((d) => d.intake || d.resolved) && (
        <div className="px-lg py-sm flex items-center gap-lg border-t border-line-subtle">
          <span className="inline-flex items-center gap-xs text-caption text-fg-muted">
            <span className="h-2 w-3 rounded-sm bg-error-500" />
            Filed
          </span>
          <span className="inline-flex items-center gap-xs text-caption text-fg-muted">
            <span className="h-2 w-3 rounded-sm bg-success-500" />
            Resolved
          </span>
        </div>
      )}
    </Card>
  );
};

export default BugTrendChart;
