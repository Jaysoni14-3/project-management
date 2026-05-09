import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Briefcase,
  Bug,
  StickyNote,
  Users as UsersIcon,
  FolderKanban,
  Pencil,
  Trash2,
  ShieldCheck,
  Clock,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";
import StatCard from "../components/Dashboard/StatCard";

import useUser from "../hooks/useUser";
import useEmployees from "../hooks/useEmployee";
import { useProjects } from "../hooks/useProjects";
import useAllBugs from "../hooks/useAllBugs";
import useRecentMeetingNotes from "../hooks/useRecentMeetingNotes";
import { useAuth } from "../context/AuthContext";
import { projectPath, employeePath, resolveEmployeeFromUrlParam } from "../lib/slug";

import {
  deleteUser,
  removeUserFromAllProjects,
} from "../services/employee.service";
import { impersonateUser } from "../services/auth.service";
import { toast } from "react-toastify";

import AddUserModal from "../features/employees/AddUserModal";
import {
  STATUS as BUG_STATUS,
  PRIORITY as BUG_PRIORITY,
  TONE_ICON,
} from "../features/bugs/constants";

/* ============================================================
   Helpers
============================================================ */
const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatDate = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const tenureDays = (raw) => {
  if (!raw) return 0;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
};

const formatTenure = (days) => {
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  const rem = Math.floor((days - years * 365) / 30);
  return rem === 0 ? `${years}y` : `${years}y ${rem}mo`;
};

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

const roleConfig = {
  admin:    { label: "Admin",    chip: "bg-error-50 text-error-700 border-error-200",     dot: "bg-error-500"    },
  manager:  { label: "Manager",  chip: "bg-accent-soft text-accent border-accent-200",     dot: "bg-accent-500"   },
  hr:       { label: "HR",       chip: "bg-warning-50 text-warning-700 border-warning-200", dot: "bg-warning-500" },
  employee: { label: "Employee", chip: "bg-subtle text-fg-muted border-line",              dot: "bg-fg-subtle"    },
};

const projectStatusChip = {
  active:    "bg-success-50 text-success-700",
  completed: "bg-accent-soft text-accent",
  paused:    "bg-warning-50 text-warning-700",
  archived:  "bg-subtle text-fg-subtle",
};

/* ============================================================
   Tiny utility: detail row in the right rail
============================================================ */
const DetailRow = ({ label, children }) => (
  <div className="flex items-center justify-between py-sm gap-md">
    <span className="text-caption text-fg-subtle">{label}</span>
    <span className="text-bodySm text-fg text-right truncate min-w-0">
      {children}
    </span>
  </div>
);

const ContactPill = ({ to, label, icon: Icon }) => (
  <a
    href={to}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="inline-flex items-center gap-xs h-controlSm px-md rounded-md
      border border-line bg-surface text-bodySm text-fg-muted
      hover:text-fg hover:border-line-strong hover:bg-subtle
      transition-colors duration-fast"
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </a>
);

/* ============================================================
   Project tile inside the assigned-projects panel
============================================================ */
const AssignedProjectTile = ({ project, openBugCount, isManager }) => {
  const status = (project.status || "active").toLowerCase();
  const memberCount = project.memberIds?.length ?? 0;
  return (
    <Link
      to={projectPath(project)}
      className="group flex items-center gap-md p-md rounded-md border border-line bg-surface
        hover:border-line-strong hover:shadow-sm transition-[border-color,box-shadow,transform] duration-fast"
    >
      <div className="h-9 w-9 shrink-0 rounded-md bg-accent-soft text-accent flex items-center justify-center">
        <FolderKanban className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-xs flex-wrap">
          <p className="text-body text-fg font-medium truncate">
            {project.name || "Untitled"}
          </p>
          {isManager && (
            <span
              title="Project lead"
              className="inline-flex items-center gap-xs text-caption text-accent bg-accent-soft px-sm py-[1px] rounded-xs"
            >
              <ShieldCheck className="h-3 w-3" />
              Lead
            </span>
          )}
        </div>
        <p className="text-caption text-fg-subtle truncate">
          {memberCount} {memberCount === 1 ? "member" : "members"}
          {openBugCount > 0 && (
            <>
              {" · "}
              <span className="text-error-700">
                {openBugCount} open {openBugCount === 1 ? "bug" : "bugs"}
              </span>
            </>
          )}
        </p>
      </div>
      <span
        className={`text-caption px-sm py-[2px] rounded-xs capitalize font-medium shrink-0 ${
          projectStatusChip[status] ?? projectStatusChip.archived
        }`}
      >
        {status}
      </span>
      <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-fg group-hover:translate-x-[2px] transition-[color,transform] duration-fast shrink-0" />
    </Link>
  );
};

