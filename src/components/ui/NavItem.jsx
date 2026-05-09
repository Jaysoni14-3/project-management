import React from "react";
import { NavLink } from "react-router-dom";

/**
 * Sidebar nav row, Linear-style on a brand-blue surface.
 * Active: subtle white-glass fill + crisp white left bar + light-blue icon.
 * Inactive: low-contrast text, hover lifts to high contrast.
 */
const NavItem = ({
  to,
  label,
  icon: Icon,
  end = false,
  indent = false,
  badge,
}) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-sm rounded-sm
         px-md py-[6px] text-body select-none
         transition-[background-color,color] duration-fast
         ${indent ? "pl-lg" : ""}
         ${
           isActive
             ? "bg-white/[0.10] text-white font-medium"
             : "text-white/65 hover:bg-white/[0.06] hover:text-white"
         }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active accent bar */}
          <span
            aria-hidden
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r-full
              transition-opacity duration-fast
              ${isActive ? "bg-white opacity-100" : "opacity-0"}`}
          />
          {Icon && (
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors duration-fast
                ${isActive ? "text-accent-200" : "text-white/55 group-hover:text-white/85"}`}
              aria-hidden
            />
          )}
          <span className="truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span
              className="ml-auto shrink-0 inline-flex items-center justify-center
                h-4 min-w-[18px] px-[5px] rounded-full bg-accent text-accent-fg
                text-[10px] font-semibold tabular-nums"
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export default NavItem;
