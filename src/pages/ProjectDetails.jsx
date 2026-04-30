import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

import useProject from "../hooks/useProject";
import useEmployees from "../hooks/useEmployee";
import useMeetingNotes from "../hooks/useMeetingNotes";
import { useAuth } from "../context/AuthContext";
import { patchProject, deleteProject } from "../services/project.service";
import { deleteMeetingNote } from "../services/meetingNotes.service";

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
const MemberTile = ({ user, isManager }) => (
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
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const userUid = user?.uid;

  const { project, loading, error } = useProject(projectId);
  const { employees, loading: employeesLoading } = useEmployees();
  const { notes: meetingNotes, loading: notesLoading } = useMeetingNotes(projectId);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Meeting notes module state
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deletingNote, setDeletingNote] = useState(false);

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

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteFormOpen(true);
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
  const bugCount = project.activeBugs ?? 0;

  return (
    <div className="flex flex-col gap-xl">
      {/* ---------- Hero / header ---------- */}
      <div className="relative">
        {/* Subtle accent wash to set this page apart */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-xl -top-xl h-48
            bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.08),transparent_60%)]"
        />

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
                  disabled={!isAdmin}
                />
                <InlinePill
                  value={phase}
                  options={PHASE_OPTIONS}
                  labels={PHASE_LABELS}
                  configMap={{}}
                  onChange={handlePhaseChange}
                  disabled={!isAdmin}
                  className="[&>select]:bg-accent-soft [&>select]:text-accent [&>select]:border-accent-200"
                />
                {project.clientName && (
                  <span className="text-caption text-fg-subtle">
                    · for <span className="text-fg-muted font-medium">{project.clientName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {isAdmin && (
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

      {/* ---------- Body ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        {/* === Main column === */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Description */}
          <Card
            padded={false}
            header={
              <div>
                <h2 className="text-section text-fg">Description</h2>
                <p className="text-caption text-fg-subtle mt-[2px]">
                  What this project is about
                </p>
              </div>
            }
          >
            <div className="px-lg py-md">
              {project.description ? (
                <p className="text-body text-fg whitespace-pre-line leading-relaxed">
                  {project.description}
                </p>
              ) : (
                <p className="text-bodySm text-fg-subtle italic">
                  No description yet.{" "}
                  {isAdmin && (
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
                  <p className="text-caption text-fg-subtle mt-[2px]">
                    {memberCount === 0
                      ? "No one assigned yet"
                      : `${memberCount} ${memberCount === 1 ? "person" : "people"} on this project`}
                  </p>
                </div>
                {isAdmin && memberCount > 0 && (
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
                  description="Assign teammates to this project to track who's working on what."
                  action={
                    isAdmin ? (
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
                  <p className="text-caption text-fg-subtle mt-[2px]">
                    {meetingNotes.length === 0
                      ? "Capture decisions, attendees, and files"
                      : `${meetingNotes.length} ${meetingNotes.length === 1 ? "entry" : "entries"}`}
                  </p>
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
                    description="Capture meeting recaps, decisions, attendees, and any files shared during the meeting."
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
                    const author = employeeMap.get(note.createdBy) || null;
                    const isAuthor = note.createdBy === userUid;
                    return (
                      <li key={note.id}>
                        <MeetingNoteCard
                          note={note}
                          members={memberUsers}
                          authorUser={author}
                          canEdit={isAdmin || isAuthor}
                          canDelete={isAdmin || isAuthor}
                          onEdit={() => handleEditNote(note)}
                          onDelete={() => setNoteToDelete(note)}
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
              <DetailRow label="Active bugs">
                <span className="inline-flex items-center gap-xs">
                  <Bug className={`h-3.5 w-3.5 ${bugCount > 0 ? "text-error" : "text-fg-subtle"}`} />
                  <span className="tabular-nums">{bugCount}</span>
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
                <p className="text-caption text-fg-subtle mt-[2px]">
                  {managerCount === 0
                    ? "Unassigned"
                    : `${managerCount} project ${managerCount === 1 ? "manager" : "managers"}`}
                </p>
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
    </div>
  );
};

export default ProjectDetails;
