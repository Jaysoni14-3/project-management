import { useEffect, useState } from "react";
import { listenToTaskCounts } from "../services/dashboard.service";

const useTaskCounts = () => {
  const [countsByProjectId, setCountsByProjectId] = useState({});
  const [totalOpen, setTotalOpen] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToTaskCounts((data) => {
      setCountsByProjectId(data.countsByProjectId || {});
      setTotalOpen(data.totalOpen || 0);
      setTotal(data.total || 0);
      setError(null);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, []);

  return { countsByProjectId, totalOpen, total, loading, error };
};

export default useTaskCounts;
