import { useEffect, useState } from "react";
import { listenToTasks } from "../services/task.service";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

const useTasks = (projectId) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = listenToTasks(projectId, {
      onData: (data) => {
        setTasks(data || []);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        const parsed = parseError(err);
        logger.error("useTasks", parsed, { projectId });
        setError(parsed);
        setLoading(false);
      },
    });
    return () => unsubscribe?.();
  }, [projectId]);

  return { tasks, loading, error };
};

export default useTasks;
