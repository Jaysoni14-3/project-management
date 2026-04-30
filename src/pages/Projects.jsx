import React, { useMemo, useState } from 'react'
import { useProjects } from '../hooks/useProjects';
import Button from '../components/ui/Button';
import { BiPlus } from 'react-icons/bi';
import ProjectFormModal from '../features/projects/ProjectFormModal';
import ProjectCard from '../features/projects/components/ProjectCard';

const Projects = () => {
  const [isProjectModalOpen, setProjectModalOpen] = useState(false)

  const { projects } = useProjects()

   // get all projects names from project id Globally and pass it as props 
   const projectsNameMap = useMemo(() => {
    if (!projects || projects.length === 0) return {};
  
    const map = {};
    projects.forEach((project) => {
      map[project.id] = project.name; // or project.projectName if that's your field
    });
  
    return map;
  }, [projects]);

  return (
    <>
      {/* Project cards */}
      <div className='projects-section border rounded-sm'>
        <div className="section-header flex items-center justify-between shadow-card p-md py-md">
          <h2 className='text-text-primary text-page font-medium'>Projects</h2>
          <Button type="button" onClick={() => setProjectModalOpen(true)} className='flex items-center justify-center g-xs w-max px-sm'><BiPlus />Add New</Button>
        </div>
        <div className="section-body project-listing grid grid-cols-3 gap-lg p-md">
          {projects.length > 0 ? (
            <ProjectCard projects={projects} />
          ) : (
            <p className="text-gray-500 col-span-3 text-center py-8">No projects found. Create your first project!</p>
          )}
        </div>
      </div>


      <ProjectFormModal isOpen={isProjectModalOpen} onClose={() => setProjectModalOpen(false)} />
    </>
  )
}

export default Projects