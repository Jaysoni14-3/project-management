import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FolderKanban,
  Bug,
  Calendar,
  CheckCircle2,
  Users,
  ShieldCheck,
  Plus,
  StickyNote,
  ListChecks,
  Layers,
  Maximize2,
} from "lucide-react";

import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";

import ProjectPhaseBar from "../features/projects/components/ProjectPhaseBar";
import ProjectFormModal from "../features/projects/ProjectFormModal";
import MeetingNoteFormModal from "../features/meetingNotes/MeetingNoteFormModal";
import MeetingNoteCard from "../features/meetingNotes/MeetingNoteCard";
import BugFormModal from "../features/bugs/BugFormModal";
import BugViewModal from "../features/bugs/BugViewModal";
import BugBoard from "../features/bugs/BugBoard";
import TaskFormModal from "../features/tasks/TaskFormModal";
import TaskBoard from "../features/tasks/TaskBoard";
import MeetingNoteViewModal from "../features/meetingNotes/MeetingNoteViewModal";
import ModuleFormModal from "../features/modules/ModuleFormModal";
import ModuleViewModal from "../features/modules/ModuleViewModal";
import ModuleCard from "../features/modules/ModuleCard";

import useProject from "../hooks/useProject";
import { useProjects } from "../hooks/useProjects";
import useEmployees from "../hooks/useEmployee";
import useMeetingNotes from "../hooks/useMeetingNotes";
import useBugs from "../hooks/useBugs";
import useTasks from "../hooks/useTasks";
import { useProjectModules } from "../hooks/useModules";
import { deleteModule } from "../services/module.service";
import { useAuth } from "../context/AuthContext";
import { patchProject, deleteProject } from "../services/project.service";
import { deleteMeetingNote } from "../services/meetingNotes.service";
import { resolveProjectFromUrlParam, projectPath } from "../lib/slug";

/* ============================================================
   Tokens / helpers
============================================================ */
const STATUS_CONFIG = {
  active:    { label: "Active",    pill: "bg-success-50 text-success-700 border-success-200", dot: "bg-success-500" },
  paused:    { label: "Paused",    pill: "bg-warning-50 text-warning-700 border-warning-200", dot: "bg-warning-500" },
  completed: { label: "Completed", pill: "bg-accent-soft text-accent border-accent-200",     dot: "bg-accent" },
  archived:  { label: "Archived",  pill: "bg-subtle text-fg-subtle border-line",            dot: "bg-fg-subtle" },
};

const STATUS_OPTIONS = ["active", "paused", "completed", "archived"];

const PHASE_LABELS = {
  pitch:       "Pitch · Strategy",
  design:      "UI / UX Design",
  development: "Development",
  seo:         "SEO",
};
const PHASE_OPTIONS = ["pitch", "design", "development", "seo"];

