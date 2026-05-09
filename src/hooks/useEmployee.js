import { useEffect, useState } from "react";
import { listenToEmployees } from "../services/employee.service";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToEmployees({
      onData: (data) => {
        setEmployees(data || []);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        const parsed = parseError(err);
        logger.error("useEmployees", parsed);
        setError(parsed);
        setLoading(false);
      },
    });
    return () => unsubscribe?.();
  }, []);

  return { employees, loading, error };
};

export default useEmployees;
