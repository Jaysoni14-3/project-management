import React from 'react'

const Input = ({ label, id, type = "text", ...props }) => {
    return (
        <div className="flex flex-col w-full">
            <label
                htmlFor={id}
                className=" text-text-secondary text-label mb-xs">
                {label}
            </label>

            <input
                id={id}
                type={type}
                className="w-full h-10 rounded-md border border-border px-3 text-body focus:border-accent focus:ring-2 focus:ring-accent-soft outline-none"
                {...props}
            />
        </div>
    )
}

export default Input