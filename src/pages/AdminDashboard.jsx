import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FolderKanban,
  Plus,
  UserPlus,
  Sparkles,
  StickyNote,
  Paperclip,
  Users as UsersIcon,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import StatsRow from "../components/Dashboard/StatsRow";

import useDashboardStats from "../hooks/useDashboardStats";
import { projectPath } from "../lib/slug";
import { useProjects } from "../hooks/useProjects";
import useEmployees from "../hooks/useEmployee";
import useRecentMeetingNotes from "../hooks/useRecentMeetingNotes";
import useRecentBugs from "../hooks/useRecentBugs";
import useBugCounts from "../hooks/useBugCounts";
import useMeetingNotesCount from "../hooks/useMeetingNotesCount";
import useTaskCounts from "../hooks/useTaskCounts";
import { useAuth } from "../context/AuthContext";

import RecentBugsPanel from "../features/bugs/components/RecentBugsPanel";
import BugTrendChart from "../components/Dashboard/BugTrendChart";
import WorkloadChart from "../components/Dashboard/WorkloadChart";

/* ============================================================
   Helpers
============================================================ */
const formatDate = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const greetingName = (email) => {
  if (!email) return "there";
  const handle = email.split("@")[0]?.split(".")[0] ?? "there";
  return handle.charAt(0).toUpperCase() + handle.slice(1);
};

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const PHASES = [
  { key: "pitch", label: "Pitch" },
  { key: "design", label: "Design" },
  { key: "development", label: "Development" },
  { key: "seo", label: "SEO" },
];

const STATUS_VARIANTS = {
  active:    { token: "bg-success-500",  dot: "bg-success-500",  label: "Active",    fg: "text-success-700" },
  completed: { token: "bg-accent-500",   dot: "bg-accent-500",   label: "Completed", fg: "text-accent" },
  paused:    { token: "bg-warning-500",  dot: "bg-warning-500",  label: "Paused",    fg: "text-warning-700" },
  archived:  { token: "bg-gray-300",     dot: "bg-gray-300",     label: "Archived",  fg: "text-fg-subtle" },
};

const projectStatusChip = {
  active:    "bg-success-50 text-success-700",
  completed: "bg-accent-soft text-accent",
  paused:    "bg-warning-50 text-warning-700",
  archived:  "bg-subtle text-fg-subtle",
};

const roleAccent = {
  admin:    "bg-error-50 text-error-700",
  manager:  "bg-accent-soft text-accent",
  hr:       "bg-warning-50 text-warning-700",
  employee: "bg-subtle text-fg-muted",
};

