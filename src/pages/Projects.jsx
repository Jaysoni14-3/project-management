import React, { useMemo, useState } from "react";
import { Plus, FolderKanban } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

import { useProjects } from "../hooks/useProjects";
import useBugCounts from "../hooks/useBugCounts";
import useMeetingNotesCount from "../hooks/useMeetingNotesCount";
import useTaskCounts from "../hooks/useTaskCounts";
import { useAuth } from "../context/AuthContext";
import ProjectFormModal from "../features/projects/ProjectFormModal";
import ProjectCard from "../features/projects/components/ProjectCard";

const Projects = () => {
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [scope, setScope] = useState("all"); // "all" | "mine"
  const { canManage, user } = useAuth();
  const { projects, loading } = useProjects();
  const { countsByProjectId } = useBugCounts();
  const { countsByProjectId: noteCountsByProjectId } = useMeetingNotesCount();
  const { countsByProjectId: taskCountsByProjectId } = useTaskCounts();

  /* Server returns the full project list to every authed user; the
     "Mine" tab narrows it to projects where the current user is a
     member or manager. */
  const visibleProjects = useMemo(() => {
    if (scope === "all") return projects;
    const uid = user?.uid;
    return (projects ?? []).filter(
      (p) =>
        Array.isArray(p.memberIds) && p.memberIds.includes(uid)
    );
  }, [projects, scope, user?.uid]);

  const myCount = useMemo(() => {
    const uid = user?.uid;
    return (projects ?? []).filter(
      (p) =>
        Array.isArray(p.memberIds) && p.memberIds.includes(uid)
    ).length;
  }, [projects, user?.uid]);

  const tabClass = (key) =>
    `inline-flex items-center gap-xs h-controlSm px-md rounded-sm text-bodySm transition-colors duration-fast
      ${
        scope === key
          ? "bg-accent-soft text-accent"
          : "text-fg-muted hover:text-fg hover:bg-subtle"
      }`;

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader
        title="Projects"
        actions={
          canManage && (
            <Button
              leadingIcon={Plus}
              onClick={() => setProjectModalOpen(true)}
            >
              New project
            </Button>
          )
        }
      />

      {/* Scope tabs — All / Mine. Hidden while loading so we don't
          flash an empty "Mine" count. */}
      {!loading && projects.length > 0 && (
        <div
          role="tablist"
          aria-label="Project scope"
          className="inline-flex rounded-md border border-line bg-surface p-[2px] w-max"
        >
          <button
            type="button"
            role="tab"
            aria-selected={scope === "all"}
            onClick={() => setScope("all")}
            className={tabClass("all")}
          >
            All projects
            <span className="text-caption text-fg-subtle tabular-nums">
              {projects.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === "mine"}
            onClick={() => setScope("mine")}
            className={tabClass("mine")}
          >
            My projects
            <span className="text-caption text-fg-subtle tabular-nums">
              {myCount}
            </span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-line rounded-lg p-lg flex flex-col gap-md"
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-2 w-full mt-md" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          action={
            canManage && (
              <Button
                leadingIcon={Plus}
                onClick={() => setProjectModalOpen(true)}
              >
                Create your first project
              </Button>
            )
          }
        />
      ) : visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="You're not on any projects yet"
          action={
            <Button variant="secondary" onClick={() => setScope("all")}>
              See all projects
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          <ProjectCard
            projects={visibleProjects}
            bugCountsByProjectId={countsByProjectId}
            noteCountsByProjectId={noteCountsByProjectId}
            taskCountsByProjectId={taskCountsByProjectId}
          />
        </div>
      )}

      <ProjectFormModal
        isOpen={isProjectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </div>
  );
};

export default Projects;
