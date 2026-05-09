import { useEffect, useState } from "react";
import { listenToBugs } from "../services/bug.service";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

const useBugs = (projectId) => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setBugs([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = listenToBugs(projectId, {
      onData: (data) => {
        setBugs(data || []);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        const parsed = parseError(err);
        logger.error("useBugs", parsed, { projectId });
        setError(parsed);
        setLoading(false);
      },
    });
    return () => unsubscribe?.();
  }, [projectId]);

  return { bugs, loading, error };
};

export default useBugs;
