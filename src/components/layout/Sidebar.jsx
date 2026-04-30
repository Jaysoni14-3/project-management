import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ChevronDown,
  Settings,
  LogOut,
} from "lucide-react";

import NavItem from "../ui/NavItem";
import IconButton from "../ui/IconButton";
import Skeleton from "../ui/Skeleton";

import { useAuth } from "../../context/AuthContext";
import { useProjects } from "../../hooks/useProjects";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../services/firebase";

const Sidebar = () => {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [profile, setProfile] = useState(null);

  const { user, logout } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!cancelled) {
          setProfile(snap.exists() ? snap.data() : null);
        }
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
    <aside
      className="relative h-screen sticky top-0 w-sidebar shrink-0
        bg-accent text-white/85 flex flex-col
        border-r border-white/[0.08] overflow-hidden"
    >
      {/* Soft top highlight — adds depth so the brand fill doesn't read flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64
          bg-[radial-gradient(circle_at_50%_-30%,rgba(120,160,255,0.18),transparent_60%)]"
      />
      {/* Faint vignette at bottom for footer contrast */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32
          bg-gradient-to-t from-black/15 to-transparent"
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
                  to={`/projects/${project.id}`}
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

      {/* User */}
      <div className="relative border-t border-white/[0.08] p-sm">
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
  );
};

export default Sidebar;
