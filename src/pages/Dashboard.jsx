import { useAuth } from "../context/AuthContext"

import AdminDashboard from "./AdminDashboard"
import EmployeeDashboard from "./EmployeeDashboard"
import HRDashboard from "./HRDashboard"

const Dashboard = () => {
  const { user, role, loading } = useAuth()

  if (loading) {
    return <div>Loading dashboard...</div>
  }

  // Not logged in at all
  if (!user) {
    return <div>Please log in</div>
  }

  // Logged in, but role not loaded / missing
  if (!role) {
    return <div>Setting up your account...</div>
  }

  if (role === "admin") return <AdminDashboard />
  if (role === "hr") return <HRDashboard />
  if (role === "employee" || role === "manager") {
    return <EmployeeDashboard />
  }

  return <div>Unauthorized access</div>
}

export default Dashboard