import { useEffect, useState } from "react";
import { listenToTasks } from "../services/task.service";

const useTasks = (projectId) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTasks([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = listenToTasks(projectId, (data) => {
      setTasks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [projectId]);

  return { tasks, loading };
};

export default useTasks;
