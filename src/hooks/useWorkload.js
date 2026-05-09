import { useEffect, useState } from "react";
import { listenToWorkload } from "../services/dashboard.service";

const useWorkload = (limit = 8) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToWorkload((rows) => {
      setData(rows);
      setLoading(false);
    }, limit);
    return () => unsub?.();
  }, [limit]);

  return { data, loading };
};

export default useWorkload;
