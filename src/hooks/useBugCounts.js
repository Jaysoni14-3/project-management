import { useEffect, useState } from "react";
import { listenToBugCounts } from "../services/dashboard.service";

const useBugCounts = () => {
  const [countsByProjectId, setCountsByProjectId] = useState({});
  const [totalOpen, setTotalOpen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToBugCounts((data) => {
      setCountsByProjectId(data.countsByProjectId || {});
      setTotalOpen(data.totalOpen || 0);
      setError(null);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, []);

  return { countsByProjectId, totalOpen, loading, error };
};

export default useBugCounts;
