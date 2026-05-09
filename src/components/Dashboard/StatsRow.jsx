import React from "react";
import {
  CheckCircle2,
  TrendingUp,
  Users,
  Bug,
  StickyNote,
  ListChecks,
} from "lucide-react";
import StatCard from "./StatCard";

const StatsRow = ({
  employeeCount,
  activeProjectCount,
  completedProjectCount,
  statsLoading,
  bugs,
  meetingNotes,
  meetingNotesLoading,
  tasks,
  tasksLoading,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-md">
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
        label="Open tasks"
        value={tasks}
        icon={ListChecks}
        variant="warning"
        loading={tasksLoading}
      />
      <StatCard
        label="Open bugs"
        value={bugs}
        icon={Bug}
        variant="danger"
        loading={statsLoading}
      />
      <StatCard
        label="Meeting notes"
        value={meetingNotes}
        icon={StickyNote}
        variant="default"
        loading={meetingNotesLoading}
      />
    </div>
  );
};

export default StatsRow;
