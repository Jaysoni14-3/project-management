import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import AppSelect from "../../components/ui/AppSelect";

import { createModule, updateModule } from "../../services/module.service";
import { STATUS_ORDER, STATUS } from "./constants";

const empToOption = (emp, currentUid) => ({
  value: emp.id,
  label: emp.id === currentUid ? `${emp.name} (You)` : emp.name,
});

/* Lightweight module create/edit form. Modules carry less metadata than
   bugs (no severity, attachments, due dates) so the form stays simple:
   title, description, status, single assignee. Members come from the
   parent project so we only show people who belong on this module. */
const ModuleFormModal = ({
  isOpen,
  onClose,
  projectId,
  module,
  members = [],
  currentUserId,
}) => {
  const isEdit = Boolean(module);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("not_started");
  const [assignee, setAssignee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const memberOptions = useMemo(
    () => members.map((m) => empToOption(m, currentUserId)),
    [members, currentUserId]
  );

  /* Prefill once per module ref. Don't depend on `members` here — that
     can churn on realtime updates and would clobber in-progress edits. */
  useEffect(() => {
    if (!isOpen) return;
    if (module) {
      setTitle(module.title || "");
      setDescription(module.description || "");
      setStatus(module.status || "not_started");
      const a = members.find((m) => m.id === module.assigneeId);
      setAssignee(a ? empToOption(a, currentUserId) : null);
    } else {
      setTitle("");
      setDescription("");
      setStatus("not_started");
      setAssignee(null);
    }
    setFormError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, module]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    const trimmed = title.trim();
    if (!trimmed) {
      setFormError("Module title is required.");
      return;
    }

    const payload = {
      title: trimmed,
      description: description.trim() || undefined,
      status,
      assigneeId: assignee?.value ?? null,
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        await updateModule(module.id, payload);
        toast.success("Module updated");
      } else {
        await createModule(projectId, payload);
        toast.success("Module created");
      }
      onClose();
    } catch (err) {
      console.error("ModuleFormModal:", err);
      const msg = err?.message || "Couldn't save module";
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
      title={isEdit ? `Edit · ${module?.title}` : "New module"}
      description={
        isEdit
          ? null
          : "Define a feature or component someone will own end-to-end."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="module-form" loading={submitting}>
            {isEdit ? "Save changes" : "Create module"}
          </Button>
        </>
      }
    >
      <form id="module-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div
            role="alert"
            className="mb-md p-sm rounded-md bg-error-50 border border-error-200 text-error-800 text-bodySm"
          >
            {formError}
          </div>
        )}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Checkout flow rewrite"
        />

        <div className="mb-lg">
          <label
            htmlFor="module-description"
            className="text-fg-muted text-label mb-xs block"
          >
            Description
          </label>
          <textarea
            id="module-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's in scope, what's out, links to specs…"
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-fg
              placeholder:text-fg-subtle
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
          <div>
            <label className="text-fg-muted text-label mb-xs block">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-control rounded-md border border-line bg-surface px-3 text-body text-fg
                focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-fg-muted text-label mb-xs block">
              Assignee
            </label>
            <AppSelect
              isClearable
              options={memberOptions}
              value={assignee}
              onChange={(opt) => setAssignee(opt || null)}
              placeholder="Pick a project member…"
              noOptionsMessage={() =>
                memberOptions.length === 0
                  ? "Add team members to this project first"
                  : "No matches"
              }
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ModuleFormModal;