/* ============================================================
   Page
============================================================ */
const EmployeeDetails = () => {
  const { employeeSlug } = useParams();
  const navigate = useNavigate();
  const { user: authUser, role: authRole, canManage } = useAuth();

  /* Resolve `:employeeSlug` (notion-style "name-shortid") against the live
     employees list. Falls back to id-exact lookup for legacy bookmarks. */
  const { employees, loading: employeesLoading } = useEmployees();
  const resolvedFromList = useMemo(
    () => resolveEmployeeFromUrlParam(employeeSlug, employees),
    [employeeSlug, employees]
  );
  const employeeId = resolvedFromList?.id || null;

  const { user: liveUser, loading: liveLoading, error } = useUser(employeeId);
  /* Use whichever copy is fresher: prefer the live subscription, fall back
     to the entry from the employees list while it's still warming up. */
  const user = liveUser || resolvedFromList;
  /* Block on resolution + per-user fetch so the page doesn't flash the
     "not found" empty state while the list is still arriving. */
  const loading = employeesLoading || (!!employeeId && liveLoading);
  const { projects } = useProjects();
  const { bugs: allBugs, error: bugsError } = useAllBugs();
  const { notes: recentNotes, error: notesError } = useRecentMeetingNotes(40);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSelf = authUser?.uid === employeeId;
  const isAdmin = authRole === "admin";

  /* Their projects — admin sees all, others see only ones they share */
  const myProjects = useMemo(() => {
    if (!user) return [];
    return (projects ?? []).filter((p) => {
      const m = Array.isArray(p.memberIds) && p.memberIds.includes(user.id);
      const lead = Array.isArray(p.managerIds) && p.managerIds.includes(user.id);
      return m || lead;
    });
  }, [projects, user]);

  const managerIdSet = useMemo(() => {
    const s = new Set();
    myProjects.forEach((p) => {
      if (Array.isArray(p.managerIds) && p.managerIds.includes(user?.id)) {
        s.add(p.id);
      }
    });
    return s;
  }, [myProjects, user]);

  /* Bugs assigned to this person */
  const assignedBugs = useMemo(
    () => (allBugs ?? []).filter((b) => b.assigneeId === employeeId),
    [allBugs, employeeId]
  );

  const bugCountsByProject = useMemo(() => {
    const map = {};
    (allBugs ?? []).forEach((b) => {
      if (!b.projectId) return;
      if ((b.status || "backlog") === "done") return;
      map[b.projectId] = (map[b.projectId] || 0) + 1;
    });
    return map;
  }, [allBugs]);

  /* Meeting notes authored by this person, then attended */
  const authoredNotes = useMemo(
    () => (recentNotes ?? []).filter((n) => n.createdById === employeeId).slice(0, 5),
    [recentNotes, employeeId]
  );
  const attendedNotes = useMemo(
    () =>
      (recentNotes ?? [])
        .filter(
          (n) =>
            n.createdById !== employeeId &&
            Array.isArray(n.attendeeIds) &&
            n.attendeeIds.includes(employeeId)
        )
        .slice(0, 5),
    [recentNotes, employeeId]
  );

  /* Direct reports — anyone whose managerID points to this user */
  const directReports = useMemo(
    () => (employees ?? []).filter((e) => e.managerID === employeeId),
    [employees, employeeId]
  );

  /* Their own manager (for the right rail) */
  const theirManager = useMemo(() => {
    if (!user?.managerID) return null;
    return (employees ?? []).find((e) => e.id === user.managerID) || null;
  }, [user, employees]);

  const openBugCount = useMemo(
    () => assignedBugs.filter((b) => (b.status || "backlog") !== "done").length,
    [assignedBugs]
  );

  const activeProjectCount = useMemo(
    () => myProjects.filter((p) => (p.status || "active").toLowerCase() === "active").length,
    [myProjects]
  );

  const tenure = tenureDays(user?.joinedDate);

  /* ============= Loading / not-found ============= */
  if (loading) {
    return (
      <div className="flex flex-col gap-xl">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-md">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex flex-col gap-xs flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col gap-lg">
        <Link
          to="/employees"
          className="inline-flex items-center gap-xs text-bodySm text-fg-muted hover:text-fg w-max"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Team
        </Link>
        <EmptyState
          icon={UsersIcon}
          title={error ? "Couldn't load teammate" : "Teammate not found"}
          description={
            error
              ? error.message || "Something went wrong while loading."
              : "This person may have been removed, or you don't have access."
          }
          action={
            <Link
              to="/employees"
              className="inline-flex items-center gap-xs h-control px-lg rounded-md bg-accent text-accent-fg text-body font-medium hover:bg-accent-hover transition-colors duration-fast"
            >
              All teammates
            </Link>
          }
        />
      </div>
    );
  }

  /* ============= Loaded ============= */
  const role = (user.role || "employee").toLowerCase();
  const cfg = roleConfig[role] ?? roleConfig.employee;

  const handleDelete = async () => {
    if (isSelf) return;
    try {
      setDeleting(true);
      await removeUserFromAllProjects(user.id);
      await deleteUser(user.id);
      navigate("/employees", { replace: true });
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-xl">
      {/* ---------- Hero ---------- */}
      <div className="relative">
        <div className="relative flex flex-col gap-lg">
          {/* Breadcrumb */}
          <Link
            to="/employees"
            className="inline-flex items-center gap-xs text-bodySm text-fg-muted hover:text-fg transition-colors duration-fast w-max"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Team
          </Link>

          {/* Identity row */}
          <div className="flex flex-col gap-lg md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-lg min-w-0">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-20 w-20 rounded-full bg-accent-soft text-accent
                  flex items-center justify-center text-display font-semibold overflow-hidden
                  ring-4 ring-surface shadow-sm">
                  {user.avatar ? (
                    <img
                      src={`/images/${user.avatar}`}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-section">{initials(user.name)}</span>
                  )}
                </div>
                {/* Role dot */}
                <span
                  title={cfg.label}
                  className={`absolute bottom-[2px] right-[2px] h-4 w-4 rounded-full border-2 border-surface ${cfg.dot}`}
                />
              </div>

              {/* Identity text */}
              <div className="min-w-0 flex flex-col gap-xs">
                <div className="flex items-center gap-sm flex-wrap">
                  <h1 className="text-display text-fg leading-none truncate capitalize">
                    {user.name || "Unnamed"}
                  </h1>
                  <span
                    className={`text-caption font-medium px-sm py-[2px] rounded-xs border capitalize ${cfg.chip}`}
                  >
                    {cfg.label}
                  </span>
                  {isSelf && (
                    <span className="text-caption font-medium px-sm py-[2px] rounded-xs bg-subtle text-fg-muted">
                      You
                    </span>
                  )}
                </div>
                {user.designation && (
                  <p className="text-bodySm text-fg-muted capitalize truncate">
                    {user.designation}
                  </p>
                )}
                {/* Quick contact pills */}
                <div className="flex flex-wrap items-center gap-xs mt-xs">
                  {user.email && (
                    <ContactPill
                      to={`mailto:${user.email}`}
                      icon={Mail}
                      label={user.email}
                    />
                  )}
                  {user.whatsapp && (
                    <ContactPill
                      to={`https://wa.me/${user.whatsapp}`}
                      icon={MessageCircle}
                      label="WhatsApp"
                    />
                  )}
                  {user.phoneNumber && (
                    <ContactPill
                      to={`tel:${user.phoneNumber}`}
                      icon={Phone}
                      label="Call"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Privileged actions — admin/manager can edit or remove
                other teammates. Admins additionally get "Login as" to
                impersonate this user. Self-edit lives in Settings, so
                we hide this row on your own card. */}
            {!isSelf && canManage && (
              <div className="flex items-center gap-sm shrink-0">
                {isAdmin && (
                  <Button
                    variant="secondary"
                    leadingIcon={UserCheck}
                    onClick={async () => {
                      try {
                        await impersonateUser(user.id);
                        /* Reload so every cached subscription
                           re-fetches under the impersonated session. */
                        window.location.assign("/");
                      } catch (err) {
                        toast.error(err?.message || "Couldn't start impersonation");
                      }
                    }}
                  >
                    Login as
                  </Button>
                )}
                <Button
                  variant="secondary"
                  leadingIcon={Pencil}
                  onClick={() => setEditOpen(true)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  leadingIcon={Trash2}
                  onClick={() => setDeleteOpen(true)}
                  className="text-error hover:bg-error-50 hover:text-error-700"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard
          label="Active projects"
          value={activeProjectCount}
          icon={FolderKanban}
          variant="accent"
        />
        <StatCard
          label="Open bugs assigned"
          value={openBugCount}
          icon={Bug}
          variant={openBugCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Notes authored"
          value={authoredNotes.length}
          icon={StickyNote}
          variant="default"
        />
        <StatCard
          label="Tenure"
          value={formatTenure(tenure)}
          icon={Clock}
          variant="success"
        />
      </div>

      {/* ---------- Body ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* === Main column === */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Projects */}
          <Card
            padded={false}
            header={
              <>
                <div>
                  <h2 className="text-section text-fg">Projects</h2>
                  {myProjects.length > 0 && (
                    <p className="text-caption text-fg-subtle mt-[2px]">
                      On {myProjects.length} {myProjects.length === 1 ? "project" : "projects"}
                    </p>
                  )}
                </div>
                {myProjects.length > 0 && (
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-xs text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            }
          >
            {myProjects.length === 0 ? (
              <div className="px-lg py-lg">
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description={
                    isAdmin
                      ? undefined
                      : "You don't share any projects with this teammate."
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm px-lg py-md">
                {myProjects.map((p) => (
                  <AssignedProjectTile
                    key={p.id}
                    project={p}
                    openBugCount={bugCountsByProject[p.id] ?? 0}
                    isManager={managerIdSet.has(p.id)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Assigned bugs */}
          <Card
            padded={false}
            header={
              <>
                <div>
                  <h2 className="text-section text-fg">Assigned bugs</h2>
                  {assignedBugs.length > 0 && (
                    <p className="text-caption text-fg-subtle mt-[2px]">
                      {openBugCount} open · {assignedBugs.length - openBugCount} done
                    </p>
                  )}
                </div>
                {assignedBugs.length > 0 && (
                  <Link
                    to="/bugs"
                    className="inline-flex items-center gap-xs text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            }
          >
            {bugsError ? (
              <div className="px-lg py-lg">
                <p className="text-bodySm text-fg-subtle">
                  Couldn't load bugs — {bugsError.code || bugsError.message || "unknown error"}.
                </p>
              </div>
            ) : assignedBugs.length === 0 ? (
              <div className="px-lg py-lg">
                <EmptyState
                  icon={Bug}
                  title="No bugs assigned"
                />
              </div>
            ) : (
              <ul className="divide-y divide-line-subtle">
                {assignedBugs.slice(0, 8).map((bug) => {
                  const status = BUG_STATUS[bug.status] || BUG_STATUS.backlog;
                  const priority = BUG_PRIORITY[bug.priority] || BUG_PRIORITY.medium;
                  const StatusIcon = status.icon;
                  const PriorityIcon = priority.icon;
                  const project = (projects ?? []).find((p) => p.id === bug.projectId);
                  const isDone = (bug.status || "backlog") === "done";
                  return (
                    <li key={`${bug.projectId}-${bug.id}`}>
                      <Link
                        to={project ? projectPath(project) : "#"}
                        className="group flex items-start gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
                      >
                        <div
                          className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                            isDone
                              ? "bg-success-50 text-success-700"
                              : "bg-error-50 text-error-700"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Bug className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-body font-medium truncate ${
                              isDone
                                ? "text-fg-muted line-through decoration-fg-subtle"
                                : "text-fg"
                            }`}
                          >
                            {bug.title || "Untitled bug"}
                          </p>
                          <p className="text-caption text-fg-subtle truncate mt-[2px]">
                            {project?.name ?? "Project · unknown"}
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
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Activity — meeting notes */}
          <Card
            padded={false}
            header={<h2 className="text-section text-fg">Recent activity</h2>}
          >
            {notesError ? (
              <div className="px-lg py-lg">
                <p className="text-bodySm text-fg-subtle">
                  Couldn't load activity — {notesError.code || notesError.message || "unknown error"}.
                </p>
              </div>
            ) : authoredNotes.length === 0 && attendedNotes.length === 0 ? (
              <div className="px-lg py-lg">
                <EmptyState
                  icon={StickyNote}
                  title="Nothing recent"
                />
              </div>
            ) : (
              <div className="flex flex-col">
                {authoredNotes.length > 0 && (
                  <div>
                    <p className="px-lg pt-md pb-xs text-eyebrow uppercase text-fg-subtle">
                      Authored
                    </p>
                    <ul className="divide-y divide-line-subtle">
                      {authoredNotes.map((note) => (
                        <NoteRow key={`a-${note.id}`} note={note} projects={projects} />
                      ))}
                    </ul>
                  </div>
                )}
                {attendedNotes.length > 0 && (
                  <div>
                    <p className="px-lg pt-md pb-xs text-eyebrow uppercase text-fg-subtle">
                      Attended
                    </p>
                    <ul className="divide-y divide-line-subtle">
                      {attendedNotes.map((note) => (
                        <NoteRow key={`at-${note.id}`} note={note} projects={projects} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* === Right rail === */}
        <aside className="lg:col-span-4 flex flex-col gap-lg lg:sticky lg:top-xl lg:self-start">
          {/* Profile details */}
          <Card
            padded={false}
            header={
              <div>
                <h2 className="text-section text-fg">Profile</h2>
              </div>
            }
          >
            <div className="px-lg py-sm divide-y divide-line-subtle">
              <DetailRow label="Email">
                {user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="text-accent hover:text-accent-hover"
                  >
                    {user.email}
                  </a>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </DetailRow>
              <DetailRow label="Designation">
                <span className="capitalize">
                  {user.designation || <span className="text-fg-subtle">—</span>}
                </span>
              </DetailRow>
              <DetailRow label="Role">
                <span className="capitalize">{cfg.label}</span>
              </DetailRow>
              <DetailRow label="Manager">
                {theirManager ? (
                  <Link
                    to={employeePath(theirManager)}
                    className="text-accent hover:text-accent-hover capitalize truncate inline-flex items-center gap-xs"
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    {theirManager.name}
                  </Link>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </DetailRow>
              <DetailRow label="Joined">
                <span className="inline-flex items-center gap-xs">
                  <Calendar className="h-3.5 w-3.5 text-fg-subtle" />
                  {formatDate(user.joinedDate)}
                </span>
              </DetailRow>
              <DetailRow label="Tenure">
                <span className="inline-flex items-center gap-xs">
                  <Clock className="h-3.5 w-3.5 text-fg-subtle" />
                  {formatTenure(tenure)}
                </span>
              </DetailRow>
              {user.phoneNumber && (
                <DetailRow label="Phone">
                  <a href={`tel:${user.phoneNumber}`} className="text-fg">
                    {user.phoneNumber}
                  </a>
                </DetailRow>
              )}
            </div>
          </Card>

          {/* Direct reports — surfaces team structure */}
          {directReports.length > 0 && (
            <Card
              padded={false}
              header={
                <div>
                  <h2 className="text-section text-fg">Direct reports</h2>
                  <p className="text-caption text-fg-subtle mt-[2px]">
                    {directReports.length} {directReports.length === 1 ? "person" : "people"}
                  </p>
                </div>
              }
            >
              <ul className="px-sm py-sm flex flex-col gap-xs">
                {directReports.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={employeePath(r)}
                      className="group flex items-center gap-md px-md py-sm rounded-md hover:bg-subtle/60 transition-colors duration-fast"
                    >
                      <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center text-caption font-semibold overflow-hidden">
                        {r.avatar ? (
                          <img
                            src={`/images/${r.avatar}`}
                            alt={r.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials(r.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-bodySm text-fg font-medium capitalize truncate">
                          {r.name}
                        </p>
                        {r.designation && (
                          <p className="text-caption text-fg-subtle truncate capitalize">
                            {r.designation}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-fg-subtle group-hover:text-fg shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {/* Edit + remove modals — both gated by canManage. */}
      {canManage && (
        <>
          <AddUserModal
            isOpen={editOpen}
            user={user}
            onClose={() => setEditOpen(false)}
          />
          <ConfirmDeleteModal
            isOpen={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
            loading={deleting}
            title="Remove team member"
            description={`Remove ${user.name} from the workspace? They'll lose access immediately. This cannot be undone.`}
            confirmLabel="Remove"
          />
        </>
      )}
    </div>
  );
};

/* ============================================================
   Reusable note row for the activity panel
============================================================ */
const NoteRow = ({ note, projects }) => {
  const project = (projects ?? []).find((p) => p.id === note.projectId);
  return (
    <li>
      <Link
        to={project ? projectPath(project) : "#"}
        className="group flex items-start gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
      >
        <div className="h-8 w-8 rounded-md bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <StickyNote className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body text-fg font-medium truncate">
            {note.title || "Untitled meeting"}
          </p>
          <p className="text-caption text-fg-subtle truncate mt-[2px]">
            {project?.name ?? "Project · unknown"}
            {" · "}
            {formatRelative(note.createdAt)}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-fg-subtle group-hover:text-fg group-hover:translate-x-[2px] transition-[color,transform] duration-fast self-center shrink-0" />
      </Link>
    </li>
  );
};

export default EmployeeDetails;
