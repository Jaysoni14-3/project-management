import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listenToProjects } from "../services/project.service";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

/* Workspace-wide projects feed. Now exposes `error` so consuming pages
   can render an ErrorState instead of the misleading "no projects yet"
   empty state when the API actually failed. */
export const useProjects = () => {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    setLoading(true);
    setError(null);
    const unsubscribe = listenToProjects(user, role, {
      onData: (data) => {
        setProjects(data || []);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        const parsed = parseError(err);
        logger.error("useProjects", parsed);
        setError(parsed);
        setLoading(false);
      },
    });
    return () => unsubscribe?.();
  }, [user, role]);

  return { projects, loading, error };
};
