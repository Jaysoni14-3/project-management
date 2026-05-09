import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bug,
  ArrowRight,
  Calendar,
  Paperclip,
  Search,
  Rows3,
  LayoutGrid,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/Dashboard/StatCard";

import useAllBugs from "../hooks/useAllBugs";
import { projectPath } from "../lib/slug";
import { useProjects } from "../hooks/useProjects";
import useEmployees from "../hooks/useEmployee";
import { useAuth } from "../context/AuthContext";

import {
  STATUS,
  STATUS_ORDER,
  PRIORITY,
  PRIORITY_ORDER,
  SEVERITY,
  TONE_DOT,
  TONE_ICON,
} from "../features/bugs/constants";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

const formatDue = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    label: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    }),
    overdue: d.getTime() < Date.now() - 24 * 60 * 60 * 1000,
  };
};

const computeBugStats = (bugs) => {
  const overdueThreshold = Date.now() - 24 * 60 * 60 * 1000;
  let open = 0;
  let urgent = 0;
  let critical = 0;
  let overdue = 0;
  bugs.forEach((b) => {
    const s = b.status || "backlog";
    if (s === "done") return;
    open += 1;
    if (b.priority === "urgent") urgent += 1;
    if (b.severity === "critical") critical += 1;
    if (b.dueDate) {
      const d = new Date(b.dueDate);
      if (!Number.isNaN(d.getTime()) && d.getTime() < overdueThreshold) {
        overdue += 1;
      }
    }
  });
  return { open, urgent, critical, overdue, total: bugs.length };
};

/* ============================================================
   Filter pill — single-row keyword/select control set
============================================================ */
const SelectPill = ({ label, value, onChange, options }) => (
  <label className="inline-flex items-center gap-xs">
    <span className="text-caption text-fg-subtle">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-controlSm rounded-sm border border-line bg-surface
        text-bodySm text-fg px-sm
        focus:border-accent focus:shadow-focus-ring
        transition"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

/* ============================================================
   Kanban view — workspace-wide, read-only. Click a card to
   open its project (where the per-project board handles drag
   + edit). Drag-drop intentionally omitted here: cross-project
   triage from a workspace view is rare, and the project board
   already covers it.
============================================================ */
const KanbanCard = ({ bug, project, assignee }) => {
  const priority = PRIORITY[bug.priority] || PRIORITY.medium;
  const severity = SEVERITY[bug.severity] || SEVERITY.medium;
  const PriorityIcon = priority.icon;
  const due = formatDue(bug.dueDate);
  const attachmentCount = bug.attachments?.length ?? 0;

  return (
    <li>
      <Link
        to={project ? projectPath(project) : "#"}
        className="group flex flex-col gap-sm bg-surface border border-line rounded-md
          px-sm py-sm transition-[border-color,box-shadow] duration-fast
          hover:border-line-strong hover:shadow-sm
          focus-visible:outline-none focus-visible:shadow-focus-ring"
        aria-label={`Bug: ${bug.title}`}
      >
        {/* Project pill */}
        {project && (
          <span className="self-start max-w-full text-caption text-fg-muted bg-subtle
            px-sm py-[1px] rounded-xs truncate">
            {project.name}
          </span>
        )}

        {/* Title */}
        <div className="flex items-start gap-xs">
          <PriorityIcon
            className={`h-3.5 w-3.5 mt-[2px] shrink-0 ${TONE_ICON[priority.tone]}`}
            aria-label={`${priority.label} priority`}
          />
          <h3 className="text-bodySm text-fg leading-snug line-clamp-2 flex-1">
            {bug.title || "Untitled bug"}
          </h3>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-sm text-caption text-fg-subtle">
          <span className="inline-flex items-center gap-xs" title={`${severity.label} severity`}>
            <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[severity.tone]}`} />
            <span className="capitalize">{severity.label}</span>
          </span>

          {due && (
            <>
              <span className="opacity-50">·</span>
              <span
                className={`inline-flex items-center gap-xs ${
                  due.overdue ? "text-error-700" : ""
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span className="tabular-nums">{due.label}</span>
              </span>
            </>
          )}

          {attachmentCount > 0 && (
            <>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-xs">
                <Paperclip className="h-3 w-3" />
                <span className="tabular-nums">{attachmentCount}</span>
              </span>
            </>
          )}

          <span className="ml-auto shrink-0" title={assignee?.name ?? "Unassigned"}>
            {assignee ? (
              assignee.avatar ? (
                <img
                  src={`/images/${assignee.avatar}`}
                  alt={assignee.name}
                  className="h-5 w-5 rounded-full object-cover border border-line"
                />
              ) : (
                <span className="h-5 w-5 rounded-full bg-accent-soft text-accent
                  text-[10px] font-semibold inline-flex items-center justify-center">
                  {initials(assignee.name)}
                </span>
              )
            ) : (
              <span className="h-5 w-5 rounded-full bg-subtle text-fg-subtle
                inline-flex items-center justify-center border border-dashed border-line text-[10px]">
                —
              </span>
            )}
          </span>
        </div>
      </Link>
    </li>
  );
};

