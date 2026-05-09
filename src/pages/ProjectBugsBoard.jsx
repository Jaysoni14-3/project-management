import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bug, FolderKanban, Plus } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

import BugBoard from "../features/bugs/BugBoard";
import BugFormModal from "../features/bugs/BugFormModal";
import BugViewModal from "../features/bugs/BugViewModal";

import useProject from "../hooks/useProject";
import { useProjects } from "../hooks/useProjects";
import useBugs from "../hooks/useBugs";
import useEmployees from "../hooks/useEmployee";

import { useAuth } from "../context/AuthContext";
import { resolveProjectFromUrlParam, projectPath } from "../lib/slug";

/* Focus-mode page — just the bug kanban for a single project, nothing else.
   Linked from the bugs section on ProjectDetails and deep-linkable as
   /projects/:projectSlug/bugs. Mirrors the BugBoard wiring in ProjectDetails
   (add / view / edit modals, drag-to-status) without the surrounding tabs,
   stats, meeting notes, or task board. */
const ProjectBugsBoard = () => {
  const { projectSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const { projects, loading: projectsLoading } = useProjects();
  const resolved = useMemo(
    () => resolveProjectFromUrlParam(projectSlug, projects),
    [projectSlug, projects]
  );
  const projectId = resolved?.id || null;

  const { project: liveProject, loading: liveLoading, error } = useProject(projectId);
  const project = liveProject || resolved;
  const loading = projectsLoading || (!!projectId && liveLoading);

  const { employees } = useEmployees();
  const { bugs, loading: bugsLoading } = useBugs(projectId);

  const employeeMap = useMemo(() => {
    const map = new Map();
    employees?.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const memberUsers = useMemo(() => {
    if (!project?.memberIds?.length) return [];
    return project.memberIds
      .map((id) => employeeMap.get(id))
      .filter(Boolean);
  }, [project?.memberIds, employeeMap]);

  const [bugFormOpen, setBugFormOpen] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [bugDefaultStatus, setBugDefaultStatus] = useState("backlog");
  const [viewingBug, setViewingBug] = useState(null);

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

  /* Deep-link auto-open: `?bug=<id>` opens the view modal once the
     bug list resolves. URL is cleaned after opening so refresh +
     back-button stay clean. */
  useEffect(() => {
    const bugId = searchParams.get("bug");
    if (!bugId || !bugs?.length) return;
    const bug = bugs.find((b) => b.id === bugId);
    if (!bug) return;
    setViewingBug(bug);
    const next = new URLSearchParams(searchParams);
    next.delete("bug");
    setSearchParams(next, { replace: true });
  }, [searchParams, bugs, setSearchParams]);

  /* ---------------- Loading state ---------------- */
  if (loading) {
    return (
      <div className="flex flex-col gap-xl">
        <div className="flex flex-col gap-sm">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-md overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-[300px] rounded-lg shrink-0" />
          ))}
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
              : "The project you're looking for doesn't exist or has been removed."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <Link
        to={projectPath(project)}
        className="inline-flex items-center gap-xs text-bodySm text-fg-muted hover:text-fg transition-colors duration-fast w-max"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {project.name || "project"}
      </Link>

      <PageHeader
        eyebrow={project.name || "Project"}
        title="Bug board"
        actions={
          <Button
            leadingIcon={Plus}
            onClick={() => handleAddBug("backlog")}
          >
            Add bug
          </Button>
        }
      />

      <Card padded={false}>
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

      <BugViewModal
        isOpen={!!viewingBug}
        onClose={() => setViewingBug(null)}
        bug={viewingBug}
        members={memberUsers}
        projectId={project.id}
        canEdit={isAdmin}
        onEdit={handleEditFromBugView}
      />
    </div>
  );
};

export default ProjectBugsBoard;
