import { useEffect, useState } from "react";
import { listenToAllBugs } from "../services/bug.service";

const useAllBugs = () => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToAllBugs((data) => {
      setBugs(data || []);
      setError(null);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, []);

  return { bugs, loading, error };
};

export default useAllBugs;
