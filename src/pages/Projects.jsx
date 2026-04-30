import React, { useMemo, useState } from "react";
import { Plus, FolderKanban } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";

import { useProjects } from "../hooks/useProjects";
import ProjectFormModal from "../features/projects/ProjectFormModal";
import ProjectCard from "../features/projects/components/ProjectCard";

const Projects = () => {
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const { projects, loading } = useProjects();

  // Project name lookup (kept in case child cards want it)
  // eslint-disable-next-line no-unused-vars
  const projectsNameMap = useMemo(() => {
    if (!projects?.length) return {};
    return projects.reduce((map, p) => ({ ...map, [p.id]: p.name }), {});
  }, [projects]);

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader
        title="Projects"
        description="Track every project across your workspace — status, team, and momentum."
        actions={
          <Button
            leadingIcon={Plus}
            onClick={() => setProjectModalOpen(true)}
          >
            New project
          </Button>
        }
      />

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
          description="Spin up your first project to start organizing work, assigning teammates, and tracking progress."
          action={
            <Button
              leadingIcon={Plus}
              onClick={() => setProjectModalOpen(true)}
            >
              Create your first project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          <ProjectCard projects={projects} />
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
