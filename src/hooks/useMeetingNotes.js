import { useEffect, useState } from "react";
import { listenToMeetingNotes } from "../services/meetingNotes.service";

const useMeetingNotes = (projectId) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = listenToMeetingNotes(projectId, (data) => {
      setNotes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [projectId]);

  return { notes, loading };
};

export default useMeetingNotes;
