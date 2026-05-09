import { useEffect, useState } from "react";
import { listenToAllTasks } from "../services/task.service";

const useAllTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = listenToAllTasks((data) => {
      setTasks(data || []);
      setError(null);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, []);

  return { tasks, loading, error };
};

export default useAllTasks;
