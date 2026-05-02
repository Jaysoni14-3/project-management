import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { toast } from "react-toastify";

import { useAuth } from "../../context/AuthContext";
import { createProject, updateProject } from "../../services/project.service";
import useEmployees from "../../hooks/useEmployee";

import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const reactSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "36px",
    borderColor: state.isFocused ? "rgb(6 29 111)" : "rgb(228 228 231)",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(59, 130, 246, 0.25)"
      : "none",
    borderRadius: "8px",
    fontSize: "14px",
    "&:hover": {
      borderColor: state.isFocused ? "rgb(6 29 111)" : "rgb(212 212 216)",
    },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    backgroundColor: state.isSelected
      ? "rgb(239 246 255)"
      : state.isFocused
      ? "rgb(244 244 245)"
      : "white",
    color: "rgb(24 24 27)",
    cursor: "pointer",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "rgb(239 246 255)",
    borderRadius: "4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "rgb(6 29 111)",
    fontSize: "12px",
    fontWeight: 500,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "rgb(6 29 111)",
    ":hover": { backgroundColor: "rgb(219 234 254)", color: "rgb(6 29 111)" },
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: "14px",
    color: "rgb(113 113 122)",
  }),
  indicatorSeparator: () => ({ display: "none" }),
};

const empToOption = (emp, currentUid) => ({
  value: emp.id,
  label: emp.id === currentUid ? `${emp.name} (You)` : emp.name,
});

