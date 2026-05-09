import React, { useMemo } from "react";
import { Bug, ListChecks, Users } from "lucide-react";

import Card from "../ui/Card";
import Skeleton from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";

import useWorkload from "../../hooks/useWorkload";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* Workload as a list-with-bars rather than a recharts BarChart —
   gives us avatar + name + segmented bar + total in one tidy row.
   Bars are proportional to the heaviest assignee in the dataset, so
   the visual scale is always meaningful regardless of absolute size. */

const WorkloadRow = ({ row, max }) => {
  const taskPct = max ? (row.openTasks / max) * 100 : 0;
  const bugPct = max ? (row.openBugs / max) * 100 : 0;

  return (
    <li className="flex items-center gap-md py-sm">
      <span className="h-7 w-7 shrink-0 rounded-full bg-accent-soft text-accent
        flex items-center justify-center text-caption font-semibold overflow-hidden">
        {row.avatar ? (
          <img
            src={`/images/${row.avatar}`}
            alt={row.name}
            className="w-full h-full object-cover"
          />
        ) : (
          initials(row.name)
        )}
      </span>

      <span className="text-bodySm text-fg font-medium truncate w-[120px] shrink-0 capitalize">
        {row.name}
      </span>

      {/* Segmented bar — tasks on the left in accent, bugs on the
          right in error tone. Rendered inside a subtle track so the
          full width reads as the team's heaviest workload. */}
      <div className="flex-1 h-2 rounded-full bg-subtle overflow-hidden flex">
        {row.openTasks > 0 && (
          <span
            className="h-full bg-accent transition-[width] duration-base"
            style={{ width: `${taskPct}%` }}
            aria-label={`${row.openTasks} open tasks`}
          />
        )}
        {row.openBugs > 0 && (
          <span
            className="h-full bg-error-500 transition-[width] duration-base"
            style={{ width: `${bugPct}%` }}
            aria-label={`${row.openBugs} open bugs`}
          />
        )}
      </div>

      <span
        className="text-bodySm text-fg font-semibold tabular-nums w-[28px] text-right shrink-0"
        title={`${row.openTasks} tasks · ${row.openBugs} bugs`}
      >
        {row.total}
      </span>
    </li>
  );
};

const WorkloadChart = ({ limit = 8 }) => {
  const { data, loading } = useWorkload(limit);

  const max = useMemo(
    () => data.reduce((m, r) => Math.max(m, r.total), 0),
    [data]
  );

  return (
    <Card
      padded={false}
      header={
        <>
          <h2 className="text-section text-fg">Workload</h2>
          {!loading && data.length > 0 && (
            <span className="text-caption text-fg-subtle tabular-nums">
              Top {data.length}
            </span>
          )}
        </>
      }
    >
      <div className="px-lg py-md min-h-[260px]">
        {loading ? (
          <ul className="flex flex-col gap-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-md py-sm">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-6" />
              </li>
            ))}
          </ul>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center py-lg">
            <EmptyState icon={Users} title="Nothing on anyone's plate" />
          </div>
        ) : (
          <ul className="flex flex-col">
            {data.map((row) => (
              <WorkloadRow key={row.assigneeId} row={row} max={max} />
            ))}
          </ul>
        )}
      </div>

      {!loading && data.length > 0 && (
        <div className="px-lg py-sm flex items-center gap-lg border-t border-line-subtle">
          <span className="inline-flex items-center gap-xs text-caption text-fg-muted">
            <ListChecks className="h-3 w-3 text-accent" />
            Tasks
          </span>
          <span className="inline-flex items-center gap-xs text-caption text-fg-muted">
            <Bug className="h-3 w-3 text-error-700" />
            Bugs
          </span>
        </div>
      )}
    </Card>
  );
};

export default WorkloadChart;
