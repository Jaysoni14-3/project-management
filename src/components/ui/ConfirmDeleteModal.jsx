import Modal from "./Modal"

const ConfirmDeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Delete Project",
    description = `Are you sure you want to delete this project? \n (This action cannot be undone) \n It will be removed from all the assigned Users`,
    loading = false,
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{description}</p>

            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 border rounded-md w-full h-10 text-black"
                    disabled={loading}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    className="bg-red-600 p-2 rounded-md w-full h-10 text-white"
                >
                    {loading ? "Deleting..." : "Delete"}
                </button>
            </div>
        </Modal>
    )
}

export default ConfirmDeleteModal
