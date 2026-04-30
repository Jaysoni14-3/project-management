import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete project",
  description = "Are you sure you want to delete this project? This action cannot be undone — it will be removed from all assigned users.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-md">
        <div className="h-10 w-10 shrink-0 rounded-md bg-error-50 text-error flex items-center justify-center">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-body text-fg-muted whitespace-pre-line">{description}</p>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
