import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Users,
  UserPlus,
  Briefcase,
  CalendarDays,
} from "lucide-react";

import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/Dashboard/StatCard";

import { useAuth } from "../context/AuthContext";
import useEmployees from "../hooks/useEmployee";

const formatDate = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const greetingName = (email) => {
  if (!email) return "there";
  const handle = email.split("@")[0]?.split(".")[0] ?? "there";
  return handle.charAt(0).toUpperCase() + handle.slice(1);
};

const initials = (name = "?") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatJoined = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isThisMonth = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  );
};

const roleAccent = {
  admin:    "bg-error-50 text-error-700",
  manager:  "bg-accent-soft text-accent",
  hr:       "bg-warning-50 text-warning-700",
  employee: "bg-subtle text-fg-muted",
};

/* ============================================================
   Role breakdown
============================================================ */
const RoleBreakdownPanel = ({ employees, loading }) => {
  const counts = useMemo(() => {
    const map = { admin: 0, manager: 0, hr: 0, employee: 0 };
    employees?.forEach((e) => {
      const r = (e.role || "employee").toLowerCase();
      if (r in map) map[r] += 1;
      else map.employee += 1;
    });
    return map;
  }, [employees]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 0;
  const max = Math.max(1, ...Object.values(counts));

  return (
    <Card
      padded={false}
      header={<h2 className="text-section text-fg">By role</h2>}
    >
      <div className="px-lg py-md flex flex-col gap-md">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-xs">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))
          : total === 0
          ? (
            <p className="text-bodySm text-fg-muted">
              No teammates yet — once HR adds people, the role split will appear here.
            </p>
          ) : (
            Object.entries(counts).map(([role, count]) => {
              const pct = (count / max) * 100;
              return (
                <div key={role} className="flex flex-col gap-xs">
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-caption font-medium px-sm py-[1px] rounded-xs capitalize ${roleAccent[role] ?? roleAccent.employee}`}
                    >
                      {role}
                    </span>
                    <span className="text-bodySm text-fg font-medium tabular-nums">
                      {count}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-slower"
                      style={{ width: `${count === 0 ? 0 : Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
      </div>
    </Card>
  );
};

/* ============================================================
   Designation breakdown
============================================================ */
const DesignationPanel = ({ employees, loading }) => {
  const items = useMemo(() => {
    const map = new Map();
    employees?.forEach((e) => {
      const key = (e.designation || "").trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [employees]);

  return (
    <Card
      padded={false}
      header={<h2 className="text-section text-fg">By designation</h2>}
    >
      {loading ? (
        <div className="px-lg py-md flex flex-col gap-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-lg py-lg">
          <EmptyState
            icon={Briefcase}
            title="No designations set"
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {items.map(([title, count]) => (
            <li
              key={title}
              className="flex items-center justify-between px-lg py-sm"
            >
              <span className="text-bodySm text-fg-muted truncate">{title}</span>
              <span className="text-bodySm text-fg font-medium tabular-nums shrink-0">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

/* ============================================================
   Recently joined
============================================================ */
const RecentlyJoinedPanel = ({ employees, loading }) => {
  const recent = useMemo(() => {
    if (!employees?.length) return [];
    return [...employees]
      .filter((e) => e.joinedDate)
      .sort(
        (a, b) =>
          new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime()
      )
      .slice(0, 6);
  }, [employees]);

  return (
    <Card
      padded={false}
      header={
        <>
          <h2 className="text-section text-fg">Recently joined</h2>
          <Link
            to="/employees"
            className="inline-flex items-center gap-xs text-bodySm text-accent hover:text-accent-hover transition-colors duration-fast"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      }
    >
      {loading ? (
        <ul className="divide-y divide-line-subtle">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-md px-lg py-md">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 flex flex-col gap-xs">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </li>
          ))}
        </ul>
      ) : recent.length === 0 ? (
        <div className="px-lg py-lg">
          <EmptyState
            icon={UserPlus}
            title="No recent joiners"
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {recent.map((emp) => (
            <li
              key={emp.id}
              className="flex items-center gap-md px-lg py-md hover:bg-subtle/60 transition-colors duration-fast"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center text-caption font-semibold overflow-hidden">
                {emp.avatar ? (
                  <img
                    src={`/images/${emp.avatar}`}
                    alt={emp.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials(emp.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body text-fg font-medium truncate capitalize">
                  {emp.name || "Unnamed"}
                </p>
                <p className="text-caption text-fg-subtle truncate">
                  {emp.designation || (emp.role ? `${emp.role}` : "—")}
                  {" · "}
                  Joined {formatJoined(emp.joinedDate)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

/* ============================================================
   Page
============================================================ */
const HRDashboard = () => {
  const { user } = useAuth();
  const { employees, loading } = useEmployees();

  const totalMembers = employees?.length ?? 0;
  const newThisMonth = useMemo(
    () => (employees ?? []).filter((e) => isThisMonth(e.joinedDate)).length,
    [employees]
  );
  const assignedCount = useMemo(
    () =>
      (employees ?? []).filter(
        (e) => Array.isArray(e.assignedProjects) && e.assignedProjects.length > 0
      ).length,
    [employees]
  );
  const managers = useMemo(
    () =>
      (employees ?? []).filter(
        (e) => (e.role || "").toLowerCase() === "manager"
      ).length,
    [employees]
  );

  return (
    <div className="flex flex-col gap-xl">
      <PageHeader
        eyebrow={formatDate()}
        title={`Welcome back, ${greetingName(user?.email)}`}
        actions={
          <Link
            to="/employees"
            className="inline-flex items-center justify-center gap-sm h-control px-lg rounded-md
              bg-accent text-accent-fg text-body font-medium
              hover:bg-accent-hover transition-colors duration-fast"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Invite teammate
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard
          label="Team members"
          value={totalMembers}
          icon={Users}
          variant="accent"
          loading={loading}
        />
        <StatCard
          label="New this month"
          value={newThisMonth}
          icon={CalendarDays}
          variant="success"
          loading={loading}
        />
        <StatCard
          label="On a project"
          value={assignedCount}
          icon={Briefcase}
          variant="default"
          loading={loading}
        />
        <StatCard
          label="Managers"
          value={managers}
          icon={UserPlus}
          variant="default"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-7">
          <RoleBreakdownPanel employees={employees} loading={loading} />
        </div>
        <div className="lg:col-span-5">
          <DesignationPanel employees={employees} loading={loading} />
        </div>
      </div>

      <RecentlyJoinedPanel employees={employees} loading={loading} />
    </div>
  );
};

export default HRDashboard;
