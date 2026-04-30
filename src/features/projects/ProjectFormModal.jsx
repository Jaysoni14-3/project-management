import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-toastify';
import { createProject, updateProject } from '../../services/project.service';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
// import useManagers from '../../hooks/useManagers';

import Select from "react-select"
import useEmployees from '../../hooks/useEmployee';

const ProjectFormModal = ({ isOpen, onClose, project }) => {
    // Checks if ther is a project passed and if yes then edit mode or Create a new project
    const isEditMode = Boolean(project);

    const { user } = useAuth();

    const [name, setName] = useState("");
    const [clientName, setClientName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("active");
    // active bugs set 0 initially
    const [activeBugs, setActiveBugs] = useState(0);
    // meeting notes set 0 initially
    const [meetingNotes, setMeetingNotes] = useState(0);
    const [currentPhase, setCurrentPhase] = useState("pitch");
    const [addProjectLoading, setAddProjectLoading] = useState(false);

    const [selectedManagers, setSelectedManagers] = useState([])
    const [selectedEmployees, setSelectedEmployees] = useState([])

    // const { managers, loading } = useManagers()

    const { employees, loading: employeesLoading } = useEmployees();

    // const managerOptions = selectedEmployees.map(emp => ({
    //     value: emp.value,
    //     label: emp.label,
    // }));
      
    const employeeOptions = employees.map(emp => ({
        value: emp.id,
        label: emp.id === user.uid ? `${emp.name} (You)` : emp.name,
    }));

    const managerOptions = employees
    .filter(emp => emp.isManager)
    .map(emp => ({
      value: emp.id,
      label: emp.name,
    }));
  


    // Auto remove manager when employee is removed 
    useEffect(() => {
        setSelectedManagers(prev =>
          prev.filter(manager =>
            selectedEmployees.some(emp => emp.value === manager.value)
          )
        );
    }, [selectedEmployees]);

    useEffect(() => {
        if (!project || !employees.length) return;
      
        setSelectedManagers(
          (project.managerIds || [])
            .map(id => {
              const m = employees.find(e => e.id === id);
              return m ? { value: m.id, label: m.name } : null;
            })
            .filter(Boolean)
        );
      
        setSelectedEmployees(
          (project.memberIds || [])
            .map(id => {
              const e = employees.find(emp => emp.id === id);
              return e ? { value: e.id, label: e.name } : null;
            })
            .filter(Boolean)
        );
      }, [project, employees]);
      
      
      
    // Pre fill form if EDIT MODE
    useEffect(() => {
        if (!project) return;

        setName(project.name || "");
        setClientName(project.clientName);
        setDescription(project.description || "");
        setStatus(project.status || "active");
        setActiveBugs(project.activeBugs || 0);
        setMeetingNotes(project.meetingNotes || 0);
        setCurrentPhase(project.currentPhase || "pitch");

         // managers (IDs → react-select objects)
        setSelectedManagers(
            (project.managerIds || [])
            .map(id => {
                const m = employees.find(e => e.id === id);
                return m ? { value: m.id, label: m.name } : null;
            })
            .filter(Boolean)
        );

         // members (IDs → react-select objects)
        setSelectedEmployees(
            (project.memberIds || [])
            .map(id => {
                const e = employees.find(emp => emp.id === id);
                return e ? { value: e.id, label: e.name } : null;
            })
            .filter(Boolean)
        );

        // console.log(employees)
    }, [project, employees])

    // Reset all fields when modal closes
    useEffect(() => {
        if (!isOpen) {
            setName("");
            setClientName("");
            setDescription("");
            setStatus("active");
            setActiveBugs(0);
            setMeetingNotes(0);
            setCurrentPhase("pitch");
            setSelectedManagers([]);
            setSelectedEmployees([]);
        }
        // console.log(assignableEmployees)
    }, [isOpen, employees]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Project name is required");
            return;
        }

        try {
            setAddProjectLoading(true);
            // const managerIds = selectedManagers.map(m => m.value);

            // const memberIds = Array.from(
            //     new Set([
            //         ...managerIds,
            //         ...selectedEmployees.map(e => e.value),
            //     ])
            // );

            const memberIds = selectedEmployees.map(e => e.value);
            const managerIds = selectedManagers.map(m => m.value);

            const payload = {
                name,
                description,
                status,
                clientName,
                managerIds,
                memberIds,
                activeBugs,
                meetingNotes,
                currentPhase,
            }
            if (isEditMode) {
                await updateProject(project.id, payload);
                toast.success("Project Updated");
            } else {
                await createProject(payload, user.uid);
                toast.success("Project created")
            }

            // reset and close the modal 
            setName("");
            setClientName("");
            setDescription("");
            setStatus("active");
            setActiveBugs(0);
            setMeetingNotes(0);
            setCurrentPhase("pitch");
            setSelectedManagers([]);
            setSelectedEmployees([]);

            onClose();

        } catch (err) {
            console.log(err);
            toast.error(
                isEditMode ? "Failed to update project" : "Failed to create project"
            )
        } finally {
            setAddProjectLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? `${project.name}` : "Create Project"}>
            <form onSubmit={handleSubmit} className="">
                {/* Project Name */}
                <div className="flex flex-row gap-sm mb-lg">
                    <Input label='Project Name' type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client Website Revamp" />
                    <Input label='Client Name' type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client's Name" />
                </div>

                {/* Project Description */}
                <div className="mb-lg">
                    <label htmlFor='description' className=" text-text-secondary text-label mb-xs">Description</label>
                    <textarea id='description' rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Landing page + dashboard" className="w-full rounded-md border border-border px-3 text-body focus:border-accent focus:ring-2 focus:ring-accent-soft outline-none" />
                </div>

                <div className="flex gap-md items-baseline mb-lg">
                    {/* Select Project Manager */}
                    <div className="w-full">
                        <label className="text-text-secondary text-label mb-xs">
                            Project Managers ({selectedManagers.length})
                        </label>

                        <Select
                            styles={selectStyles}
                            isMulti
                            options={managerOptions}
                            value={selectedManagers}
                            onChange={setSelectedManagers}
                            isLoading={employeesLoading}
                            placeholder="Assign managers..."
                            classNamePrefix="react-select"
                        />
                    </div>

                      {/* Select Members to asign the project to */}
                      <div className="w-full">
                        <label className="text-text-secondary text-label mb-xs">
                            Assign to ({selectedEmployees.length})
                        </label>

                        <Select
                            styles={selectStyles}
                            isMulti
                            options={employeeOptions}
                            value={selectedEmployees}
                            onChange={setSelectedEmployees}
                            isLoading={employeesLoading}
                            placeholder="Assign to..."
                            classNamePrefix="react-select"
                        />
                    </div>

                </div>


                {/* Status and phase */}
                <div className="flex flex-row gap-sm mb-0">
                    {/* Status */}
                    <div className="mb-lg w-full">
                        <label className="text-text-secondary text-label mb-xs">Status</label>
                        <select className="w-full rounded-lg border px-3 py-2 text-gray-600 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Current Phase */}
                    <div className="mb-lg w-full">
                        <label className="text-text-secondary text-label mb-xs">Phase</label>
                        <select className="w-full rounded-lg border px-3 py-2 text-gray-600 text-sm" value={currentPhase} onChange={(e) => setCurrentPhase(e.target.value)}>
                            <option value="pitch">Pitch / Strategy</option>
                            <option value="design">UI / UX Design</option>
                            <option value="development">Development</option>
                            <option value="seo">SEO</option>
                        </select>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" className='bg-white !text-black border border-black hover:bg-gray-100' onClick={onClose}> Cancel </Button>
                    <Button type="submit" disabled={addProjectLoading}> 
                        {isEditMode ? addProjectLoading ? "Updating..." : "Update" : addProjectLoading ? "Creating..." : "Create Project"}
                    </Button>
                </div>
            </form>


        </Modal>
    )
}

