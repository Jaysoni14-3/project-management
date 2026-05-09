import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/dashboard.service";

const useDashboardStats = () => {
  const [stats, setStats] = useState({
    employeeCount: 0,
    activeProjectCount: 0,
    completedProjectCount: 0,
    statsLoading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getDashboardStats();
        if (!cancelled) {
          setStats({ ...next, statsLoading: false });
        }
      } catch (error) {
        console.error("Dashboard stats error:", error);
        if (!cancelled) {
          setStats((prev) => ({ ...prev, statsLoading: false }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
};

export default useDashboardStats;