const ProjectFormModal = ({ isOpen, onClose, project }) => {
  const isEditMode = Boolean(project);
  const { user } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees();

  // Static fields
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [currentPhase, setCurrentPhase] = useState("pitch");

  // Selects
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Options
  const employeeOptions = useMemo(
    () => employees.map((e) => empToOption(e, user?.uid)),
    [employees, user?.uid]
  );
  const managerOptions = useMemo(
    () =>
      employees
        .filter((e) => e.isManager)
        .map((e) => ({ value: e.id, label: e.name })),
    [employees]
  );

  /* ------------------------------------------------------------------
     Prefill scalar fields ONCE per project (or whenever the project ref
     changes). DO NOT depend on `employees` here — that array updates on
     every realtime snapshot, and re-running this would clobber the
     user's in-progress edits.
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!project) return;
    setName(project.name || "");
    setClientName(project.clientName || "");
    setDescription(project.description || "");
    setStatus(project.status || "active");
    setCurrentPhase(project.currentPhase || "pitch");
  }, [project]);

  /* ------------------------------------------------------------------
     Resolve selected manager/member IDs to react-select options. This
     CAN depend on `employees` — when the employee list lands or updates
     (e.g. someone gets renamed elsewhere), labels stay correct. But we
     only DERIVE the selection from project's IDs, so user changes to
     the multi-selects are never overwritten.
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (!project || employees.length === 0) return;

    setSelectedManagers(
      (project.managerIds || [])
        .map((id) => {
          const m = employees.find((e) => e.id === id);
          return m ? { value: m.id, label: m.name } : null;
        })
        .filter(Boolean)
    );

    setSelectedEmployees(
      (project.memberIds || [])
        .map((id) => {
          const m = employees.find((e) => e.id === id);
          return m ? { value: m.id, label: m.name } : null;
        })
        .filter(Boolean)
    );
    // intentionally only re-run on project change — see comment in body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, employees.length]);

  /* ------------------------------------------------------------------
     Cleanup managers when an employee is unselected. (A manager must
     also be a member of the project.)
  ------------------------------------------------------------------ */
  useEffect(() => {
    setSelectedManagers((prev) =>
      prev.filter((m) =>
        selectedEmployees.some((e) => e.value === m.value)
      )
    );
  }, [selectedEmployees]);

  /* ------------------------------------------------------------------
     Reset everything when the modal closes. Fires once on close edge.
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (isOpen) return;
    setName("");
    setClientName("");
    setDescription("");
    setStatus("active");
    setCurrentPhase("pitch");
    setSelectedManagers([]);
    setSelectedEmployees([]);
    setFormError("");
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setFormError("");

    if (!user?.uid) {
      setFormError("You're not signed in. Please log in again.");
      return;
    }
    if (!name.trim()) {
      setFormError("Project name is required.");
      return;
    }

    const memberIds = selectedEmployees.map((e) => e.value);
    const managerIds = selectedManagers.map((m) => m.value);

    const payload = {
      name: name.trim(),
      description,
      status,
      clientName,
      managerIds,
      memberIds,
      currentPhase,
    };

    try {
      setSubmitting(true);
      const result = isEditMode
        ? await updateProject(project.id, payload)
        : await createProject(payload, user.uid);

      const failures = result?.syncFailures ?? [];
      if (failures.length > 0) {
        toast.warning(
          `${isEditMode ? "Project updated" : "Project created"}, but couldn't link ${
            failures.length
          } team member${failures.length === 1 ? "" : "s"}: ${failures[0].reason}`,
          { autoClose: 7000 }
        );
      } else {
        toast.success(isEditMode ? "Project updated" : "Project created");
      }
      onClose();
    } catch (err) {
      console.error("ProjectFormModal:", err);
      const msg =
        err?.code ||
        err?.message ||
        (isEditMode ? "Failed to update project" : "Failed to create project");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit · ${project?.name}` : "Create project"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="project-form"
            loading={submitting}
          >
            {isEditMode ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div
            role="alert"
            className="mb-md p-sm rounded-md bg-error-50 border border-error-200 text-error-800 text-bodySm"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-row gap-md mb-md">
          <Input
            label="Project name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client website revamp"
          />
          <Input
            label="Client name"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Acme Inc."
          />
        </div>

        <div className="mb-md">
          <label
            htmlFor="description"
            className="text-fg-muted text-label mb-xs block"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Landing page + dashboard overhaul"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-fg
              placeholder:text-fg-subtle
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          />
        </div>

        <div className="flex gap-md mb-md">
          <div className="w-full">
            <label className="text-fg-muted text-label mb-xs block">
              Team members ({selectedEmployees.length})
            </label>
            <Select
              isMulti
              options={employeeOptions}
              value={selectedEmployees}
              onChange={(opts) => setSelectedEmployees(opts || [])}
              isLoading={employeesLoading}
              placeholder="Assign team members…"
              styles={reactSelectStyles}
              classNamePrefix="react-select"
            />
          </div>

          <div className="w-full">
            <label className="text-fg-muted text-label mb-xs block">
              Project managers ({selectedManagers.length})
            </label>
            <Select
              isMulti
              options={managerOptions.filter((m) =>
                selectedEmployees.some((e) => e.value === m.value)
              )}
              value={selectedManagers}
              onChange={(opts) => setSelectedManagers(opts || [])}
              isLoading={employeesLoading}
              placeholder="Promote a member to manager…"
              styles={reactSelectStyles}
              classNamePrefix="react-select"
              noOptionsMessage={() =>
                selectedEmployees.length === 0
                  ? "Add team members first"
                  : "No managers among the selected members"
              }
            />
          </div>
        </div>

        <div className="flex flex-row gap-md mb-md">
          <div className="w-full">
            <label className="text-fg-muted text-label mb-xs block">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-control rounded-md border border-line bg-surface px-3 text-body text-fg
                focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="w-full">
            <label className="text-fg-muted text-label mb-xs block">
              Phase
            </label>
            <select
              value={currentPhase}
              onChange={(e) => setCurrentPhase(e.target.value)}
              className="w-full h-control rounded-md border border-line bg-surface px-3 text-body text-fg
                focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
            >
              <option value="pitch">Pitch / Strategy</option>
              <option value="design">UI / UX Design</option>
              <option value="development">Development</option>
              <option value="seo">SEO</option>
            </select>
          </div>
        </div>

      </form>
    </Modal>
  );
};

export default ProjectFormModal;
