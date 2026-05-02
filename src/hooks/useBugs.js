import { useEffect, useState } from "react";
import { listenToBugs } from "../services/bug.service";

const useBugs = (projectId) => {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBugs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = listenToBugs(projectId, (data) => {
      setBugs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [projectId]);

  return { bugs, loading };
};

export default useBugs;
