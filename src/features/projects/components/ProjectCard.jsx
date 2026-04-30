import React, { useState } from "react";
import { toast } from "react-toastify";
import { Users, FileText, Bug } from "lucide-react";

import EditButton from "../../../components/ui/EditButton";
import DeleteButton from "../../../components/ui/DeleteButton";
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal";

import ProjectPhaseBar from "./ProjectPhaseBar";
import ProjectFormModal from "../ProjectFormModal";
import { deleteProject } from "../../../services/project.service";
import useManagers from "../../../hooks/useManagers";

const statusToken = {
  active:    "bg-success-50 text-success-700 border-success-200",
  completed: "bg-subtle text-fg-muted border-line",
  paused:    "bg-warning-50 text-warning-700 border-warning-200",
  archived:  "bg-subtle text-fg-subtle border-line",
};

const Meta = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-xs min-w-0">
    {Icon && <Icon className="h-3.5 w-3.5 text-fg-subtle shrink-0" aria-hidden />}
    <span className="text-caption text-fg-subtle">{label}:</span>
    <span className="text-caption text-fg-muted truncate">{value}</span>
  </div>
);

const ProjectCard = ({ projects }) => {
  const { managers } = useManagers();
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const managerMap = managers.reduce((acc, m) => ({ ...acc, [m.id]: m.name }), {});

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      setDeleteLoading(true);
      const result = await deleteProject(projectToDelete.id);
      const failures = result?.syncFailures ?? [];
      if (failures.length > 0) {
        toast.warning(
          `Project deleted, but ${failures.length} member${failures.length === 1 ? "" : "s"} couldn't be cleaned up: ${failures[0].reason}`,
          { autoClose: 6000 }
        );
      } else {
        toast.success("Project deleted");
      }
      setProjectToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to delete project");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {projects.map((project) => {
        const status = (project.status || "active").toLowerCase();
        const managerNames = project.managerIds?.length
          ? project.managerIds
              .map((id) => managerMap[id])
              .filter(Boolean)
              .join(", ")
          : "Unassigned";
        const memberCount = project.memberIds?.length ?? 0;

        return (
          <article
            key={project.id}
            className="group relative bg-surface border border-line rounded-lg p-lg
              transition-[border-color,box-shadow,transform] duration-fast
              hover:border-line-strong hover:shadow-md flex flex-col gap-md"
          >
            {/* Hover actions */}
            <div className="absolute top-md right-md flex items-center gap-xs
              opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
              <EditButton
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProject(project);
                }}
              />
              <DeleteButton
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectToDelete(project);
                }}
              />
            </div>

            {/* Header */}
            <header className="flex items-start justify-between gap-md pr-xl">
              <h3 className="text-section text-fg truncate">
                {project.name || project.projectName || "Untitled"}
              </h3>
              <span
                className={`shrink-0 text-caption font-medium px-sm py-[2px] rounded-xs border capitalize ${
                  statusToken[status] ?? statusToken.archived
                }`}
              >
                {status}
              </span>
            </header>

            {/* Description */}
            {project.description && (
              <p className="text-bodySm text-fg-muted line-clamp-2">
                {project.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-col gap-xs">
              {project.clientName && (
                <Meta label="Client" value={project.clientName} />
              )}
              <Meta label="Manager" value={managerNames} />
              <Meta
                icon={Users}
                label="Team"
                value={
                  memberCount === 0
                    ? "No one assigned"
                    : `${memberCount} member${memberCount === 1 ? "" : "s"}`
                }
              />
              {(project.meetingNotes || project.activeBugs != null) && (
                <div className="flex items-center gap-lg flex-wrap">
                  {project.meetingNotes && (
                    <Meta
                      icon={FileText}
                      label="Notes"
                      value={project.meetingNotes}
                    />
                  )}
                  {project.activeBugs != null && (
                    <Meta
                      icon={Bug}
                      label="Bugs"
                      value={project.activeBugs}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Phase progress */}
            <div className="pt-md mt-auto border-t border-line-subtle">
              <ProjectPhaseBar currentPhase={project.currentPhase} />
            </div>
          </article>
        );
      })}

      <ProjectFormModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
      />
      <ConfirmDeleteModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
        loading={deleteLoading}
      />
    </>
  );
};

export default ProjectCard;
