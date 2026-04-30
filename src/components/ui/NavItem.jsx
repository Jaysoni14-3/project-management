import React from 'react'
import { NavLink } from 'react-router-dom'

const NavItem = ({ to, label, icon: Icon}) => {
  return (
    <NavLink to={to}  className={({ isActive }) =>
        `flex gap-sm items-center px-md py-sm rounded-sm text-body transition ${
          isActive
            ? "bg-accent-hover text-white font-medium shadow-card"
            : "text-gray-200 hover:bg-accent-hover hover:text-white hover:shadow-card"
        }`
      }>
         {Icon && <Icon />}
        {label}
    </NavLink>
  )
}

export default NavItem