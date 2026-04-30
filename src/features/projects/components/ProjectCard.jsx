import React, { useState } from 'react'
import ProjectPhaseBar from './ProjectPhaseBar'
import useManagers from '../../../hooks/useManagers'

import EditButton from '../../../components/ui/EditButton';
import DeleteButton from '../../../components/ui/DeleteButton';
import ProjectFormModal from '../ProjectFormModal';
import { deleteProject } from '../../../services/project.service';
import { toast } from 'react-toastify';
import ConfirmDeleteModal from '../../../components/ui/ConfirmDeleteModal';

const statusStyles = {
    active: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-700",
}

const ProjectCard = ({ projects }) => {
    const { managers } = useManagers();

    const [selectedProject, setSelectedProject] = useState(null)

    const [projectToDelete, setProjectToDelete] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleDeleteProject = async () => {
        if (!projectToDelete) return
      
        try {
          setDeleteLoading(true);
          await deleteProject(projectToDelete.id);
          toast.success("Project deleted successfully");
          setProjectToDelete(null);
        } catch (err) {
          console.error(err);
          toast.error("Failed to delete project");
        } finally {
          setDeleteLoading(false);
        }
    }

    const managerMap = managers.reduce((acc, manager) => {
        acc[manager.id] = manager.name
        return acc
    }, {});

    return (
        <>
            {projects.map((project) => {
                return (
                    <div
                        key={project.id}
                        className="project-card group border shadow-card py-sm px-md rounded-sm relative overflow-hidden hover:border-accent cursor-pointer hover:shadow-modal transition-all" >
                        {/* Background image layer with opacity */}
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: 'url(/images/wave-dots.jpg)',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat',
                                opacity: 0.1,
                            }}
                        />
                        <div className="relative z-10">
                            <div className="project-card-header flex items-center justify-between mb-xs">
                                <h3>{project.name || project.projectName}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusStyles[project.status] || "bg-gray-100 text-gray-700"}`}>{project.status}</span>
                            </div>

                            <hr />

                            {/* DESC */}
                            {project.description && (
                                <p className="text-sm text-gray-600 line-clamp-3 mt-sm mb-lg">
                                    {project.description}
                                </p>
                            )}

                            {/* Client Name */}
                            {project.clientName && (
                                <p className="text-sm text-gray-400">
                                    Client: <span className='text-gray-700'>{project.clientName}</span>
                                </p>
                            )}

                            {/* Manager Name */}
                            <p className="text-sm text-gray-400 mt-sm">
                                Manager: <span className='text-gray-700'>{project.managerIds?.length ? project.managerIds.map(id => managerMap[id]).filter(Boolean).join(", ") : "Not Assigned Yet"}</span>
                            </p>

                             {/* Assigned to */}
                             <p className="text-sm text-gray-400 mt-sm">
                                Assigned to: <span className='text-gray-700'>{project.memberIds?.length ? `${project.memberIds.length} members`  : "Not Assigned to Anyone Yet"}</span>
                            </p>


                            {/* Meeting Notes and bugs */}
                            <div className="flex flex-row gap-4 mt-sm mb-lg">
                                <p className="text-sm text-gray-400">
                                    Notes: <span className='text-gray-700'>{project.meetingNotes}</span>
                                </p>

                                <p className="text-sm text-gray-400 ">
                                    Bugs: <span className='text-gray-700'>{project.activeBugs}</span>
                                </p>
                            </div>

                            {/* PHASE */}
                            <ProjectPhaseBar currentPhase={project.currentPhase} />
                        </div>
                        <div className="action-buttons absolute top-2 right-2 z-20 rounded-md bg-white p-2 gap-2 flex opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200">
                            <EditButton
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedProject(project)
                                }}
                            />
                            <DeleteButton
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setProjectToDelete(project);
                                  }}
                            />
                        </div>
                    </div>
                )
            })}
            <ProjectFormModal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} project={selectedProject} />
            <ConfirmDeleteModal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDeleteProject} loading={deleteLoading} />
        </>
    )
}

export default ProjectCard