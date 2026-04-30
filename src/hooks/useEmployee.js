import { useEffect, useState } from "react";
import { getAllEmployees } from "../services/employee.service";
import { toast } from "react-toastify";

const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (error) {
      toast.error("Failed to fetch employees");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    employees,
    loading,
    refetchEmployees: fetchEmployees,
  };
};

export default useEmployees;
