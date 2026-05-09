import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Bug,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";

import NavItem from "../ui/NavItem";
import IconButton from "../ui/IconButton";
import Skeleton from "../ui/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavDrawer } from "../../context/NavDrawerContext";
import { useProjects } from "../../hooks/useProjects";
import useNotifications from "../../hooks/useNotifications";
import useWhatsNew from "../../hooks/useWhatsNew";
import { getUser } from "../../services/employee.service";
import { projectPath } from "../../lib/slug";

const Sidebar = ({ onOpenNotifications }) => {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [profile, setProfile] = useState(null);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { projects, loading: projectsLoading } = useProjects();
  /* Count-only mode — the panel mounts its own hook in full-list mode
     when it opens. We just need the badge count out here. */
  const { unreadCount } = useNotifications();
  /* What's new — `openManually` reopens the modal even after the
     auto-open was dismissed. `hasUnseen` drives a small dot on the
     trigger so users know there's something to look at. */
  const { hasUnseen: hasUnseenChangelog, openManually: openWhatsNew } =
    useWhatsNew();
  /* Mobile drawer state — only matters below the lg breakpoint, where
     the sidebar slides in from the left. Tapping the backdrop closes. */
  const { open: drawerOpen, closeDrawer } = useNavDrawer();

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUser(user.uid);
        if (!cancelled) setProfile(profile);
      } catch (err) {
        console.error("Sidebar: failed to load user profile", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const initials =
    (profile?.name || user?.email || "U")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <>
      {/* Backdrop — mobile-only, fades in when the drawer is open.
          Click anywhere on the dimmed canvas to dismiss. */}
      <div
        onClick={closeDrawer}
        aria-hidden
        className={`lg:hidden fixed inset-0 z-overlay bg-overlay/50 backdrop-blur-[2px]
          transition-opacity duration-base
          ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      <aside
        /* Two layout modes:
             • lg+ : behaves exactly like before — sticky column inline
               in the flex row, full height minus impersonation offset.
             • < lg: a fixed slide-in drawer transformed off-screen
               when closed. The `lg:` overrides bring back the inline
               sticky behaviour above the breakpoint. */
        className={`w-sidebar shrink-0
          bg-[rgb(6_29_111)] dark:bg-[rgb(12_14_22)]
          text-white/85 flex flex-col
          border-r border-white/[0.08] dark:border-white/[0.06]
          overflow-hidden
          fixed inset-y-0 left-0 z-overlay
          transition-transform duration-base ease-out-quart
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:transition-none
          lg:h-[calc(100vh-var(--app-top-offset,0px))]
          lg:sticky lg:top-[var(--app-top-offset,0px)]`}
      >
      {/* Soft top highlight — adds depth so the chrome doesn't read flat.
          Slightly different tint per theme so it matches the surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64
          bg-[radial-gradient(circle_at_50%_-30%,rgba(120,160,255,0.18),transparent_60%)]
          dark:bg-[radial-gradient(circle_at_50%_-30%,rgba(96,165,250,0.08),transparent_60%)]"
      />
      {/* Faint vignette at bottom for footer contrast */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32
          bg-gradient-to-t from-black/15 dark:from-black/30 to-transparent"
      />

      {/* Brand */}
      <div className="relative h-14 px-lg flex items-center gap-sm border-b border-white/[0.08]">
        <div className="h-8 w-8 rounded-md bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white text-bodySm font-bold tracking-tight">
          E
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-body font-semibold text-white tracking-tight">
            EKAIO
          </span>
          <span className="text-caption text-white/45 -mt-px">
            Work, simplified.
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto px-sm py-md">
        <div className="px-md mb-xs text-eyebrow uppercase text-white/40">
          Workspace
        </div>

        <div className="flex flex-col gap-[2px] mb-md">
          <NavItem to="/" label="Dashboard" icon={LayoutDashboard} end />
          <NavItem to="/bugs" label="Bugs" icon={Bug} />
          <NavItem to="/employees" label="Team" icon={Users} />
        </div>

        {/* Projects group */}
        <div className="flex items-center justify-between pl-md pr-xs mb-xs">
          <span className="text-eyebrow uppercase text-white/40">Projects</span>
          <IconButton
            size="sm"
            variant="ghost-dark"
            onClick={() => setProjectsOpen((o) => !o)}
            aria-label={projectsOpen ? "Collapse projects" : "Expand projects"}
            aria-expanded={projectsOpen}
          >
            <ChevronDown
              className={`transition-transform duration-base
                ${projectsOpen ? "rotate-0" : "-rotate-90"}`}
            />
          </IconButton>
        </div>

        {projectsOpen && (
          <div className="flex flex-col gap-[2px] animate-fade-in">
            <NavItem to="/projects" label="All projects" icon={FolderKanban} end />

            {projectsLoading ? (
              <div className="px-md py-sm flex flex-col gap-xs">
                <Skeleton className="h-3 w-3/4 bg-white/[0.08]" />
                <Skeleton className="h-3 w-1/2 bg-white/[0.08]" />
              </div>
            ) : (
              projects.map((project) => (
                <NavItem
                  key={project.id}
                  to={projectPath(project)}
                  label={project.name}
                  indent
                />
              ))
            )}

            {!projectsLoading && projects.length === 0 && (
              <p className="px-md py-xs text-caption text-white/40">
                No projects yet
              </p>
            )}
          </div>
        )}
      </nav>

      {/* What's new row — small trigger above notifications. Dot
          appears when there's an unseen release. */}
      <div className="border-t border-white/[0.08] px-sm pt-sm">
        <button
          type="button"
          onClick={openWhatsNew}
          className="w-full flex items-center gap-sm rounded-md px-sm py-sm
            hover:bg-white/[0.06] transition-colors duration-fast text-left"
        >
          <div className="relative h-8 w-8 shrink-0 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
            {hasUnseenChangelog && (
              <span
                aria-label="New release available"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-warning border border-[rgb(6_29_111)] dark:border-[rgb(12_14_22)]"
              />
            )}
          </div>
          <span className="flex-1 text-bodySm text-white/90 truncate">
            What's new
          </span>
        </button>
      </div>

      {/* Notifications row — sits above the user profile, mirrors its
          padding so the two read as a single footer block. */}
      <div className="px-sm pt-sm">
        <button
          type="button"
          onClick={onOpenNotifications}
          className="w-full flex items-center gap-sm rounded-md px-sm py-sm
            hover:bg-white/[0.06] transition-colors duration-fast text-left"
        >
          <div className="relative h-8 w-8 shrink-0 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
            <Bell className="h-4 w-4 text-white" />
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread`}
                className="absolute -top-1 -right-1 inline-flex items-center justify-center
                  h-4 min-w-[16px] px-[3px] rounded-full bg-error text-white
                  text-[10px] font-semibold leading-none border border-[rgb(6_29_111)] dark:border-[rgb(12_14_22)]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span className="flex-1 text-bodySm text-white/90 truncate">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="text-caption text-white/60 shrink-0 tabular-nums">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* User */}
      <div className="relative p-sm">
        <div className="flex items-center gap-sm rounded-md px-sm py-sm hover:bg-white/[0.06] transition-colors duration-fast">
          <div className="h-8 w-8 shrink-0 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-white text-caption font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-bodySm text-white font-medium truncate">
              {profile?.name || user?.email || "User"}
            </p>
            {profile?.role && (
              <p className="text-caption text-white/50 capitalize truncate">
                {profile.role}
              </p>
            )}
          </div>
          <IconButton
            icon={theme === "dark" ? Sun : Moon}
            onClick={toggleTheme}
            size="sm"
            variant="ghost-dark"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          />
          <IconButton
            icon={Settings}
            to="/settings"
            size="sm"
            variant="ghost-dark"
            aria-label="Settings"
          />
          <IconButton
            icon={LogOut}
            onClick={logout}
            size="sm"
            variant="ghost-dark"
            aria-label="Sign out"
          />
        </div>
      </div>

    </aside>
    </>
  );
};

export default Sidebar;
