import { useEffect, useState } from "react";
import { collectionGroup, onSnapshot, query } from "firebase/firestore";
import { db } from "../services/firebase";

/* =============================================================
   useBugCounts — single cross-project listener that powers:
     - dashboard "Open bugs" stat
     - per-project bug count on the Projects list / ProjectCard
     - any future board-wide totals

   We stream all bug docs (lean fields are fine — we only read
   projectId + status) and bucket client-side. One subscription
   regardless of project count.

   "Open" is anything that isn't "done". Empty status is treated
   as backlog and counted as open.
============================================================= */

const useBugCounts = () => {
  const [countsByProjectId, setCountsByProjectId] = useState({});
  const [totalOpen, setTotalOpen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const q = query(collectionGroup(db, "bugs"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const counts = {};
        let total = 0;

        snap.docs.forEach((d) => {
          const projectId = d.ref.parent.parent?.id;
          if (!projectId) return;
          const status = d.get("status") || "backlog";
          if (status === "done") return;
          counts[projectId] = (counts[projectId] || 0) + 1;
          total += 1;
        });

        setCountsByProjectId(counts);
        setTotalOpen(total);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("useBugCounts:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { countsByProjectId, totalOpen, loading, error };
};

export default useBugCounts;