const formatDate = (value) => {
  if (!value) return "—";
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRelative = (value) => {
  if (!value) return null;
  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  return `${Math.floor(mo / 12)} year${mo >= 24 ? "s" : ""} ago`;
};

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* ============================================================
   Inline pill: status / phase. Click to change without modal.
============================================================ */
const InlinePill = ({ value, options, labels, configMap, onChange, leadingDot, disabled, className = "" }) => {
  const cfg = configMap?.[value];
  const label = labels?.[value] ?? cfg?.label ?? value;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {leadingDot && cfg?.dot && (
        <span className={`absolute left-2.5 h-1.5 w-1.5 rounded-full ${cfg.dot} pointer-events-none`} />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`appearance-none cursor-pointer
          h-7 rounded-xs border text-caption font-medium capitalize pr-6
          ${leadingDot ? "pl-5" : "pl-2"}
          transition-[border-color,box-shadow] duration-fast
          focus-visible:outline-none focus-visible:shadow-focus-ring
          disabled:opacity-60 disabled:cursor-not-allowed
          ${cfg?.pill ?? "bg-subtle text-fg-muted border-line"}`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels?.[opt] ?? configMap?.[opt]?.label ?? opt}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-1.5 h-3 w-3 pointer-events-none opacity-60"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* ============================================================
   Member tile — used in the team grid
============================================================ */
const MemberTile = ({ user, isManager, isTester }) => (
  <div className="flex items-center gap-md px-md py-sm rounded-md hover:bg-subtle/60 transition-colors duration-fast">
    <div className="h-9 w-9 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center font-semibold overflow-hidden">
      {user?.avatar ? (
        <img
          src={`/images/${user.avatar}`}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials(user?.name)
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-sm">
        <p className="text-body text-fg font-medium capitalize truncate">
          {user?.name || "Unknown"}
        </p>
        {isManager && (
          <span className="inline-flex items-center gap-xs text-caption font-medium px-sm py-[1px] rounded-xs bg-accent-soft text-accent border border-accent-200">
            <ShieldCheck className="h-3 w-3" />
            Lead
          </span>
        )}
        {isTester && !isManager && (
          <span className="inline-flex items-center gap-xs text-caption font-medium px-sm py-[1px] rounded-xs bg-warning-50 text-warning-700 border border-warning-200">
            QA
          </span>
        )}
      </div>
      {user?.designation && (
        <p className="text-caption text-fg-subtle capitalize truncate">
          {user.designation}
        </p>
      )}
    </div>
  </div>
);

/* ============================================================
   Detail row in the right rail
============================================================ */
const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-md py-sm">
    <span className="text-caption text-fg-subtle uppercase tracking-wide">{label}</span>
    <div className="text-bodySm text-fg-muted text-right max-w-[60%] break-words">{children}</div>
  </div>
);

/* ============================================================
   Page
============================================================ */
const ProjectDetails = () => {
  const { projectSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role, canManage } = useAuth();
  const isAdmin = role === "admin";
  const userUid = user?.uid;

  /* Resolve `:projectSlug` to a real project. Accepts either a slugified
     name (new URL style) or a raw cuid (legacy bookmarks). The match is
     done against the realtime project list the user can already see. */
  const { projects, loading: projectsLoading } = useProjects();
  const resolved = useMemo(
    () => resolveProjectFromUrlParam(projectSlug, projects),
    [projectSlug, projects]
  );
  const projectId = resolved?.id || null;

  const { project: liveProject, loading: liveLoading, error } = useProject(projectId);
  /* While the slug is being resolved we still want to render the matched
     project's data eagerly (no flicker), but once the per-project
     subscription delivers an update we prefer that authoritative copy. */
  const project = liveProject || resolved;
  const loading = projectsLoading || (!!projectId && liveLoading);
  const { employees, loading: employeesLoading } = useEmployees();
  const { notes: meetingNotes, loading: notesLoading } = useMeetingNotes(projectId);
  const { bugs, loading: bugsLoading } = useBugs(projectId);
  const { tasks, loading: tasksLoading } = useTasks(projectId);
  const { modules, loading: modulesLoading } = useProjectModules(projectId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Meeting notes module state
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deletingNote, setDeletingNote] = useState(false);
  const [viewingNote, setViewingNote] = useState(null);

  // Bugs module state
  const [bugFormOpen, setBugFormOpen] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [bugDefaultStatus, setBugDefaultStatus] = useState("backlog");
  const [viewingBug, setViewingBug] = useState(null);

  // Tasks module state
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskDefaultStatus, setTaskDefaultStatus] = useState("todo");

  // Modules state
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [viewingModule, setViewingModule] = useState(null);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const [deletingModule, setDeletingModule] = useState(false);

  /* Deep-link auto-open: when a notification (or any external link)
     points at this page with `?bug=<id>`, `?task=<id>`, or
     `?note=<id>`, find the matching entity once it loads and pop the
     corresponding modal. The query param is stripped after opening so
     the URL stays clean and the back button doesn't replay it. */
  useEffect(() => {
    const noteId = searchParams.get("note");
    const taskId = searchParams.get("task");
    const bugId = searchParams.get("bug");
    if (!noteId && !taskId && !bugId) return;

    let opened = false;
    if (noteId && meetingNotes?.length) {
      const note = meetingNotes.find((n) => n.id === noteId);
      if (note) {
        setViewingNote(note);
        opened = true;
      }
    }
    if (taskId && tasks?.length) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setEditingTask(task);
        setTaskFormOpen(true);
        opened = true;
      }
    }
    if (bugId && bugs?.length) {
      const bug = bugs.find((b) => b.id === bugId);
      if (bug) {
        setViewingBug(bug);
        opened = true;
      }
    }

    if (opened) {
      const next = new URLSearchParams(searchParams);
      next.delete("note");
      next.delete("task");
      next.delete("bug");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, meetingNotes, tasks, bugs, setSearchParams]);

  // Resolve member/manager IDs to user objects (memoized)
  const employeeMap = useMemo(() => {
    const map = new Map();
    employees?.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const memberUsers = useMemo(() => {
    if (!project?.memberIds?.length) return [];
    return project.memberIds.map((id) => employeeMap.get(id)).filter(Boolean);
  }, [project?.memberIds, employeeMap]);

  const managerUsers = useMemo(() => {
    if (!project?.managerIds?.length) return [];
    return project.managerIds.map((id) => employeeMap.get(id)).filter(Boolean);
  }, [project?.managerIds, employeeMap]);

  const managerIdSet = useMemo(
    () => new Set(project?.managerIds ?? []),
    [project?.managerIds]
  );
  const testerIdSet = useMemo(
    () => new Set(project?.testerIds ?? []),
    [project?.testerIds]
  );

  const handleStatusChange = async (next) => {
    if (!project || next === project.status) return;
    try {
      await patchProject(project.id, { status: next });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't update status");
    }
  };

  const handlePhaseChange = async (next) => {
    if (!project || next === project.currentPhase) return;
    try {
      await patchProject(project.id, { currentPhase: next });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't update phase");
    }
  };

  const handleAddNote = () => {
    setEditingNote(null);
    setNoteFormOpen(true);
  };

  const handleAddBug = (status = "backlog") => {
    setEditingBug(null);
    setBugDefaultStatus(status);
    setBugFormOpen(true);
  };

  const handleViewBug = (bug) => setViewingBug(bug);

  const handleEditFromBugView = () => {
    if (!viewingBug) return;
    setEditingBug(viewingBug);
    setViewingBug(null);
    setBugFormOpen(true);
  };

  const handleAddTask = (status = "todo") => {
    setEditingTask(null);
    setTaskDefaultStatus(status);
    setTaskFormOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteFormOpen(true);
  };

  const handleViewNote = (note) => setViewingNote(note);

  const handleEditFromNoteView = () => {
    if (!viewingNote) return;
    setEditingNote(viewingNote);
    setViewingNote(null);
    setNoteFormOpen(true);
  };

  const handleDeleteFromNoteView = () => {
    if (!viewingNote) return;
    setNoteToDelete(viewingNote);
    setViewingNote(null);
  };

  const handleAddModule = () => {
    setEditingModule(null);
    setModuleFormOpen(true);
  };

  const handleViewModule = (m) => setViewingModule(m);

  const handleEditFromModuleView = (m) => {
    setEditingModule(m);
    setViewingModule(null);
    setModuleFormOpen(true);
  };

  const handleDeleteFromModuleView = (m) => {
    setModuleToDelete(m);
    setViewingModule(null);
  };

  const handleConfirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    try {
      setDeletingModule(true);
      await deleteModule(moduleToDelete.id);
      toast.success("Module deleted");
      setModuleToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't delete module");
    } finally {
      setDeletingModule(false);
    }
  };

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      setDeletingNote(true);
      await deleteMeetingNote(
        project.id,
        noteToDelete.id,
        noteToDelete.attachments || []
      );
      toast.success("Meeting note deleted");
      setNoteToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't delete note");
    } finally {
      setDeletingNote(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
      setDeleting(true);
      const result = await deleteProject(project.id);
      const failures = result?.syncFailures ?? [];
      if (failures.length > 0) {
        toast.warning(
          `Project deleted, but ${failures.length} member${failures.length === 1 ? "" : "s"} couldn't be cleaned up`
        );
      } else {
        toast.success("Project deleted");
      }
      navigate("/projects", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Couldn't delete project");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  /* ---------------- Loading state ---------------- */
  if (loading) {
    return (
      <div className="flex flex-col gap-xl">
        <div className="flex flex-col gap-sm">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
          <Skeleton className="lg:col-span-8 h-64 rounded-lg" />
          <Skeleton className="lg:col-span-4 h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  /* ---------------- Not found / error ---------------- */
  if (!project) {
    return (
      <div className="flex flex-col gap-xl">
        <Link
          to="/projects"
          className="inline-flex items-center gap-xs text-bodySm text-fg-muted hover:text-fg transition-colors duration-fast w-max"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to projects
        </Link>
        <EmptyState
          icon={FolderKanban}
          title={error ? "Couldn't load project" : "Project not found"}
          description={
            error
              ? error.message || "Something went wrong while loading."
              : "This project may have been deleted, or you don't have access to it."
          }
          action={
            <Link
              to="/projects"
              className="inline-flex items-center gap-xs h-control px-lg rounded-md bg-accent text-accent-fg text-body font-medium hover:bg-accent-hover transition-colors duration-fast"
            >
              All projects
            </Link>
          }
        />
      </div>
    );
  }

  /* ---------------- Loaded ---------------- */
  const status = (project.status || "active").toLowerCase();
  const phase = (project.currentPhase || "pitch").toLowerCase();
  const memberCount = project.memberIds?.length ?? 0;
  const managerCount = project.managerIds?.length ?? 0;
  const bugCount = bugs.filter((b) => b.status !== "done").length;
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="flex flex-col gap-xl">
      {/* ---------- Hero / header ---------- */}
      <div className="relative">
        <div className="relative flex flex-col gap-md">
          {/* Breadcrumb */}
          <Link
            to="/projects"
            className="inline-flex items-center gap-xs text-bodySm text-fg-muted hover:text-fg transition-colors duration-fast w-max"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>

          {/* Title row */}
          <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 flex flex-col gap-sm">
              <h1 className="text-display text-fg leading-none truncate">
                {project.name || "Untitled"}
              </h1>

              {/* Inline pills + meta */}
              <div className="flex flex-wrap items-center gap-sm">
                <InlinePill
                  value={status}
                  options={STATUS_OPTIONS}
                  configMap={STATUS_CONFIG}
                  onChange={handleStatusChange}
                  leadingDot
                  disabled={!canManage}
                />
                <InlinePill
                  value={phase}
                  options={PHASE_OPTIONS}
                  labels={PHASE_LABELS}
                  configMap={{}}
                  onChange={handlePhaseChange}
                  disabled={!canManage}
                  className="[&>select]:bg-accent-soft [&>select]:text-accent [&>select]:border-accent-200"
                />
                {project.clientName && (
                  <span className="text-caption text-fg-subtle">
                    · for <span className="text-fg-muted font-medium">{project.clientName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Project actions — admin/manager. Hidden for employees. */}
            {canManage && (
              <div className="flex items-center gap-sm shrink-0">
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
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Phase track ---------- */}
      <Card padded={false}>
        <div className="px-xl py-lg">
          <ProjectPhaseBar currentPhase={phase} />
        </div>
      </Card>

      {/* ---------- Task board (full width) ---------- */}
      <Card
        padded={false}
        header={
          <>
            <div>
              <h2 className="text-section text-fg">Tasks</h2>
              {!tasksLoading && tasks.length > 0 && (
                <p className="text-caption text-fg-subtle mt-[2px]">
                  {openTaskCount} open · {tasks.length - openTaskCount} done
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={Plus}
              onClick={() => handleAddTask("todo")}
            >
              Add task
            </Button>
          </>
        }
      >
        <div className="px-md py-md min-w-0">
          {tasksLoading ? (
            <div className="flex gap-md overflow-x-auto">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-[300px] rounded-lg shrink-0" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-md">
              <EmptyState
                icon={ListChecks}
                title="No tasks yet"
                action={
                  <Button leadingIcon={Plus} onClick={() => handleAddTask("todo")}>
                    Add the first task
                  </Button>
                }
              />
            </div>
          ) : (
            <TaskBoard
              projectId={project.id}
              tasks={tasks}
              members={memberUsers}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
            />
          )}
        </div>
      </Card>

      {/* ---------- Modules (full width) ---------- */}
      <Card
        padded={false}
        header={
          <>
            <div>
              <h2 className="text-section text-fg">Modules</h2>
              {!modulesLoading && modules.length > 0 && (
                <p className="text-caption text-fg-subtle mt-[2px]">
                  {modules.filter((m) => m.status !== "completed").length} active ·{" "}
                  {modules.filter((m) => m.status === "completed").length} completed
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={Plus}
              onClick={handleAddModule}
            >
              Add module
            </Button>
          </>
        }
      >
        <div className="px-md py-md min-w-0">
          {modulesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="py-md">
              <EmptyState
                icon={Layers}
                title="No modules yet"
                description="Modules track who built what and trigger a QA bug ticket on completion."
                action={
                  <Button leadingIcon={Plus} onClick={handleAddModule}>
                    Add the first module
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {modules.map((m) => (
                <ModuleCard
                  key={m.id}
                  module={m}
                  onOpen={handleViewModule}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ---------- Bug board (full width) ---------- */}
      <Card
        padded={false}
        header={
          <>
            <div>
              <h2 className="text-section text-fg">Bugs</h2>
              {!bugsLoading && bugs.length > 0 && (
                <p className="text-caption text-fg-subtle mt-[2px]">
                  {bugs.length} {bugs.length === 1 ? "bug" : "bugs"} on the board
                </p>
              )}
            </div>
            <div className="flex items-center gap-sm">
              <Link
                to={`${projectPath(project)}/bugs`}
                className="inline-flex items-center gap-xs h-controlSm px-md rounded-md
                  border border-line bg-surface text-bodySm text-fg-muted
                  hover:bg-subtle hover:text-fg hover:border-line-strong
                  transition-colors duration-fast"
                title="Open the focused bugs-only board"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Focus mode
              </Link>
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={Plus}
                onClick={() => handleAddBug("backlog")}
              >
                Add bug
              </Button>
            </div>
          </>
        }
      >
        <div className="px-md py-md min-w-0">
          {bugsLoading ? (
            <div className="flex gap-md overflow-x-auto">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-[300px] rounded-lg shrink-0" />
              ))}
            </div>
          ) : bugs.length === 0 ? (
            <div className="py-md">
              <EmptyState
                icon={Bug}
                title="No bugs filed yet"
                action={
                  <Button leadingIcon={Plus} onClick={() => handleAddBug("backlog")}>
                    File the first bug
                  </Button>
                }
              />
            </div>
          ) : (
            <BugBoard
              projectId={project.id}
              bugs={bugs}
              members={memberUsers}
              onAddBug={handleAddBug}
              onEditBug={handleViewBug}
            />
          )}
        </div>
      </Card>

      {/* ---------- Body ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* === Main column === */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Description */}
          <Card
            padded={false}
            header={<h2 className="text-section text-fg">Description</h2>}
          >
            <div className="px-lg py-md">
              {project.description ? (
                <p className="text-body text-fg whitespace-pre-line leading-relaxed">
                  {project.description}
                </p>
              ) : (
                <p className="text-bodySm text-fg-subtle italic">
                  No description yet.{" "}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="text-accent hover:text-accent-hover transition-colors duration-fast"
                    >
                      Add one →
                    </button>
                  )}
                </p>
              )}
            </div>
          </Card>

          {/* Team */}
          <Card
            padded={false}
            header={
              <>
                <div>
                  <h2 className="text-section text-fg">Team</h2>
                  {memberCount > 0 && (
                    <p className="text-caption text-fg-subtle mt-[2px]">
                      {memberCount} {memberCount === 1 ? "person" : "people"} on this project
                    </p>
                  )}
                </div>
                {canManage && memberCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast"
                  >
                    Manage
                  </button>
                )}
              </>
            }
          >
            {employeesLoading && memberCount > 0 ? (
              <div className="px-md py-sm flex flex-col gap-xs">
                {Array.from({ length: Math.min(memberCount, 4) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-md px-md py-sm">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 flex flex-col gap-xs">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : memberCount === 0 ? (
              <div className="px-lg py-xl">
                <EmptyState
                  icon={Users}
                  title="No team members assigned"
                  action={
                    canManage ? (
                      <Button onClick={() => setEditOpen(true)}>
                        Assign team
                      </Button>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xs px-sm py-sm">
                {memberUsers.map((u) => (
                  <MemberTile
                    key={u.id}
                    user={u}
                    isManager={managerIdSet.has(u.id)}
                    isTester={testerIdSet.has(u.id)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Meeting notes — its own module */}
          <Card
            padded={false}
            header={
              <>
                <div>
                  <h2 className="text-section text-fg">Meeting notes</h2>
                  {meetingNotes.length > 0 && (
                    <p className="text-caption text-fg-subtle mt-[2px]">
                      {meetingNotes.length} {meetingNotes.length === 1 ? "entry" : "entries"}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  leadingIcon={Plus}
                  onClick={handleAddNote}
                >
                  Add note
                </Button>
              </>
            }
          >
            <div className="px-lg py-md">
              {notesLoading ? (
                <div className="flex flex-col gap-sm">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-xs">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : meetingNotes.length === 0 ? (
                <div className="py-lg">
                  <EmptyState
                    icon={StickyNote}
                    title="No meeting notes yet"
                    action={
                      <Button leadingIcon={Plus} onClick={handleAddNote}>
                        Add the first note
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="flex flex-col gap-md">
                  {meetingNotes.map((note) => {
                    const author = employeeMap.get(note.createdById) || null;
                    const isAuthor = note.createdById === userUid;
                    return (
                      <li key={note.id}>
                        <MeetingNoteCard
                          note={note}
                          members={memberUsers}
                          authorUser={author}
                          canEdit={canManage || isAuthor}
                          canDelete={canManage || isAuthor}
                          onEdit={() => handleEditNote(note)}
                          onDelete={() => setNoteToDelete(note)}
                          onView={() => handleViewNote(note)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* === Right rail === */}
        <aside className="lg:col-span-4 flex flex-col gap-lg lg:sticky lg:top-xl lg:self-start">
          {/* Details panel */}
          <Card
            padded={false}
            header={
              <div>
                <h2 className="text-section text-fg">Details</h2>
              </div>
            }
          >
            <div className="px-lg py-sm divide-y divide-line-subtle">
              <DetailRow label="Status">
                <span className="inline-flex items-center gap-xs capitalize">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[status]?.dot ?? "bg-fg-subtle"}`} />
                  {STATUS_CONFIG[status]?.label ?? status}
                </span>
              </DetailRow>
              <DetailRow label="Phase">
                <span className="capitalize">{PHASE_LABELS[phase] ?? phase}</span>
              </DetailRow>
              <DetailRow label="Client">
                {project.clientName || <span className="text-fg-subtle">—</span>}
              </DetailRow>
              <DetailRow label="Members">
                <span className="inline-flex items-center gap-xs">
                  <Users className="h-3.5 w-3.5 text-fg-subtle" />
                  <span className="tabular-nums">{memberCount}</span>
                </span>
              </DetailRow>
              <DetailRow label="Open tasks">
                <span className="inline-flex items-center gap-xs">
                  <ListChecks className={`h-3.5 w-3.5 ${openTaskCount > 0 ? "text-accent" : "text-fg-subtle"}`} />
                  <span className="tabular-nums">{tasksLoading ? "—" : openTaskCount}</span>
                </span>
              </DetailRow>
              <DetailRow label="Active bugs">
                <span className="inline-flex items-center gap-xs">
                  <Bug className={`h-3.5 w-3.5 ${bugCount > 0 ? "text-error" : "text-fg-subtle"}`} />
                  <span className="tabular-nums">{bugCount}</span>
                </span>
              </DetailRow>
              <DetailRow label="Meeting notes">
                <span className="inline-flex items-center gap-xs">
                  <StickyNote className={`h-3.5 w-3.5 ${meetingNotes.length > 0 ? "text-accent" : "text-fg-subtle"}`} />
                  <span className="tabular-nums">{notesLoading ? "—" : meetingNotes.length}</span>
                </span>
              </DetailRow>
              <DetailRow label="Created">
                <span className="inline-flex items-center gap-xs">
                  <Calendar className="h-3.5 w-3.5 text-fg-subtle" />
                  {formatDate(project.createdAt)}
                </span>
              </DetailRow>
              {project.updatedAt && (
                <DetailRow label="Updated">
                  <span className="inline-flex items-center gap-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-fg-subtle" />
                    {formatRelative(project.updatedAt) ?? formatDate(project.updatedAt)}
                  </span>
                </DetailRow>
              )}
            </div>
          </Card>

          {/* Project leads */}
          <Card
            padded={false}
            header={
              <div>
                <h2 className="text-section text-fg">Leads</h2>
                {managerCount > 0 && (
                  <p className="text-caption text-fg-subtle mt-[2px]">
                    {managerCount} project {managerCount === 1 ? "manager" : "managers"}
                  </p>
                )}
              </div>
            }
          >
            {managerCount === 0 ? (
              <div className="px-lg py-md">
                <p className="text-bodySm text-fg-subtle">
                  No managers assigned yet.
                </p>
              </div>
            ) : employeesLoading ? (
              <div className="flex flex-col gap-xs px-md py-sm">
                {Array.from({ length: managerCount }).map((_, i) => (
                  <div key={i} className="flex items-center gap-md px-md py-sm">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <ul className="px-sm py-sm flex flex-col gap-xs">
                {managerUsers.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-md px-md py-sm rounded-md hover:bg-subtle/60 transition-colors duration-fast"
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center text-caption font-semibold overflow-hidden">
                      {u.avatar ? (
                        <img src={`/images/${u.avatar}`} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        initials(u.name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-bodySm text-fg font-medium capitalize truncate">
                        {u.name}
                      </p>
                      {u.email && (
                        <p className="text-caption text-fg-subtle truncate">
                          {u.email}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {/* Modals */}
      <ProjectFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
      />
      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete project"
        description={`Delete ${project.name || "this project"}? This action cannot be undone — it will be removed from every assigned member.`}
        confirmLabel="Delete project"
      />

      <MeetingNoteFormModal
        isOpen={noteFormOpen}
        onClose={() => {
          setNoteFormOpen(false);
          setEditingNote(null);
        }}
        projectId={project.id}
        members={memberUsers}
        note={editingNote}
      />

      <BugFormModal
        isOpen={bugFormOpen}
        onClose={() => {
          setBugFormOpen(false);
          setEditingBug(null);
        }}
        projectId={project.id}
        members={memberUsers}
        bug={editingBug}
        defaultStatus={bugDefaultStatus}
      />

      <TaskFormModal
        isOpen={taskFormOpen}
        onClose={() => {
          setTaskFormOpen(false);
          setEditingTask(null);
        }}
        projectId={project.id}
        members={memberUsers}
        task={editingTask}
        defaultStatus={taskDefaultStatus}
      />
      <ConfirmDeleteModal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleConfirmDeleteNote}
        loading={deletingNote}
        title="Delete meeting note"
        description={
          noteToDelete
            ? `Delete "${noteToDelete.title || "this note"}"? Any attached files will also be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete note"
      />

      {/* Read-only view modals — opened on card click. Clicking Edit
          inside hands off to the corresponding form modal above. */}
      <BugViewModal
        isOpen={!!viewingBug}
        onClose={() => setViewingBug(null)}
        bug={viewingBug}
        members={memberUsers}
        projectId={project.id}
        canEdit={isAdmin}
        onEdit={handleEditFromBugView}
      />

      <MeetingNoteViewModal
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        note={viewingNote}
        members={memberUsers}
        authorUser={
          viewingNote ? employeeMap.get(viewingNote.createdById) || null : null
        }
        projectId={project.id}
        canEdit={
          canManage || (viewingNote && viewingNote.createdById === userUid)
        }
        canDelete={
          canManage || (viewingNote && viewingNote.createdById === userUid)
        }
        onEdit={handleEditFromNoteView}
        onDelete={handleDeleteFromNoteView}
      />

      <ModuleFormModal
        isOpen={moduleFormOpen}
        onClose={() => {
          setModuleFormOpen(false);
          setEditingModule(null);
        }}
        projectId={project.id}
        module={editingModule}
        members={memberUsers}
        currentUserId={userUid}
      />

      <ModuleViewModal
        isOpen={!!viewingModule}
        onClose={() => setViewingModule(null)}
        moduleId={viewingModule?.id}
        onEdit={handleEditFromModuleView}
        onDelete={handleDeleteFromModuleView}
      />

      <ConfirmDeleteModal
        isOpen={!!moduleToDelete}
        onClose={() => setModuleToDelete(null)}
        onConfirm={handleConfirmDeleteModule}
        loading={deletingModule}
        title="Delete module"
        description={
          moduleToDelete
            ? `“${moduleToDelete.title}” will be permanently removed along with its history.`
            : ""
        }
        confirmLabel="Delete module"
      />
    </div>
  );
};

export default ProjectDetails;
