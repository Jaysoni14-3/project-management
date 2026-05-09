import { useEffect, useState } from "react";
import { listenToAllBugs } from "../services/bug.service";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

const useAllBugs = () => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToAllBugs({
      onData: (data) => {
        setBugs(data || []);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        const parsed = parseError(err);
        logger.error("useAllBugs", parsed);
        setError(parsed);
        setLoading(false);
      },
    });
    return () => unsubscribe?.();
  }, []);

  return { bugs, loading, error };
};

export default useAllBugs;
