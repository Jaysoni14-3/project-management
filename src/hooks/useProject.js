import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Realtime listener for a single project doc by id.
 * Returns { project, loading, error }.
 * - project === null + !loading + !error → not found
 * - project === null + loading             → fetching
 */
export const useProject = (projectId) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "projects", projectId),
      (snap) => {
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() });
        } else {
          setProject(null);
        }
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("useProject:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  return { project, loading, error };
};

export default useProject;
