import { useEffect, useState } from "react";
import { listenToRecentMeetingNotes } from "../services/meetingNotes.service";

const useRecentMeetingNotes = (limit = 5) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToRecentMeetingNotes(limit, (data) => {
      setNotes(data || []);
      setError(null);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, [limit]);

  return { notes, loading, error };
};

export default useRecentMeetingNotes;
