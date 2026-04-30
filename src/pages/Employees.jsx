import React, { useMemo, useState } from 'react'
import useEmployees from '../hooks/useEmployee'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../services/firebase'
import EmployeeCard from '../features/employees/components/EmployeeCard'
import { BiPlus } from 'react-icons/bi'
import Button from '../components/ui/Button'
import { useProjects } from '../hooks/useProjects'
import AddUserModal from '../features/employees/AddUserModal'
import ConfirmDeleteModal from '../components/ui/ConfirmDeleteModal'

const Employees = () => {

    const [isUserModalOpen, setUserModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState(null)

    const { projects } = useProjects();

    const { employees, loading, loading: projectsLoading } = useEmployees();

    const [userToDelete, setUserToDelete] = useState(null)
    const [deleteLoading, setDeleteLoading] = useState(false)


    // get all projects names from project id Globally and pass it as props 
    const projectsNameMap = useMemo(() => {
        if (!projects || projects.length === 0) return {};

        const map = {};
        projects.forEach((project) => {
            map[project.id] = project.name; // or project.projectName if that's your field
        });

        return map;
    }, [projects]);



    const handleEditUser = (user) => {
        setEditingUser(user)
        setUserModalOpen(true)
    }

    const handleDeleteUserRequest = (user) => {
        setUserToDelete(user) // opens modal
    }

    const handleConfirmDeleteUser = async () => {
        if (!userToDelete) return

        try {
            setDeleteLoading(true)
            await deleteDoc(doc(db, "users", userToDelete.id))
            setUserToDelete(null)
        } catch (err) {
            console.error(err)
        } finally {
            setDeleteLoading(false)
        }
    }

    const userIdToNameMap = useMemo(() => {
        const map = {}
        employees.forEach(user => {
            map[user.id] = user.name
        })
        return map
    }, [employees])
    return (
        <>
            {/* Employee cards */}
            <div className="employee-section border rounded-sm mt-md">
                <div className="section-header flex items-center justify-between shadow-card p-md py-md">
                    <h2 className="text-text-primary text-page font-medium">Employees</h2>
                    <Button type="button" onClick={() => { setUserModalOpen(true); setEditingUser(null) }} className="flex items-center justify-center g-xs w-max px-sm"><BiPlus />Add New</Button>
                </div>

                <div className="section-body project-listing grid grid-cols-3 gap-lg p-md">
                    {loading ? (
                        <p className="col-span-3 text-center py-8 text-text-secondary">
                            Loading employees...
                        </p>
                    ) : employees.length > 0 ? (
                        <EmployeeCard employees={employees} userIdToNameMap={userIdToNameMap} projectsLoading={projectsLoading} projectsMap={projectsNameMap} onEditUser={handleEditUser} onDeleteUser={handleDeleteUserRequest} />
                    ) : (
                        <p className="text-gray-500 col-span-3 text-center py-8">
                            No employees found. Add your first employee!
                        </p>
                    )}
                </div>
            </div>

            <AddUserModal isOpen={isUserModalOpen} user={editingUser} onClose={() => { setUserModalOpen(false); setEditingUser(null) }} />

            <ConfirmDeleteModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDeleteUser}
                loading={deleteLoading}
                title="Delete User"
                description={
                    userToDelete
                        ? `Are you sure you want to delete ${userToDelete.name}?\n(This action cannot be undone)`
                        : ""
                }
            />
        </>
    )
}

export default Employees