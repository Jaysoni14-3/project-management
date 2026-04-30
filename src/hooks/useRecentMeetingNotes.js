import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, orderBy, query, limit as fbLimit } from "firebase/firestore";
import { db } from "../services/firebase";

const useRecentMeetingNotes = (limit = 5) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(
      collectionGroup(db, "meetingNotes"),
      orderBy("createdAt", "desc"),
      fbLimit(limit)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setNotes(
          snap.docs.map((d) => ({
            id: d.id,
            projectId: d.ref.parent.parent?.id ?? null,
            ...d.data(),
          }))
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("useRecentMeetingNotes:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [limit]);

  return { notes, loading, error };
};

export default useRecentMeetingNotes;
