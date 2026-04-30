import React from 'react'

const Button = ({ children, type = "button", className = "", onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`w-full h-10 rounded-md bg-accent text-white text-body font-medium
                  hover:bg-accent-hover transition ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

export default Button