/* ============================================================
   Pipeline panel — phase distribution bars
============================================================ */
const PipelinePanel = ({ projects, loading }) => {
  const counts = useMemo(() => {
    const map = Object.fromEntries(PHASES.map((p) => [p.key, 0]));
    projects?.forEach((p) => {
      const k = (p.currentPhase || "").toLowerCase();
      if (k in map) map[k] += 1;
    });
    return map;
  }, [projects]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(counts));

  return (
    <Card
      padded={false}
      header={
        <>
          <h2 className="text-section text-fg">Project pipeline</h2>
          <span className="text-caption text-fg-subtle">
            {total} project{total === 1 ? "" : "s"}
          </span>
        </>
      }
    >
      <div className="px-lg py-md flex flex-col gap-md">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-xs">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-6" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))
          : PHASES.map((phase) => {
              const value = counts[phase.key] ?? 0;
              const pct = (value / max) * 100;
              return (
                <div key={phase.key} className="flex flex-col gap-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-bodySm text-fg-muted">
                      {phase.label}
                    </span>
                    <span className="text-bodySm text-fg font-medium tabular-nums">
                      {value}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-slower"
                      style={{ width: `${value === 0 ? 0 : Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </Card>
  );
};

/* ============================================================
   Team panel — total + role breakdown + avatar stack + CTA
============================================================ */
const TeamPanel = ({ employees, loading }) => {
  const roleCounts = useMemo(() => {
    const map = { admin: 0, manager: 0, hr: 0, employee: 0 };
    employees?.forEach((e) => {
      const r = (e.role || "employee").toLowerCase();
      if (r in map) map[r] += 1;
    });
    return map;
  }, [employees]);

  const recent = useMemo(() => {
    if (!employees?.length) return [];
    return [...employees]
      .filter((e) => e.joinedDate)
      .sort(
        (a, b) =>
          new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime()
      )
      .slice(0, 5);
  }, [employees]);

  return (
    <Card
      padded={false}
      header={
        <>
          <h2 className="text-section text-fg">Team</h2>
          <Link
            to="/employees"
            className="inline-flex items-center gap-xs text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      }
    >
      <div className="px-lg py-md">
        {loading ? (
          <div className="flex flex-col gap-md">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-sm">
              <span className="text-display text-fg tabular-nums leading-none">
                {employees?.length ?? 0}
              </span>
              <span className="text-bodySm text-fg-subtle">total members</span>
            </div>

            {/* Role breakdown */}
            <div className="grid grid-cols-2 gap-xs mt-md">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between rounded-md px-sm py-xs bg-subtle/60"
                >
                  <span
                    className={`text-caption font-medium px-sm py-[1px] rounded-xs capitalize ${
                      roleAccent[role] ?? roleAccent.employee
                    }`}
                  >
                    {role}
                  </span>
                  <span className="text-bodySm text-fg font-medium tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>

            {/* Avatar stack */}
            {recent.length > 0 && (
              <div className="mt-lg pt-md border-t border-line-subtle">
                <p className="text-caption text-fg-subtle mb-sm">
                  Recently joined
                </p>
                <div className="flex items-center gap-sm">
                  <div className="flex -space-x-2">
                    {recent.map((e) => (
                      <div
                        key={e.id}
                        title={e.name}
                        className="h-7 w-7 rounded-full bg-accent-soft text-accent
                          border-2 border-surface flex items-center justify-center
                          text-caption font-semibold overflow-hidden"
                      >
                        {e.avatar ? (
                          <img
                            src={`/images/${e.avatar}`}
                            alt={e.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials(e.name)
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-caption text-fg-subtle truncate">
                    {recent
                      .slice(0, 2)
                      .map((e) => e.name?.split(" ")[0])
                      .filter(Boolean)
                      .join(", ")}
                    {recent.length > 2 && ` +${recent.length - 2} more`}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

/* ============================================================
   Status mix panel — stacked horizontal bar by project status
============================================================ */
const StatusMixPanel = ({ projects, loading }) => {
  const counts = useMemo(() => {
    const map = { active: 0, completed: 0, paused: 0, archived: 0 };
    projects?.forEach((p) => {
      const s = (p.status || "active").toLowerCase();
      if (s in map) map[s] += 1;
      else map.archived += 1;
    });
    return map;
  }, [projects]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 0;
  const segments = ["active", "completed", "paused", "archived"]
    .filter((k) => counts[k] > 0)
    .map((k) => ({
      key: k,
      value: counts[k],
      pct: total > 0 ? (counts[k] / total) * 100 : 0,
      ...STATUS_VARIANTS[k],
    }));

  return (
    <Card
      padded={false}
      header={<h2 className="text-section text-fg">Status mix</h2>}
    >
      <div className="px-lg py-md flex flex-col gap-md">
        {loading ? (
          <>
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex gap-md flex-wrap">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-24" />
              ))}
            </div>
          </>
        ) : total === 0 ? (
          <p className="text-bodySm text-fg-muted">
            No projects yet — once you create some, this is where you'll see how
            the portfolio is balanced.
          </p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="h-3 w-full rounded-full overflow-hidden flex bg-subtle">
              {segments.map((seg) => (
                <div
                  key={seg.key}
                  className={`${seg.token} h-full transition-[width] duration-slower`}
                  style={{ width: `${seg.pct}%` }}
                  title={`${seg.label}: ${seg.value}`}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-lg gap-y-xs">
              {segments.map((seg) => (
                <div key={seg.key} className="flex items-center gap-xs">
                  <span className={`h-2 w-2 rounded-full ${seg.dot}`} />
                  <span className="text-bodySm text-fg-muted capitalize">
                    {seg.label}
                  </span>
                  <span className="text-bodySm text-fg font-medium tabular-nums">
                    {seg.value}
                  </span>
                  <span className="text-caption text-fg-subtle tabular-nums">
                    ({Math.round(seg.pct)}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

/* ============================================================
   Recent projects list
============================================================ */
const RecentProjectsPanel = ({ projects, loading }) => {
  const recent = (projects ?? []).slice(0, 6);

  return (
    <Card
      padded={false}
      header={
        <>
          <h2 className="text-section text-fg">Recent projects</h2>
          <Link
            to="/projects"
            className="inline-flex items-center gap-xs text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      }
    >
      {loading ? (
        <ul className="divide-y divide-line-subtle">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-md px-lg py-md">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="flex-1 flex flex-col gap-xs">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-16 rounded-xs" />
            </li>
          ))}
        </ul>
      ) : recent.length === 0 ? (
        <div className="px-lg py-lg">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            action={
              <Link
                to="/projects"
                className="inline-flex items-center gap-xs h-control px-lg rounded-md bg-accent text-accent-fg text-body font-medium hover:bg-accent-hover transition-colors duration-fast"
              >
                Create project
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {recent.map((project) => {
            const memberCount = project.memberIds?.length ?? 0;
            const status = (project.status || "active").toLowerCase();
            return (
              <li
                key={project.id}
                className="flex items-center gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
              >
                <div className="h-8 w-8 rounded-md bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <FolderKanban className="h-4 w-4" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body text-fg font-medium truncate">
                    {project.name || project.projectName || "Untitled"}
                  </p>
                  <p className="text-caption text-fg-subtle truncate">
                    {memberCount === 0
                      ? "No members assigned"
                      : `${memberCount} member${memberCount === 1 ? "" : "s"}`}
                    {project.clientName && ` · ${project.clientName}`}
                  </p>
                </div>
                <span
                  className={`text-caption px-sm py-[2px] rounded-xs capitalize font-medium shrink-0 ${
                    projectStatusChip[status] ?? projectStatusChip.archived
                  }`}
                >
                  {status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

/* ============================================================
   Recent meeting notes panel — cross-project feed
============================================================ */
const formatNoteRelative = (value) => {
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

const RecentMeetingNotesPanel = ({ notes, loading, error, projects, employees }) => {
  const projectMap = new Map((projects || []).map((p) => [p.id, p]));
  const employeeMap = new Map((employees || []).map((e) => [e.id, e]));

  return (
    <Card
      padded={false}
      header={
        <>
          <h2 className="text-section text-fg">Recent meeting notes</h2>
          <span className="text-caption text-fg-subtle">
            {loading ? "" : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
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
            <p className="font-medium mb-xs">Couldn't load recent meeting notes</p>
            <p className="text-bodySm">
              {error.code || error.message || "Unknown error"}
            </p>
            {(error.code === "permission-denied" ||
              /insufficient permissions/i.test(error.message || "")) && (
              <p className="mt-xs text-caption text-error-700">
                Add this Firestore rule:{" "}
                <code className="font-mono">
                  match /{"{path=**}"}/meetingNotes/{"{noteId}"} {"{ allow read: if request.auth != null; }"}
                </code>
              </p>
            )}
            {/failed.*precondition|requires an index/i.test(error.message || "") && (
              <p className="mt-xs text-caption text-error-700">
                Firestore needs a collection-group index for this query — open the
                browser console; the error message includes a direct link to create it.
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
      ) : notes.length === 0 ? (
        <div className="px-lg py-lg">
          <EmptyState
            icon={StickyNote}
            title="No meeting notes yet"
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {notes.map((note) => {
            const project = note.projectId
              ? projectMap.get(note.projectId)
              : null;
            const author = employeeMap.get(note.createdById);
            const attCount = note.attachments?.length ?? 0;
            const attendeeCount = note.attendeeIds?.length ?? 0;

            return (
              <li key={note.id}>
                <Link
                  to={project ? projectPath(project) : "#"}
                  className="group flex items-start gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
                >
                  <div className="h-8 w-8 rounded-md bg-accent-soft text-accent flex items-center justify-center shrink-0">
                    <StickyNote className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-fg font-medium truncate">
                      {note.title || "Untitled meeting"}
                    </p>
                    <p className="text-caption text-fg-subtle truncate mt-[2px]">
                      {project ? (
                        <span className="text-fg-muted">
                          {project.name}
                        </span>
                      ) : (
                        <span>Project · unknown</span>
                      )}
                      {" · "}
                      {author?.name || note.createdByName || "Unknown"}
                      {" · "}
                      {formatNoteRelative(note.createdAt)}
                    </p>
                    {(attendeeCount > 0 || attCount > 0) && (
                      <div className="mt-xs flex flex-wrap items-center gap-md">
                        {attendeeCount > 0 && (
                          <span className="text-caption text-fg-subtle inline-flex items-center gap-xs">
                            <UsersIcon className="h-3 w-3" />
                            {attendeeCount}
                          </span>
                        )}
                        {attCount > 0 && (
                          <span className="text-caption text-fg-subtle inline-flex items-center gap-xs">
                            <Paperclip className="h-3 w-3" />
                            {attCount}
                          </span>
                        )}
                      </div>
                    )}
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

/* ============================================================
   Quick actions panel
============================================================ */
const QuickActionsPanel = () => {
  const actions = [
    {
      to: "/projects",
      icon: Plus,
      title: "Create project",
      desc: "Spin up a new workspace project",
      tone: "accent",
    },
    {
      to: "/employees",
      icon: UserPlus,
      title: "Invite teammate",
      desc: "Bring someone new into your team",
      tone: "default",
    },
    {
      to: "/settings",
      icon: Sparkles,
      title: "Personalize",
      desc: "Tweak your profile + preferences",
      tone: "default",
    },
  ];

  const toneStyles = {
    accent:  "bg-accent-soft text-accent",
    default: "bg-subtle text-fg-muted",
  };

  return (
    <Card
      padded={false}
      header={<h2 className="text-section text-fg">Quick actions</h2>}
    >
      <ul className="divide-y divide-line-subtle">
        {actions.map(({ to, icon: Icon, title, desc, tone }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex items-center gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
            >
              <div
                className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${toneStyles[tone]}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body text-fg font-medium">{title}</p>
                <p className="text-caption text-fg-subtle">{desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-fg group-hover:translate-x-[2px] transition-[color,transform] duration-fast" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};

/* ============================================================
   Page
============================================================ */
const AdminDashboard = () => {
  const { user } = useAuth();
  const stats = useDashboardStats();
  const { projects, loading: projectsLoading } = useProjects();
  const { employees, loading: employeesLoading } = useEmployees();
  const { notes: recentNotes, loading: notesLoading, error: notesError } = useRecentMeetingNotes(6);
  const { bugs: recentBugs, loading: bugsLoading, error: bugsError } = useRecentBugs(6);
  const { totalOpen: openBugCount, loading: bugCountsLoading } = useBugCounts();
  const { total: meetingNotesTotal, loading: meetingNotesCountLoading } = useMeetingNotesCount();
  const { totalOpen: openTaskCount, loading: taskCountsLoading } = useTaskCounts();

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader
        eyebrow={formatDate()}
        title={`Welcome back, ${greetingName(user?.email)}`}
        actions={
          <Link
            to="/projects"
            className="inline-flex items-center justify-center gap-sm h-control px-lg rounded-md
              bg-accent text-accent-fg text-body font-medium
              hover:bg-accent-hover transition-colors duration-fast"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New project
          </Link>
        }
      />

      <StatsRow
        {...stats}
        bugs={openBugCount}
        meetingNotes={meetingNotesTotal}
        meetingNotesLoading={meetingNotesCountLoading}
        tasks={openTaskCount}
        tasksLoading={taskCountsLoading}
        statsLoading={stats.statsLoading || bugCountsLoading}
      />

      {/* Row: pipeline + team */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-7">
          <PipelinePanel projects={projects} loading={projectsLoading} />
        </div>
        <div className="lg:col-span-5">
          <TeamPanel employees={employees} loading={employeesLoading} />
        </div>
      </div>

      {/* Row: status mix + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-7">
          <StatusMixPanel projects={projects} loading={projectsLoading} />
        </div>
        <div className="lg:col-span-5">
          <QuickActionsPanel />
        </div>
      </div>

      {/* Row: bug trend + workload — the two operational charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-7">
          <BugTrendChart days={30} />
        </div>
        <div className="lg:col-span-5">
          <WorkloadChart limit={8} />
        </div>
      </div>

      {/* Row: recent projects (full width) */}
      <RecentProjectsPanel projects={projects} loading={projectsLoading} />

      {/* Row: recent meeting notes + recent bugs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-6">
          <RecentMeetingNotesPanel
            notes={recentNotes}
            loading={notesLoading}
            error={notesError}
            projects={projects}
            employees={employees}
          />
        </div>
        <div className="lg:col-span-6">
          <RecentBugsPanel
            bugs={recentBugs}
            loading={bugsLoading}
            error={bugsError}
            projects={projects}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
