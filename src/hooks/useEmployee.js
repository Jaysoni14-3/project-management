import { useEffect, useState } from "react";
import { listenToEmployees } from "../services/employee.service";

const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToEmployees((data) => {
      setEmployees(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { employees, loading };
};

export default useEmployees;
