import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Layers,
  User as UserIcon,
  Pencil,
  Trash2,
  Play,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";

import {
  getModule,
  updateModule,
  deleteModule,
} from "../../services/module.service";
import { STATUS, STATUS_DOT, STATUS_TONE } from "./constants";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatTimestamp = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const fieldLabel = (field) => {
  switch (field) {
    case "status":
      return "Status";
    case "assignee":
      return "Assignee";
    case "title":
      return "Title";
    case "description":
      return "Description";
    case "created":
      return "Created";
    default:
      return field;
  }
};

const renderHistoryValue = (field, value) => {
  if (value == null) return "—";
  if (field === "status") return STATUS[value]?.label || value;
  if (field === "description")
    return value.length > 60 ? `${value.slice(0, 60)}…` : value;
  return value;
};

/* ============================================================
   Module detail modal — read-first, with action buttons to
   advance status (Start / Complete) and a history timeline.
   Editing/deleting is delegated back to the parent so the same
   ModuleFormModal/ConfirmDelete primitives stay in one place.
============================================================ */

const ModuleViewModal = ({
  isOpen,
  onClose,
  moduleId,
  onEdit,
  onDelete,
  onChanged,
}) => {
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  /* Re-fetch every time the modal opens for a new id. We don't poll —
     the modal is short-lived, and any side-effects from completing
     trigger a re-fetch via `refresh()`. */
  const refresh = async () => {
    if (!moduleId) return;
    setLoading(true);
    try {
      const data = await getModule(moduleId);
      setModule(data);
    } catch (err) {
      console.error("ModuleViewModal load:", err);
      toast.error(err?.message || "Couldn't load module");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && moduleId) refresh();
    if (!isOpen) setModule(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, moduleId]);

  const transitionTo = async (next) => {
    if (!module || transitioning) return;
    if (next === module.status) return;
    if (
      next === "completed" &&
      !window.confirm(
        "Marking this module complete will create a bug ticket for the testing team. Continue?"
      )
    ) {
      return;
    }
    try {
      setTransitioning(true);
      await updateModule(module.id, { status: next });
      toast.success(
        next === "completed"
          ? "Module completed — testers notified"
          : `Status updated to ${STATUS[next]?.label || next}`
      );
      await refresh();
      onChanged?.();
    } catch (err) {
      console.error("ModuleViewModal transition:", err);
      toast.error(err?.message || "Couldn't update status");
    } finally {
      setTransitioning(false);
    }
  };

  const status = (module?.status || "not_started").toLowerCase();
  const meta = STATUS[status] || STATUS.not_started;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={module?.title || "Module"}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {module && (
            <>
              <Button
                variant="secondary"
                leadingIcon={Pencil}
                onClick={() => onEdit?.(module)}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                leadingIcon={Trash2}
                onClick={() => onDelete?.(module)}
              >
                Delete
              </Button>
              {status === "not_started" && (
                <Button
                  leadingIcon={Play}
                  loading={transitioning}
                  onClick={() => transitionTo("in_progress")}
                >
                  Start
                </Button>
              )}
              {status === "in_progress" && (
                <Button
                  leadingIcon={CheckCircle2}
                  loading={transitioning}
                  onClick={() => transitionTo("completed")}
                >
                  Mark complete
                </Button>
              )}
              {status === "completed" && (
                <Button
                  variant="secondary"
                  leadingIcon={ArrowLeft}
                  loading={transitioning}
                  onClick={() => transitionTo("in_progress")}
                >
                  Reopen
                </Button>
              )}
            </>
          )}
        </>
      }
    >
      {loading || !module ? (
        <div className="flex flex-col gap-md">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-lg">
          {/* Status + assignee row */}
          <div className="flex flex-wrap items-center gap-md">
            <span
              className={`inline-flex items-center gap-xs h-control px-md rounded-md
                border text-bodySm font-medium ${STATUS_TONE[status]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
              {meta.label}
            </span>

            <span className="inline-flex items-center gap-xs text-bodySm text-fg-muted">
              {module.assigneeName ? (
                <>
                  {module.assigneeAvatar ? (
                    <img
                      src={module.assigneeAvatar}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-5 w-5 rounded-full bg-subtle text-[10px] font-semibold text-fg-muted flex items-center justify-center">
                      {initials(module.assigneeName)}
                    </span>
                  )}
                  {module.assigneeName}
                </>
              ) : (
                <>
                  <UserIcon className="h-3.5 w-3.5" />
                  Unassigned
                </>
              )}
            </span>

            {module.projectName && (
              <span className="text-bodySm text-fg-subtle">
                · {module.projectName}
              </span>
            )}
          </div>

          {/* Description */}
          {module.description ? (
            <p className="text-body text-fg whitespace-pre-line leading-relaxed">
              {module.description}
            </p>
          ) : (
            <p className="text-bodySm text-fg-subtle italic">
              No description yet.
            </p>
          )}

          {/* History */}
          <div>
            <h3 className="text-section text-fg mb-sm flex items-center gap-xs">
              <Layers className="h-4 w-4 text-fg-subtle" />
              History
            </h3>
            {module.history?.length ? (
              <ul className="flex flex-col gap-sm">
                {module.history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-start gap-md py-sm border-b border-line-subtle last:border-b-0"
                  >
                    <div className="h-7 w-7 rounded-full bg-subtle text-[10px] font-semibold text-fg-muted flex items-center justify-center shrink-0">
                      {initials(h.changedByName || "System")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-bodySm text-fg leading-snug">
                        <span className="font-medium">
                          {h.changedByName || "System"}
                        </span>{" "}
                        <span className="text-fg-muted">
                          {h.fieldChanged === "created"
                            ? "created the module"
                            : `updated ${fieldLabel(h.fieldChanged)}`}
                        </span>
                      </p>
                      {h.fieldChanged !== "created" && (
                        <p className="text-caption text-fg-subtle mt-[2px]">
                          {renderHistoryValue(h.fieldChanged, h.oldValue)} →{" "}
                          {renderHistoryValue(h.fieldChanged, h.newValue)}
                        </p>
                      )}
                      <p className="text-caption text-fg-subtle mt-[2px]">
                        {formatTimestamp(h.changedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-bodySm text-fg-subtle italic">
                No changes recorded yet.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ModuleViewModal;
