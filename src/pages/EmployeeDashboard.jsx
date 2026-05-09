import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FolderKanban,
  Bug,
  StickyNote,
  TrendingUp,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/Dashboard/StatCard";

import { useAuth } from "../context/AuthContext";
import { projectPath } from "../lib/slug";
import { useProjects } from "../hooks/useProjects";
import useEmployees from "../hooks/useEmployee";
import useRecentMeetingNotes from "../hooks/useRecentMeetingNotes";
import useRecentBugs from "../hooks/useRecentBugs";
import useBugCounts from "../hooks/useBugCounts";
import useMeetingNotesCount from "../hooks/useMeetingNotesCount";

import RecentBugsPanel from "../features/bugs/components/RecentBugsPanel";

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

const projectStatusChip = {
  active:    "bg-success-50 text-success-700",
  completed: "bg-accent-soft text-accent",
  paused:    "bg-warning-50 text-warning-700",
  archived:  "bg-subtle text-fg-subtle",
};

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

/* ============================================================
   My projects list
============================================================ */
const MyProjectsPanel = ({ projects, loading, bugCountsByProject }) => {
  if (loading) {
    return (
      <Card
        padded={false}
        header={
          <div>
            <h2 className="text-section text-fg">My projects</h2>
            <p className="text-caption text-fg-subtle mt-[2px]">
              Projects you're assigned to
            </p>
          </div>
        }
      >
        <ul className="divide-y divide-line-subtle">
          {Array.from({ length: 3 }).map((_, i) => (
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
      </Card>
    );
  }

  return (
    <Card
      padded={false}
      header={
        <>
          <div>
            <h2 className="text-section text-fg">My projects</h2>
            <p className="text-caption text-fg-subtle mt-[2px]">
              {projects.length === 0
                ? "Nothing assigned yet"
                : `${projects.length} ${projects.length === 1 ? "project" : "projects"} on your plate`}
            </p>
          </div>
          {projects.length > 0 && (
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
      {projects.length === 0 ? (
        <div className="px-lg py-lg">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Once an admin assigns you to a project, it will show up here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {projects.map((project) => {
            const status = (project.status || "active").toLowerCase();
            const memberCount = project.memberIds?.length ?? 0;
            const openBugs = bugCountsByProject?.[project.id] ?? 0;
            return (
              <li key={project.id}>
                <Link
                  to={projectPath(project)}
                  className="group flex items-center gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
                >
                  <div className="h-8 w-8 rounded-md bg-accent-soft text-accent flex items-center justify-center shrink-0">
                    <FolderKanban className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-fg font-medium truncate">
                      {project.name || "Untitled"}
                    </p>
                    <p className="text-caption text-fg-subtle truncate">
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                      {openBugs > 0 && (
                        <>
                          {" · "}
                          <span className="text-error-700">
                            {openBugs} open {openBugs === 1 ? "bug" : "bugs"}
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
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

/* ============================================================
   Meeting notes for my projects
============================================================ */
const MyMeetingNotesPanel = ({ notes, loading, error, projects, employees }) => {
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
            <p className="font-medium mb-xs">Couldn't load meeting notes</p>
            <p className="text-bodySm">
              {error.code || error.message || "Unknown error"}
            </p>
          </div>
        </div>
      ) : loading ? (
        <ul className="divide-y divide-line-subtle">
          {Array.from({ length: 3 }).map((_, i) => (
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
            description="When meetings are captured against your projects, they'll appear here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {notes.map((note) => {
            const project = note.projectId ? projectMap.get(note.projectId) : null;
            const author = employeeMap.get(note.createdById);
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
                        <span className="text-fg-muted">{project.name}</span>
                      ) : (
                        <span>Project · unknown</span>
                      )}
                      {" · "}
                      {author?.name || note.createdByName || "Unknown"}
                      {" · "}
                      {formatNoteRelative(note.createdAt)}
                    </p>
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
   Page
============================================================ */
const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();
  const { employees } = useEmployees();
  const { notes: allRecentNotes, loading: notesLoading, error: notesError } =
    useRecentMeetingNotes(20);
  const { bugs: allRecentBugs, loading: bugsLoading, error: bugsError } =
    useRecentBugs(20);
  const { countsByProjectId: bugsByProject, loading: bugCountsLoading } =
    useBugCounts();
  const { countsByProjectId: notesByProject, loading: notesCountLoading } =
    useMeetingNotesCount();

  /* Project list now comes back unfiltered from the API, so the
     "my projects" scope is computed client-side here using
     project.memberIds against the auth user. */
  const myProjects = useMemo(
    () =>
      (projects ?? []).filter((p) =>
        Array.isArray(p.memberIds) && p.memberIds.includes(user?.uid)
      ),
    [projects, user?.uid]
  );
  const myProjectIds = useMemo(
    () => new Set(myProjects.map((p) => p.id)),
    [myProjects]
  );

  const myOpenBugs = useMemo(() => {
    let total = 0;
    myProjectIds.forEach((id) => {
      total += bugsByProject?.[id] ?? 0;
    });
    return total;
  }, [myProjectIds, bugsByProject]);

  const myMeetingNotes = useMemo(() => {
    let total = 0;
    myProjectIds.forEach((id) => {
      total += notesByProject?.[id] ?? 0;
    });
    return total;
  }, [myProjectIds, notesByProject]);

  const myRecentNotes = useMemo(
    () => allRecentNotes.filter((n) => n.projectId && myProjectIds.has(n.projectId)).slice(0, 6),
    [allRecentNotes, myProjectIds]
  );

  const myRecentBugs = useMemo(
    () => allRecentBugs.filter((b) => b.projectId && myProjectIds.has(b.projectId)).slice(0, 6),
    [allRecentBugs, myProjectIds]
  );

  const activeCount = useMemo(
    () =>
      myProjects.filter(
        (p) => (p.status || "active").toLowerCase() === "active"
      ).length,
    [myProjects]
  );

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader
        eyebrow={formatDate()}
        title={`Welcome back, ${greetingName(user?.email)}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard
          label="My projects"
          value={projects?.length ?? 0}
          icon={FolderKanban}
          variant="accent"
          loading={projectsLoading}
        />
        <StatCard
          label="Active projects"
          value={activeCount}
          icon={TrendingUp}
          variant="success"
          loading={projectsLoading}
        />
        <StatCard
          label="My open bugs"
          value={myOpenBugs}
          icon={Bug}
          variant="danger"
          loading={projectsLoading || bugCountsLoading}
        />
        <StatCard
          label="Meeting notes"
          value={myMeetingNotes}
          icon={StickyNote}
          variant="default"
          loading={projectsLoading || notesCountLoading}
        />
      </div>

      <MyProjectsPanel
        projects={myProjects}
        loading={projectsLoading}
        bugCountsByProject={bugsByProject}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-6">
          <MyMeetingNotesPanel
            notes={myRecentNotes}
            loading={notesLoading || projectsLoading}
            error={notesError}
            projects={projects}
            employees={employees}
          />
        </div>
        <div className="lg:col-span-6">
          <RecentBugsPanel
            bugs={myRecentBugs}
            loading={bugsLoading || projectsLoading}
            error={bugsError}
            projects={projects}
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
