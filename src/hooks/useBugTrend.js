import { useEffect, useState } from "react";
import { listenToBugTrend } from "../services/dashboard.service";

const useBugTrend = (days = 30) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToBugTrend((rows) => {
      setData(rows);
      setLoading(false);
    }, days);
    return () => unsub?.();
  }, [days]);

  return { data, loading };
};

export default useBugTrend;
