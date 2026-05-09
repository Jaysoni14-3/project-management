import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Phone, MessageCircle } from "lucide-react";

import EditButton from "../../../components/ui/EditButton";
import DeleteButton from "../../../components/ui/DeleteButton";
import { useAuth } from "../../../context/AuthContext";
import { employeePath } from "../../../lib/slug";

const roleToken = {
  admin:    "bg-error-50 text-error-700 border-error-200",
  manager:  "bg-accent-soft text-accent border-accent-200",
  hr:       "bg-warning-50 text-warning-700 border-warning-200",
  employee: "bg-subtle text-fg-muted border-line",
};

const formatJoined = (raw) => {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const ContactLink = ({ to, label, icon: Icon }) => (
  <Link
    to={to}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center justify-center h-7 w-7 rounded-md
      text-fg-muted hover:text-accent hover:bg-accent-soft
      transition-colors duration-fast"
  >
    <Icon className="h-3.5 w-3.5" />
  </Link>
);

const EmployeeCard = ({
  employees,
  onEditUser,
  userIdToNameMap,
  onDeleteUser,
  projectsLoading,
}) => {
  const navigate = useNavigate();
  const { user: authUser, canManage } = useAuth();

  return (
    <>
      {employees.map((emp) => {
        const role = (emp.role || "employee").toLowerCase();
        const isSelf = emp.id === authUser?.uid;
        const goToProfile = () => navigate(employeePath(emp));

        return (
          <article
            key={emp.id}
            role="button"
            tabIndex={0}
            onClick={goToProfile}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToProfile();
              }
            }}
            className="group relative bg-surface border border-line rounded-lg p-lg
              cursor-pointer
              transition-[border-color,box-shadow] duration-fast
              hover:border-line-strong hover:shadow-md
              focus-visible:outline-none focus-visible:shadow-focus-ring
              flex flex-col gap-md"
          >
            {/* Hover actions — admin/manager can edit or delete others;
                self can edit own card; self-delete is hidden everywhere. */}
            {(canManage || isSelf) && (
              <div className="absolute top-md right-md flex items-center gap-xs
                opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
                <EditButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditUser(emp);
                  }}
                />
                {canManage && !isSelf && (
                  <DeleteButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteUser(emp);
                    }}
                  />
                )}
              </div>
            )}

            {/* Header: avatar + name */}
            <header className="flex items-start gap-md pr-xl">
              <div className="h-12 w-12 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center font-semibold overflow-hidden">
                {emp.avatar ? (
                  <img
                    src={`/images/${emp.avatar}`}
                    alt={emp.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials(emp.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm flex-wrap">
                  <h3 className="text-section text-fg truncate capitalize">
                    {emp.name}
                  </h3>
                  <span
                    className={`text-caption font-medium px-sm py-[1px] rounded-xs border capitalize ${
                      roleToken[role] ?? roleToken.employee
                    }`}
                  >
                    {role}
                  </span>
                </div>
                {emp.designation && (
                  <p className="text-bodySm text-fg-muted capitalize truncate">
                    {emp.designation}
                  </p>
                )}
              </div>
            </header>

            {/* Meta */}
            <div className="flex flex-col gap-xs">
              <p className="text-caption text-fg-subtle">
                Manager:{" "}
                <span className="text-fg-muted capitalize">
                  {emp.managerID ? userIdToNameMap[emp.managerID] || "—" : "—"}
                </span>
              </p>
              <p className="text-caption text-fg-subtle">
                Projects:{" "}
                <span className="text-fg-muted">
                  {projectsLoading
                    ? "Loading…"
                    : emp.assignedProjects?.length > 0
                    ? emp.assignedProjects.map((p) => p.name).join(", ")
                    : "None assigned"}
                </span>
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-md mt-auto border-t border-line-subtle">
              <div className="flex items-center gap-xs">
                {emp.email && (
                  <ContactLink
                    to={`mailto:${emp.email}`}
                    label="Email"
                    icon={Mail}
                  />
                )}
                {emp.whatsapp && (
                  <ContactLink
                    to={`https://wa.me/${emp.whatsapp}`}
                    label="WhatsApp"
                    icon={MessageCircle}
                  />
                )}
                {emp.phoneNumber && (
                  <ContactLink
                    to={`tel:${emp.phoneNumber}`}
                    label="Call"
                    icon={Phone}
                  />
                )}
              </div>

              <span className="text-caption text-fg-subtle">
                Joined {formatJoined(emp.joinedDate)}
              </span>
            </div>
          </article>
        );
      })}
    </>
  );
};

export default EmployeeCard;
