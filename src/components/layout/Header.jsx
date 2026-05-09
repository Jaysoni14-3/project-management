import React from "react";
import { Bell, Menu } from "lucide-react";

import GlobalSearch from "./GlobalSearch";
import { useNavDrawer } from "../../context/NavDrawerContext";
import useNotifications from "../../hooks/useNotifications";

/* Thin top header above the main content. Sticky so the search bar
   stays reachable on long pages. Sits inside the main column (right of
   the sidebar) — the sidebar has its own footer area for user/notifs.
   On mobile, hosts the hamburger and a bell so notifications stay
   reachable without opening the drawer first. */
const Header = ({ onOpenNotifications }) => {
  const { openDrawer } = useNavDrawer();
  /* Count-only mode for the badge; the panel mounts its own
     full-list subscription when opened. */
  const { unreadCount } = useNotifications();

  return (
    <header
      /* Sticky pin offsets by `--app-top-offset` (the impersonation
         banner's height) so it doesn't park behind the banner. */
      className="sticky top-[var(--app-top-offset,0px)] z-sticky
        bg-canvas border-b border-line-subtle"
    >
      <div className="flex items-center gap-md px-lg lg:px-xl h-[56px]">
        {/* Hamburger — mobile only. Above lg the sidebar is always
            visible so the toggle is unnecessary. */}
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Open navigation"
          className="lg:hidden inline-flex items-center justify-center
            h-control w-control rounded-md border border-line bg-surface
            text-fg-muted hover:text-fg hover:bg-subtle
            transition-colors duration-fast shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        <GlobalSearch />

        {/* Bell — mobile only. The desktop sidebar hosts its own bell
            in the footer. Pushes to the far right of the header. */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          className="lg:hidden ml-auto relative inline-flex items-center justify-center
            h-control w-control rounded-md border border-line bg-surface
            text-fg-muted hover:text-fg hover:bg-subtle
            transition-colors duration-fast shrink-0"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread`}
              className="absolute -top-1 -right-1 inline-flex items-center justify-center
                h-4 min-w-[16px] px-[3px] rounded-full bg-error text-white
                text-[10px] font-semibold leading-none border border-canvas"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
