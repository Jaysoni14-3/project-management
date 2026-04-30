import React, { useEffect } from 'react'
import { BiX } from "react-icons/bi";

const Modal = ({ isOpen, onClose, title, children }) => {

    // Prevents body from scrolling when modal is Opened
    useEffect(() => {
        if (isOpen) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
        }
        return () => {
          document.body.style.overflow = "";
        };
      }, [isOpen]);
      

    if (!isOpen) return null
    return (
        <>
            {/* BACKDROP */}
            <div className="backdrop fixed inset-0 bg-black/40 z-40" onClick={onClose}></div>

            {/* MODAL */}
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="w-full max-w-lg bg-white rounded-xl shadow-modal" onClick={(e) => e.stopPropagation()}>
                    {/* header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"> <BiX /> </button>
                    </div>
                    {/* Content */}
                    <div className="p-4">{children}</div>
                </div>  
            </div>
        </>
    )
}

export default Modal