import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bug } from "lucide-react";

import Card from "../../../components/ui/Card";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";

import { STATUS, PRIORITY, SEVERITY, TONE_DOT, TONE_ICON } from "../constants";

/* =============================================================
   Dashboard "Recent bugs" panel — cross-project feed. Mirrors
   the shape of RecentMeetingNotesPanel so the rows look at home
   next to it.
============================================================= */

const formatRelative = (value) => {
  if (!value) return "";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
};

const RecentBugsPanel = ({ bugs, loading, error, projects }) => {
  const projectMap = new Map((projects || []).map((p) => [p.id, p]));

  return (
    <Card
      padded={false}
      header={
        <>
          <div>
            <h2 className="text-section text-fg">Recent bugs</h2>
            <p className="text-caption text-fg-subtle mt-[2px]">
              Latest defects filed across all projects
            </p>
          </div>
          <span className="text-caption text-fg-subtle">
            {loading ? "" : `${bugs.length} ${bugs.length === 1 ? "bug" : "bugs"}`}
          </span>
        </>
      }
    >
      {error ? (
        <div className="px-lg py-lg">
          <div
            role="alert"
            className="p-md rounded-md bg-error-50 border border-error-200 text-error-800 text-bodySm"
          >
            <p className="font-medium mb-xs">Couldn't load recent bugs</p>
            <p className="text-bodySm">
              {error.code || error.message || "Unknown error"}
            </p>
            {(error.code === "permission-denied" ||
              /insufficient permissions/i.test(error.message || "")) && (
              <p className="mt-xs text-caption text-error-700">
                Add this Firestore rule:{" "}
                <code className="font-mono">
                  match /{"{path=**}"}/bugs/{"{bugId}"} {"{ allow read: if request.auth != null; }"}
                </code>
              </p>
            )}
            {/failed.*precondition|requires an index/i.test(
              error.message || ""
            ) && (
              <p className="mt-xs text-caption text-error-700">
                Firestore needs a collection-group index for this query — open
                the browser console; the error includes a direct link to create
                it.
              </p>
            )}
          </div>
        </div>
      ) : loading ? (
        <ul className="divide-y divide-line-subtle">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-start gap-md px-lg py-md">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 flex flex-col gap-xs">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      ) : bugs.length === 0 ? (
        <div className="px-lg py-lg">
          <EmptyState
            icon={Bug}
            title="No bugs filed yet"
            description="Once teammates start filing bugs against any project, the latest entries will appear here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {bugs.map((bug) => {
            const project = bug.projectId ? projectMap.get(bug.projectId) : null;
            const status = STATUS[bug.status] || STATUS.backlog;
            const priority = PRIORITY[bug.priority] || PRIORITY.medium;
            const StatusIcon = status.icon;
            const PriorityIcon = priority.icon;

            return (
              <li key={`${bug.projectId}-${bug.id}`}>
                <Link
                  to={bug.projectId ? `/projects/${bug.projectId}` : "#"}
                  className="group flex items-start gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
                >
                  <div className="h-8 w-8 rounded-md bg-error-50 text-error-700 flex items-center justify-center shrink-0">
                    <Bug className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-fg font-medium truncate">
                      {bug.title || "Untitled bug"}
                    </p>
                    <p className="text-caption text-fg-subtle truncate mt-[2px]">
                      {project ? (
                        <span className="text-fg-muted">{project.name}</span>
                      ) : (
                        <span>Project · unknown</span>
                      )}
                      {" · "}
                      {bug.reporterName || "Unknown"}
                      {" · "}
                      {formatRelative(bug.createdAt)}
                    </p>
                    <div className="mt-xs flex flex-wrap items-center gap-md">
                      <span className="inline-flex items-center gap-xs text-caption text-fg-subtle">
                        <StatusIcon className={`h-3 w-3 ${TONE_ICON[status.tone]}`} />
                        {status.label}
                      </span>
                      <span className="inline-flex items-center gap-xs text-caption text-fg-subtle">
                        <PriorityIcon className={`h-3 w-3 ${TONE_ICON[priority.tone]}`} />
                        {priority.label}
                      </span>
                      {bug.severity && (bug.severity === "high" || bug.severity === "critical") && (
                        <span className="inline-flex items-center gap-xs text-caption text-fg-subtle capitalize">
                          <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[SEVERITY[bug.severity]?.tone || "neutral"]}`} />
                          {bug.severity}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-fg group-hover:translate-x-[2px] transition-[color,transform] duration-fast self-center shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default RecentBugsPanel;
