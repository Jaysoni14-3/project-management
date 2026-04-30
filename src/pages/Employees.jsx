import React, { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";

import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";

import useEmployees from "../hooks/useEmployee";
import { useProjects } from "../hooks/useProjects";
import { db } from "../services/firebase";
import { removeUserFromAllProjects } from "../services/employee.service";

import EmployeeCard from "../features/employees/components/EmployeeCard";
import AddUserModal from "../features/employees/AddUserModal";

const Employees = () => {
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { projects } = useProjects();
  const { employees, loading } = useEmployees();

  const projectsNameMap = useMemo(() => {
    if (!projects?.length) return {};
    return projects.reduce((m, p) => ({ ...m, [p.id]: p.name }), {});
  }, [projects]);

  const userIdToNameMap = useMemo(
    () => employees.reduce((m, e) => ({ ...m, [e.id]: e.name }), {}),
    [employees]
  );

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
      await deleteDoc(doc(db, "users", userToDelete.id));
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
        description="Everyone in your workspace — roles, assignments, and contact details at a glance."
        actions={
          <Button leadingIcon={Plus} onClick={onAddNew}>
            Invite member
          </Button>
        }
      />

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
          description="Invite your first teammate to start assigning work and collaborating."
          action={
            <Button leadingIcon={Plus} onClick={onAddNew}>
              Invite a teammate
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-md">
          <EmployeeCard
            employees={employees}
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
