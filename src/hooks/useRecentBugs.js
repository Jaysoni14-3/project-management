import { useEffect, useState } from "react";
import {
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  limit as fbLimit,
} from "firebase/firestore";
import { db } from "../services/firebase";

/* =============================================================
   useRecentBugs — cross-project realtime feed of the N most-
   recently-created bugs. Same shape as useRecentMeetingNotes
   so the dashboard panel stays consistent.

   Requires a Firestore rule for the `bugs` collectionGroup:
     match /{path=**}/bugs/{bugId} {
       allow read: if request.auth != null;
     }
============================================================= */

const useRecentBugs = (limit = 5) => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const q = query(
      collectionGroup(db, "bugs"),
      orderBy("createdAt", "desc"),
      fbLimit(limit)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setBugs(
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
        console.error("useRecentBugs:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [limit]);

  return { bugs, loading, error };
};

export default useRecentBugs;
