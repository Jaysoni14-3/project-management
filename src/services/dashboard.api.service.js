import { api, subscribe } from "./apiClient";

export const listenToTaskCounts = (callback) =>
  subscribe(
    () => api.get("/api/dashboard/counts"),
    (data) =>
      callback({
        countsByProjectId: data.tasks?.byProject || {},
        totalOpen: data.tasks?.totalOpen || 0,
        total: data.tasks?.total || 0,
      })
  );

export const listenToBugCounts = (callback) =>
  subscribe(
    () => api.get("/api/dashboard/counts"),
    (data) =>
      callback({
        countsByProjectId: data.bugs?.byProject || {},
        totalOpen: data.bugs?.totalOpen || 0,
      })
  );

export const listenToMeetingNotesCount = (callback) =>
  subscribe(
    () => api.get("/api/dashboard/counts"),
    (data) =>
      callback({
        countsByProjectId: data.meetingNotes?.byProject || {},
        total: data.meetingNotes?.total || 0,
      })
  );

export const getManagers = async () => {
  const users = await api.get("/api/users");
  return (users || []).filter((u) => u.isManager || u.role === "manager");
};

export const getDashboardStats = async () => {
  const [stats, projects] = await Promise.all([
    api.get("/api/dashboard/stats"),
    api.get("/api/projects"),
  ]);

  const activeProjectCount = projects.filter((p) => p.status === "active").length;
  const completedProjectCount = projects.filter((p) => p.status === "completed").length;

  return {
    employeeCount: stats.totalUsers ?? 0,
    activeProjectCount,
    completedProjectCount,
  };
};

/* Polling subscriptions for the dashboard charts. 60s interval since
   these endpoints scan more rows than the counts endpoint and the
   underlying numbers don't shift fast. */
export const listenToBugTrend = (callback, days = 30) =>
  subscribe(
    () => api.get(`/api/dashboard/bug-trend?days=${days}`),
    (data) => callback(Array.isArray(data) ? data : []),
    60000
  );

export const listenToWorkload = (callback, limit = 8) =>
  subscribe(
    () => api.get(`/api/dashboard/workload?limit=${limit}`),
    (data) => callback(Array.isArray(data) ? data : []),
    60000
  );
