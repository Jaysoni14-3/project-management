import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";

import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import AppSelect from "../../components/ui/AppSelect";

import { findOrCreateDm } from "../../services/conversation.service";

/* Pick anyone in the workspace to start (or reopen) a 1-on-1. The
   server resolves find-or-create so picking the same person twice
   doesn't create duplicate conversations. */
const StartDmModal = ({
  isOpen,
  onClose,
  employees = [],
  currentUserId,
  onCreated,
}) => {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const options = useMemo(
    () =>
      employees
        .filter((e) => e.id !== currentUserId)
        .map((e) => ({
          value: e.id,
          label: e.name,
        })),
    [employees, currentUserId]
  );

  const handleClose = () => {
    if (submitting) return;
    setSelected(null);
    onClose();
  };

  const handleStart = async () => {
    if (!selected || submitting) return;
    try {
      setSubmitting(true);
      const conversation = await findOrCreateDm(selected.value);
      onCreated?.(conversation);
      setSelected(null);
      onClose();
    } catch (err) {
      toast.error(err?.message || "Couldn't start chat");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New direct message"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleStart} loading={submitting} disabled={!selected}>
            Start chat
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-sm">
        <label className="text-fg-muted text-label">Chat with</label>
        <AppSelect
          options={options}
          value={selected}
          onChange={(opt) => setSelected(opt || null)}
          placeholder="Pick someone…"
          isClearable
          autoFocus
        />
      </div>
    </Modal>
  );
};

export default StartDmModal;
