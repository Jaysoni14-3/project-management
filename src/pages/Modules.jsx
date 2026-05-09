import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layers, Search } from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/error/ErrorState";

import { useAllModules } from "../hooks/useModules";
import { useProjects } from "../hooks/useProjects";
import { useAuth } from "../context/AuthContext";

import ModuleCard from "../features/modules/ModuleCard";
import ModuleViewModal from "../features/modules/ModuleViewModal";
import ModuleFormModal from "../features/modules/ModuleFormModal";
import { deleteModule } from "../services/module.service";
import ConfirmDeleteModal from "../components/ui/ConfirmDeleteModal";
import { toast } from "react-toastify";
import { STATUS, STATUS_ORDER } from "../features/modules/constants";

const Modules = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { projects } = useProjects();

  /* `?mine=1` flips the page into a personal view: filter to the current
     user's modules and show "My modules" in the header. Otherwise it's
     the workspace-wide view used by managers/admins. */
  const mineParam = searchParams.get("mine") === "1";
  const projectFilter = searchParams.get("projectId") || "";
  const statusFilter = searchParams.get("status") || "";

  const filters = useMemo(
    () => ({
      mine: mineParam,
      projectId: projectFilter || undefined,
      status: statusFilter || undefined,
    }),
    [mineParam, projectFilter, statusFilter]
  );

  const { modules, loading, error } = useAllModules(filters);

  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState(null);

  /* Notification deep-link: `?moduleId=<id>` opens that module's view
     modal once the list lands, then strips the param from the URL so
     the back button doesn't replay it. */
  useEffect(() => {
    const target = searchParams.get("moduleId");
    if (!target || !modules.length) return;
    const match = modules.find((m) => m.id === target);
    if (match) {
      setViewing(match);
      const next = new URLSearchParams(searchParams);
      next.delete("moduleId");
      setSearchParams(next, { replace: true });
    }
  }, [modules, searchParams, setSearchParams]);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.title?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.assigneeName?.toLowerCase().includes(q) ||
        m.projectName?.toLowerCase().includes(q)
    );
  }, [modules, search]);

  /* Group by status so the page reads as three sections. Done modules
     drop to the bottom; in-progress takes the top spot. */
  const grouped = useMemo(() => {
    const buckets = { in_progress: [], not_started: [], completed: [] };
    for (const m of filtered) {
      const s = m.status || "not_started";
      (buckets[s] || buckets.not_started).push(m);
    }
    return buckets;
  }, [filtered]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  /* Editing requires knowing the project's members for the assignee
     dropdown. Pull from the projects list we already fetch. */
  const editingProject = useMemo(
    () =>
      editing
        ? projects.find((p) => p.id === editing.projectId) || null
        : null,
    [editing, projects]
  );

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeletingBusy(true);
      await deleteModule(deleting.id);
      toast.success("Module deleted");
      setDeleting(null);
      setViewing(null);
    } catch (err) {
      toast.error(err?.message || "Couldn't delete module");
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader
        title={mineParam ? "My modules" : "Modules"}
        description={
          mineParam
            ? "Everything you've owned — active and historical."
            : "Track what every team member is building, top to bottom."
        }
      />

      <Card padded={false}>
        <div className="px-lg py-md flex flex-wrap gap-md items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description, owner…"
              className="w-full h-control rounded-md border border-line bg-surface pl-9 pr-3 text-body text-fg
                placeholder:text-fg-subtle
                focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setFilter("projectId", e.target.value)}
            className="h-control rounded-md border border-line bg-surface px-3 text-body text-fg
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setFilter("status", e.target.value)}
            className="h-control rounded-md border border-line bg-surface px-3 text-body text-fg
              focus:border-accent focus:shadow-focus-ring focus:outline-none transition"
          >
            <option value="">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS[s].label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setFilter("mine", mineParam ? "" : "1")}
            className={`h-control px-md rounded-md border text-bodySm transition-colors duration-fast
              ${
                mineParam
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-fg-muted hover:text-fg hover:bg-subtle"
              }`}
          >
            {mineParam ? "Showing mine" : "Show only mine"}
          </button>
        </div>
      </Card>

      {error && modules.length === 0 ? (
        <ErrorState
          error={error}
          title="Couldn't load modules"
          onRetry={() => window.location.reload()}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={mineParam ? "Nothing assigned to you yet" : "No modules yet"}
          description={
            mineParam
              ? "When a manager creates a module and assigns it to you, it'll appear here."
              : "Modules give every project a clear, owner-attributed history of what was built."
          }
        />
      ) : (
        <div className="flex flex-col gap-xl">
          {STATUS_ORDER.filter((s) => s !== "completed").map((s) =>
            grouped[s].length > 0 ? (
              <section key={s} className="flex flex-col gap-md">
                <div className="flex items-center gap-md">
                  <h2 className="text-section text-fg">{STATUS[s].label}</h2>
                  <span className="text-caption text-fg-subtle tabular-nums">
                    {grouped[s].length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                  {grouped[s].map((m) => (
                    <ModuleCard
                      key={m.id}
                      module={m}
                      onOpen={setViewing}
                      showProject
                    />
                  ))}
                </div>
              </section>
            ) : null
          )}

          {grouped.completed.length > 0 && (
            <section className="flex flex-col gap-md">
              <div className="flex items-center gap-md">
                <h2 className="text-section text-fg">Completed</h2>
                <span className="text-caption text-fg-subtle tabular-nums">
                  {grouped.completed.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {grouped.completed.map((m) => (
                  <ModuleCard
                    key={m.id}
                    module={m}
                    onOpen={setViewing}
                    showProject
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ModuleViewModal
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        moduleId={viewing?.id}
        onEdit={(m) => {
          setEditing(m);
          setViewing(null);
        }}
        onDelete={(m) => {
          setDeleting(m);
          setViewing(null);
        }}
      />

      {editing && (
        <ModuleFormModal
          isOpen={Boolean(editing)}
          onClose={() => setEditing(null)}
          projectId={editing.projectId}
          module={editing}
          members={editingProject?.members || []}
          currentUserId={user?.uid}
        />
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
        loading={deletingBusy}
        title="Delete module"
        description={
          deleting
            ? `“${deleting.title}” will be permanently removed along with its history.`
            : ""
        }
      />
    </div>
  );
};

export default Modules;
