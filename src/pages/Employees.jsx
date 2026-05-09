import React, { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";

import useEmployees from "../hooks/useEmployee";
import { useProjects } from "../hooks/useProjects";
import { useAuth } from "../context/AuthContext";
import {
  deleteUser,
  removeUserFromAllProjects,
} from "../services/employee.service";

import EmployeeCard from "../features/employees/components/EmployeeCard";
import AddUserModal from "../features/employees/AddUserModal";

const Employees = () => {
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all");

  const { projects } = useProjects();
  const { employees, loading } = useEmployees();
  const { canManage } = useAuth();

  const projectsNameMap = useMemo(() => {
    if (!projects?.length) return {};
    return projects.reduce((m, p) => ({ ...m, [p.id]: p.name }), {});
  }, [projects]);

  const userIdToNameMap = useMemo(
    () => employees.reduce((m, e) => ({ ...m, [e.id]: e.name }), {}),
    [employees]
  );

  /* Build a Set of member ids for the selected project so the filter is
     O(1) per employee. Recomputed only when the project list or the
     filter selection changes. memberIds is the canonical source on the
     project doc — `assignedProjects` on each user is duplicated state
     and can drift, so we filter from the project side. */
  const selectedProjectMemberIds = useMemo(() => {
    if (projectFilter === "all") return null;
    const project = projects?.find((p) => p.id === projectFilter);
    return new Set(project?.memberIds ?? []);
  }, [projectFilter, projects]);

  const filteredEmployees = useMemo(() => {
    if (!selectedProjectMemberIds) return employees;
    return employees.filter((e) => selectedProjectMemberIds.has(e.id));
  }, [employees, selectedProjectMemberIds]);

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeleteLoading(true);
      // Strip references from every project before deleting the user
      // so we don't leave orphaned IDs in memberIds / managerIds.
      await removeUserFromAllProjects(userToDelete.id);
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const onAddNew = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader
        title="Team"
        actions={
          canManage && (
            <Button leadingIcon={Plus} onClick={onAddNew}>
              Invite member
            </Button>
          )
        }
      />

      {/* Filter bar — only shown once we have at least one teammate to
          filter against. The select is plain HTML for parity with the
          select control style used elsewhere on the page. */}
      {!loading && employees.length > 0 && (
        <div className="flex flex-wrap items-center gap-md">
          <label className="inline-flex items-center gap-sm">
            <span className="text-label text-fg-muted">Project</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-controlSm rounded-md border border-line bg-surface
                px-sm pr-md text-bodySm text-fg
                focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
            >
              <option value="all">All projects</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || "Untitled"}
                </option>
              ))}
            </select>
          </label>
          <span className="text-caption text-fg-subtle ml-auto tabular-nums">
            {filteredEmployees.length} of {employees.length}
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-md">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-line rounded-lg p-lg flex items-center gap-md"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 flex flex-col gap-xs">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          action={
            canManage && (
              <Button leadingIcon={Plus} onClick={onAddNew}>
                Invite a teammate
              </Button>
            )
          }
        />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teammates on this project"
          action={
            <Button variant="secondary" onClick={() => setProjectFilter("all")}>
              Clear filter
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-md">
          <EmployeeCard
            employees={filteredEmployees}
            userIdToNameMap={userIdToNameMap}
            projectsLoading={loading}
            projectsMap={projectsNameMap}
            onEditUser={handleEditUser}
            onDeleteUser={setUserToDelete}
          />
        </div>
      )}

      <AddUserModal
        isOpen={isUserModalOpen}
        user={editingUser}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
        loading={deleteLoading}
        title="Remove team member"
        description={
          userToDelete
            ? `Remove ${userToDelete.name} from the workspace? They'll lose access immediately. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
      />
    </div>
  );
};

export default Employees;
