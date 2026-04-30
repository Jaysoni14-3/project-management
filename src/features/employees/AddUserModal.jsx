import React from 'react'
import UserForm from '../../components/forms/UserRegisterForm'
import Modal from '../../components/ui/Modal'

const AddUserModal = ({ isOpen, onClose, user }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}  title={user ? "Edit User" : "Add New User"}>
            <UserForm
                user={user}
                submitLabel={user ? "Update User" : "Add User"}
                onSuccess={onClose}
            />
        </Modal>
    )
}

export default AddUserModal