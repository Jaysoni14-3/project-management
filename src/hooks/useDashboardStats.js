import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../services/firebase";

const useDashboardStats = () => {
  const [stats, setStats] = useState({
    employeeCount: 0,
    activeProjectCount: 0,
    completedProjectCount: 0,
    statsLoading: true,
    bugs: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const employeesQuery = query(
          collection(db, "users"),
          where("role", "not-in", ["admin"])
        );

        // const clientsQuery = query(
        //   collection(db, "users"),
        //   where("role", "==", "client")
        // );

        const activeProjectsQuery = query(
          collection(db, "projects"),
          where("status", "==", "active")
        );

        const completedProjectsQuery = query(
          collection(db, "projects"),
          where("status", "==", "completed")
        );

        const [
            employeeSnap,
            activeSnap,
            completedSnap,
          ] = await Promise.all([
            getCountFromServer(employeesQuery),
            getCountFromServer(activeProjectsQuery),
            getCountFromServer(completedProjectsQuery),
          ]);
  
          setStats({
            employeeCount: employeeSnap.data().count,
            activeProjectCount: activeSnap.data().count,
            completedProjectCount: completedSnap.data().count,
            statsLoading: false,
            bugs: 17,
          });
        
      } catch (error) {
        console.error("Dashboard stats error:", error);
        setStats((prev) => ({ ...prev, statsLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};

export default useDashboardStats;