const KanbanView = ({ bugs, projectMap, employeeMap }) => {
  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = [];
    return acc;
  }, {});
  bugs.forEach((b) => {
    const s = b.status && grouped[b.status] ? b.status : "backlog";
    grouped[s].push(b);
  });

  return (
    <div
      className="flex gap-md overflow-x-auto px-lg py-md [scrollbar-gutter:stable]"
      role="list"
      aria-label="Bug board"
    >
      {STATUS_ORDER.map((status) => {
        const cfg = STATUS[status];
        const Icon = cfg.icon;
        const colBugs = grouped[status];
        return (
          <section
            key={status}
            aria-label={`${cfg.label} column`}
            className="shrink-0 w-[300px] flex flex-col rounded-lg
              border border-line-subtle bg-canvas/40"
          >
            <header className="flex items-center justify-between gap-sm px-md pt-md pb-sm">
              <div className="flex items-center gap-xs min-w-0">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${TONE_ICON[cfg.tone]}`} />
                <h3 className="text-eyebrow uppercase text-fg-muted tracking-wider truncate">
                  {cfg.label}
                </h3>
                <span className="ml-xs inline-flex items-center justify-center min-w-[20px] h-5
                  px-xs rounded-xs bg-subtle text-caption text-fg-muted font-medium tabular-nums">
                  {colBugs.length}
                </span>
              </div>
            </header>

            <ul className="flex flex-col gap-xs px-sm pb-sm min-h-[80px]">
              {colBugs.length === 0 ? (
                <li className="flex items-center justify-center text-caption text-fg-subtle
                  rounded-md border border-dashed border-line-subtle py-lg">
                  Empty
                </li>
              ) : (
                colBugs.map((bug) => (
                  <KanbanCard
                    key={`${bug.projectId}-${bug.id}`}
                    bug={bug}
                    project={bug.projectId ? projectMap.get(bug.projectId) : null}
                    assignee={bug.assigneeId ? employeeMap.get(bug.assigneeId) : null}
                  />
                ))
              )}
            </ul>
            <div className="flex-1 min-h-md" />
          </section>
        );
      })}
    </div>
  );
};

/* ============================================================
   Page
============================================================ */
const Bugs = () => {
  const { bugs, loading, error } = useAllBugs();
  const { projects } = useProjects();
  const { employees } = useEmployees();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.uid || null;

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  /* Default to "mine" so a logged-in user lands on their own work
     first — bugs they own (assignee) OR filed (reporter). They can
     widen the filter to "Anyone" or pick a specific teammate. */
  const [assigneeFilter, setAssigneeFilter] = useState("mine");
  const [viewMode, setViewMode] = useState("table"); // "table" | "kanban"

  const projectMap = useMemo(
    () => new Map((projects || []).map((p) => [p.id, p])),
    [projects]
  );
  const employeeMap = useMemo(
    () => new Map((employees || []).map((e) => [e.id, e])),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bugs.filter((b) => {
      if (projectFilter !== "all" && b.projectId !== projectFilter) return false;
      if (statusFilter !== "all" && (b.status || "backlog") !== statusFilter)
        return false;
      if (priorityFilter !== "all" && (b.priority || "medium") !== priorityFilter)
        return false;
      if (assigneeFilter !== "all") {
        /* "mine"        — bugs the current user owns OR filed.
           "unassigned"  — bugs with no assignee at all.
           any other id  — strict assignee match. */
        if (assigneeFilter === "mine") {
          /* Until the auth user resolves, fall through to "show all" so
             the page doesn't render empty during the auth bootstrap. */
          if (currentUserId) {
            if (b.assigneeId !== currentUserId && b.reporterId !== currentUserId) {
              return false;
            }
          }
        } else if (assigneeFilter === "unassigned") {
          if (b.assigneeId) return false;
        } else if (b.assigneeId !== assigneeFilter) {
          return false;
        }
      }
      if (q) {
        const hay = `${b.title || ""} ${b.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bugs, search, projectFilter, statusFilter, priorityFilter, assigneeFilter, currentUserId]);

  /* Stats — computed from the *full* dataset, not the filter view,
     so the cards stay a workspace-wide snapshot. */
  const stats = computeBugStats(bugs);

  const projectOptions = useMemo(
    () => [
      { value: "all", label: "All projects" },
      ...(projects || []).map((p) => ({ value: p.id, label: p.name || "Untitled" })),
    ],
    [projects]
  );

  const statusOptions = [
    { value: "all", label: "Any" },
    ...STATUS_ORDER.map((k) => ({ value: k, label: STATUS[k].label })),
  ];

  const priorityOptions = [
    { value: "all", label: "Any" },
    ...PRIORITY_ORDER.map((k) => ({ value: k, label: PRIORITY[k].label })),
  ];

  /* Build the assignee dropdown from the live employee list. The
     current user is represented by the special "mine" entry at the top
     (covers assignee OR reporter), so we exclude their id from the
     per-employee list to avoid two paths to the same person. */
  const assigneeOptions = useMemo(() => {
    const currentName =
      employees?.find((e) => e.id === currentUserId)?.name || authUser?.name;
    const meLabel = currentName ? `${currentName} (you)` : "Me";
    return [
      { value: "all", label: "Anyone" },
      { value: "mine", label: meLabel },
      { value: "unassigned", label: "Unassigned" },
      ...(employees || [])
        .filter((e) => e.id !== currentUserId)
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((e) => ({ value: e.id, label: e.name || e.email || "(no name)" })),
    ];
  }, [employees, currentUserId, authUser?.name]);

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader title="Bugs" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard
          label="Open bugs"
          value={stats.open}
          icon={Bug}
          variant="danger"
          loading={loading}
        />
        <StatCard
          label="Urgent priority"
          value={stats.urgent}
          icon={Bug}
          variant="warning"
          loading={loading}
        />
        <StatCard
          label="Critical severity"
          value={stats.critical}
          icon={Bug}
          variant="warning"
          loading={loading}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon={Calendar}
          variant="default"
          loading={loading}
        />
      </div>

      <Card
        padded={false}
        header={
          <>
            <div>
              <h2 className="text-section text-fg">All bugs</h2>
              <p className="text-caption text-fg-subtle mt-[2px]">
                {loading
                  ? "Loading…"
                  : `${filtered.length} of ${stats.total} ${stats.total === 1 ? "bug" : "bugs"}`}
              </p>
            </div>
            <div
              role="tablist"
              aria-label="View mode"
              className="inline-flex rounded-md border border-line bg-surface p-[2px]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "table"}
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-xs h-controlSm px-sm rounded-sm text-bodySm transition-colors duration-fast
                  ${viewMode === "table"
                    ? "bg-accent-soft text-accent"
                    : "text-fg-muted hover:text-fg hover:bg-subtle"}`}
              >
                <Rows3 className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "kanban"}
                onClick={() => setViewMode("kanban")}
                className={`inline-flex items-center gap-xs h-controlSm px-sm rounded-sm text-bodySm transition-colors duration-fast
                  ${viewMode === "kanban"
                    ? "bg-accent-soft text-accent"
                    : "text-fg-muted hover:text-fg hover:bg-subtle"}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </button>
            </div>
          </>
        }
      >
        {/* Filter bar */}
        <div className="px-lg py-md border-b border-line-subtle flex flex-wrap items-center gap-md">
          <label className="inline-flex items-center gap-xs flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-fg-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or description"
              className="h-controlSm w-full rounded-sm border border-line bg-surface
                text-bodySm text-fg px-sm placeholder:text-fg-subtle
                focus:border-accent focus:shadow-focus-ring
                transition"
            />
          </label>
          <SelectPill
            label="Project"
            value={projectFilter}
            onChange={setProjectFilter}
            options={projectOptions}
          />
          {viewMode === "table" && (
            <SelectPill
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
          )}
          <SelectPill
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={priorityOptions}
          />
          <SelectPill
            label="Assignee"
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            options={assigneeOptions}
          />
        </div>

        {/* List */}
        {error ? (
          <div className="px-lg py-lg">
            <div
              role="alert"
              className="p-md rounded-md bg-error-50 border border-error-200 text-error-800 text-bodySm"
            >
              <p className="font-medium mb-xs">Couldn't load bugs</p>
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
              {/failed.*precondition|requires an index/i.test(error.message || "") && (
                <p className="mt-xs text-caption text-error-700">
                  Firestore needs a collection-group index for this query — open the
                  browser console; the error includes a direct link to create it.
                </p>
              )}
            </div>
          </div>
        ) : loading ? (
          <ul className="divide-y divide-line-subtle">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-start gap-md px-lg py-md">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 flex flex-col gap-xs">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="px-lg py-lg">
            <EmptyState
              icon={Bug}
              title={
                stats.total === 0
                  ? "No bugs filed yet"
                  : "No bugs match your filters"
              }
              description={
                stats.total === 0
                  ? undefined
                  : "Try clearing the search or relaxing a filter."
              }
            />
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanView
            bugs={filtered}
            projectMap={projectMap}
            employeeMap={employeeMap}
          />
        ) : (
          <ul className="divide-y divide-line-subtle">
            {filtered.map((bug) => {
              const project = bug.projectId ? projectMap.get(bug.projectId) : null;
              const assignee = bug.assigneeId ? employeeMap.get(bug.assigneeId) : null;
              const status = STATUS[bug.status] || STATUS.backlog;
              const priority = PRIORITY[bug.priority] || PRIORITY.medium;
              const severity = SEVERITY[bug.severity] || SEVERITY.medium;
              const StatusIcon = status.icon;
              const PriorityIcon = priority.icon;
              const due = formatDue(bug.dueDate);
              const attachmentCount = bug.attachments?.length ?? 0;

              return (
                <li key={`${bug.projectId}-${bug.id}`}>
                  <Link
                    to={project ? projectPath(project) : "#"}
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
                        <span className="inline-flex items-center gap-xs text-caption text-fg-subtle capitalize">
                          <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[severity.tone]}`} />
                          {severity.label}
                        </span>
                        {due && (
                          <span
                            className={`inline-flex items-center gap-xs text-caption ${
                              due.overdue ? "text-error-700" : "text-fg-subtle"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            <span className="tabular-nums">{due.label}</span>
                          </span>
                        )}
                        {attachmentCount > 0 && (
                          <span className="inline-flex items-center gap-xs text-caption text-fg-subtle">
                            <Paperclip className="h-3 w-3" />
                            <span className="tabular-nums">{attachmentCount}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-sm self-center shrink-0">
                      {assignee ? (
                        assignee.avatar ? (
                          <img
                            src={`/images/${assignee.avatar}`}
                            alt={assignee.name}
                            className="h-7 w-7 rounded-full object-cover border border-line"
                            title={assignee.name}
                          />
                        ) : (
                          <span
                            title={assignee.name}
                            className="h-7 w-7 rounded-full bg-accent-soft text-accent
                              text-caption font-semibold inline-flex items-center justify-center"
                          >
                            {initials(assignee.name)}
                          </span>
                        )
                      ) : (
                        <span
                          title="Unassigned"
                          className="h-7 w-7 rounded-full bg-subtle text-fg-subtle
                            inline-flex items-center justify-center border border-dashed border-line text-caption"
                        >
                          —
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-fg group-hover:translate-x-[2px] transition-[color,transform] duration-fast" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Bugs;
