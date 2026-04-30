import React from 'react'
import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";


const PasswordInput = ({ label, id, ...props }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="mb-lg">
      <label
        htmlFor={id}
        className="text-text-secondary text-label block mb-xs"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          {...props}
          type={show ? "text" : "password"}
          className="w-full h-10 rounded-md border border-border px-3 pr-10 text-body focus:border-accent focus:ring-2 focus:ring-accent-soft outline-none"
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition cursor-pointer z-10"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    </div>
  )
}

export default PasswordInput