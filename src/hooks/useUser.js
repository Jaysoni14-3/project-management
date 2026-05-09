import { useEffect, useState } from "react";
import { listenToUser } from "../services/employee.service";

const useUser = (id) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setUser(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listenToUser(id, (next) => {
      setUser(next);
      setError(null);
      setLoading(false);
    });

    return () => unsubscribe?.();
  }, [id]);

  return { user, loading, error };
};

export default useUser;
