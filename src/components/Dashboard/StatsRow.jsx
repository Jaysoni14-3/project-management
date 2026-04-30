import React from "react";
import { CheckCircle2, TrendingUp, Users, Bug } from "lucide-react";
import StatCard from "./StatCard";

const StatsRow = ({
  employeeCount,
  activeProjectCount,
  completedProjectCount,
  statsLoading,
  bugs,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
      <StatCard
        label="Active projects"
        value={activeProjectCount}
        icon={TrendingUp}
        variant="accent"
        loading={statsLoading}
      />
      <StatCard
        label="Completed projects"
        value={completedProjectCount}
        icon={CheckCircle2}
        variant="success"
        loading={statsLoading}
      />
      <StatCard
        label="Team members"
        value={employeeCount}
        icon={Users}
        variant="default"
        loading={statsLoading}
      />
      <StatCard
        label="Open bugs"
        value={bugs}
        icon={Bug}
        variant="danger"
        loading={statsLoading}
      />
    </div>
  );
};

export default StatsRow;
