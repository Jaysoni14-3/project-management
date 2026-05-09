import { useEffect, useState } from "react";
import { listenToProject } from "../services/project.service";

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
    const unsubscribe = listenToProject(projectId, (next) => {
      setProject(next);
      setError(null);
      setLoading(false);
    });

    return () => unsubscribe?.();
  }, [projectId]);

  return { project, loading, error };
};

export default useProject;