export default ProjectFormModal

const selectStyles = {
    control: (base) => ({
        ...base,
        height: "60px",
        minHeight: "60px",
        border: "1px solid rgb(229 231 235 / 1)",
        borderRadius: "8px",
        fontSize: "14px",
        overflow: "hidden",
        alignItems: "start",
        padding: "2px 0",
      }),
  
    valueContainer: (base) => ({
        ...base,
        flex: "0 0 80%",
        maxWidth: "80%",
        padding: "0px 8px",
        maxHeight: "52px",
        overflowY: "auto",
        overflowX: "hidden",
        flexWrap: "wrap",
        alignContent: "flex-start",
        scrollbarWidth: "thin",
      }),

    multiValue: (base) => ({
        ...base,
        margin: "2px 4px 2px 0",
    }),
      
  
    indicatorsContainer: (base) => ({
      ...base,
      flex: "0 0 20%",
      maxWidth: "20%",
      justifyContent: "flex-end",
      alignItems: "flex-start",
      paddingTop: "6px",
    }),
  
    dropdownIndicator: (base) => ({
      ...base,
      padding: "2px",
      color: "#6b7280",
      ":hover": {
        color: "#111827",
      },
    }),
  
    clearIndicator: (base) => ({
      ...base,
      padding: "2px",
    }),
  
    indicatorSeparator: () => ({
      display: "none",
    }),
  
    placeholder: (base) => ({
      ...base,
      fontSize: "14px",
      whiteSpace: "nowrap",
    }),
  
    option: (base, state) => ({
      ...base,
      fontSize: "14px",
      padding: "8px 12px",
      backgroundColor: state.isFocused
        ? "#f3f4f6"
        : state.isSelected
        ? "#e5e7eb"
        : "white",
      color: "#111827",
      cursor: "pointer",
    }),
  };
  
