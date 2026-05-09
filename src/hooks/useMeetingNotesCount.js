import { useEffect, useState } from "react";
import { listenToMeetingNotesCount } from "../services/dashboard.service";

const useMeetingNotesCount = () => {
  const [countsByProjectId, setCountsByProjectId] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToMeetingNotesCount((data) => {
      setCountsByProjectId(data.countsByProjectId || {});
      setTotal(data.total || 0);
      setError(null);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, []);

  return { countsByProjectId, total, loading, error };
};

export default useMeetingNotesCount;
