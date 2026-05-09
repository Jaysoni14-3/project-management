import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, FolderKanban, Bug, StickyNote } from "lucide-react";

import Spinner from "../ui/Spinner";
import useGlobalSearch from "../../hooks/useGlobalSearch";
import {
  projectPath,
  projectPathFromName,
  employeePath,
} from "../../lib/slug";

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* ──────────────────────────────────────────────────────────────────────
   Result rows — one per kind. Each is a Link so click closes the
   dropdown via the parent's onSelect handler.
   ────────────────────────────────────────────────────────────────────── */

const ResultRow = ({ to, onSelect, leading, primary, secondary, badge }) => (
  <li>
    <Link
      to={to}
      onClick={onSelect}
      className="flex items-center gap-md px-md py-sm rounded-md
        hover:bg-subtle/60 transition-colors duration-fast"
    >
      <div className="shrink-0">{leading}</div>
      <div className="flex-1 min-w-0">
        <p className="text-bodySm text-fg font-medium truncate">{primary}</p>
        {secondary && (
          <p className="text-caption text-fg-subtle truncate">{secondary}</p>
        )}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </Link>
  </li>
);

const Group = ({ label, children }) =>
  React.Children.toArray(children).filter(Boolean).length === 0 ? null : (
    <div className="py-xs">
      <p className="px-md pt-xs pb-xs text-eyebrow uppercase text-fg-subtle tracking-wider">
        {label}
      </p>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );

/* ──────────────────────────────────────────────────────────────────────
   GlobalSearch — input + dropdown. LinkedIn-style: dropdown anchored
   to the input, click-outside or Esc closes it.
   ────────────────────────────────────────────────────────────────────── */

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { results, loading, isEmpty } = useGlobalSearch(query);

  /* Click-outside closer. Listening on mousedown (not click) feels
     snappier and avoids races with a result-row click. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      /* Ctrl/Cmd-K to focus the search bar — common pattern, free win. */
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSelect = () => {
    setOpen(false);
    setQuery("");
  };

  const trimmed = query.trim();
  const showDropdown = open && trimmed.length >= 2;
  const showNoResults = showDropdown && !loading && isEmpty;

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[480px]">
      <div className="relative">
        <Search className="absolute left-md top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search projects, people, bugs, meeting notes…"
          className="w-full h-control pl-[36px] pr-[36px] rounded-md border border-line
            bg-surface text-body text-fg placeholder:text-fg-subtle
            focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          aria-label="Global search"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-md top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition-colors duration-fast"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className="absolute left-0 right-0 mt-xs bg-elevated border border-line
            rounded-lg shadow-lg overflow-hidden z-dropdown
            max-h-[480px] overflow-y-auto animate-slide-down"
        >
          {loading && isEmpty && (
            <div className="flex items-center gap-sm px-md py-md text-bodySm text-fg-subtle">
              <Spinner size="xs" />
              Searching…
            </div>
          )}

          {showNoResults && (
            <div className="px-md py-md text-bodySm text-fg-subtle text-center">
              No matches for "{trimmed}"
            </div>
          )}

          {!isEmpty && (
            <div className="px-xs py-xs">
              <Group label="People">
                {results.users.map((u) => (
                  <ResultRow
                    key={u.id}
                    to={employeePath(u)}
                    onSelect={handleSelect}
                    leading={
                      u.avatar ? (
                        <img
                          src={`/images/${u.avatar}`}
                          alt={u.name}
                          className="h-7 w-7 rounded-full object-cover border border-line"
                        />
                      ) : (
                        <span className="h-7 w-7 rounded-full bg-accent-soft text-accent text-[10px] font-semibold inline-flex items-center justify-center">
                          {initials(u.name)}
                        </span>
                      )
                    }
                    primary={u.name}
                    secondary={
                      [u.designation, u.role && u.role[0].toUpperCase() + u.role.slice(1)]
                        .filter(Boolean)
                        .join(" · ") || u.email
                    }
                  />
                ))}
              </Group>

              <Group label="Projects">
                {results.projects.map((p) => (
                  <ResultRow
                    key={p.id}
                    to={projectPath(p)}
                    onSelect={handleSelect}
                    leading={
                      <div className="h-7 w-7 rounded-md bg-accent-soft text-accent flex items-center justify-center">
                        <FolderKanban className="h-3.5 w-3.5" />
                      </div>
                    }
                    primary={p.name}
                    secondary={p.clientName || (p.status && `Status: ${p.status}`)}
                  />
                ))}
              </Group>

              <Group label="Bugs">
                {results.bugs.map((b) => (
                  <ResultRow
                    key={b.id}
                    to={`${projectPathFromName(b.project?.name, b.projectId)}/bugs`}
                    onSelect={handleSelect}
                    leading={
                      <div className="h-7 w-7 rounded-md bg-error-50 text-error-700 flex items-center justify-center">
                        <Bug className="h-3.5 w-3.5" />
                      </div>
                    }
                    primary={b.title}
                    secondary={b.project?.name}
                  />
                ))}
              </Group>

              <Group label="Meeting notes">
                {results.notes.map((n) => (
                  <ResultRow
                    key={n.id}
                    to={projectPathFromName(n.project?.name, n.projectId)}
                    onSelect={handleSelect}
                    leading={
                      <div className="h-7 w-7 rounded-md bg-accent-soft text-accent flex items-center justify-center">
                        <StickyNote className="h-3.5 w-3.5" />
                      </div>
                    }
                    primary={n.title}
                    secondary={n.project?.name}
                  />
                ))}
              </Group>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
