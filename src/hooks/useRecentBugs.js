import { useEffect, useState } from "react";
import { listenToRecentBugs } from "../services/bug.service";

const useRecentBugs = (limit = 5) => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToRecentBugs(limit, (data) => {
      setBugs(data || []);
      setError(null);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, [limit]);

  return { bugs, loading, error };
};

export default useRecentBugs;
