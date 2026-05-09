import { useEffect, useState } from "react";
import { listenToMeetingNotes } from "../services/meetingNotes.service";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

const useMeetingNotes = (projectId) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = listenToMeetingNotes(projectId, {
      onData: (data) => {
        setNotes(data || []);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        const parsed = parseError(err);
        logger.error("useMeetingNotes", parsed, { projectId });
        setError(parsed);
        setLoading(false);
      },
    });
    return () => unsubscribe?.();
  }, [projectId]);

  return { notes, loading, error };
};

export default useMeetingNotes;
