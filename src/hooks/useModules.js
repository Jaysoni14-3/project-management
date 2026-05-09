import { useEffect, useState } from "react";
import {
  listenToProjectModules,
  listenToAllModules,
  listenToMyModules,
} from "../services/module.service";
import { parseError } from "../lib/errors";
import logger from "../lib/logger";

const makeHandlers = (scope, setData, setLoading, setError, meta) => ({
  onData: (data) => {
    setData(data || []);
    setError(null);
    setLoading(false);
  },
  onError: (err) => {
    const parsed = parseError(err);
    logger.error(scope, parsed, meta);
    setError(parsed);
    setLoading(false);
  },
});

/* Project-scoped modules. Mirrors useBugs / useTasks. */
export const useProjectModules = (projectId) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) {
      setModules([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsub = listenToProjectModules(
      projectId,
      makeHandlers("useProjectModules", setModules, setLoading, setError, {
        projectId,
      })
    );
    return () => unsub?.();
  }, [projectId]);

  return { modules, loading, error };
};

export const useAllModules = (filters = {}) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterKey = JSON.stringify(filters || {});

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = listenToAllModules(
      JSON.parse(filterKey),
      makeHandlers("useAllModules", setModules, setLoading, setError, {
        filterKey,
      })
    );
    return () => unsub?.();
  }, [filterKey]);

  return { modules, loading, error };
};

export const useMyModules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = listenToMyModules(
      makeHandlers("useMyModules", setModules, setLoading, setError)
    );
    return () => unsub?.();
  }, []);

  return { modules, loading, error };
};

export default useProjectModules;
