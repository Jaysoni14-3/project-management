import { Routes, Route } from "react-router-dom";
import RequireAuth from "../guards/RequireAuth";

import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";


import Dashboard from "../../pages/Dashboard";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import ProfileSettings from "../../pages/ProfileSettings";
import Projects from "../../pages/Projects";
import ProjectDetails from "../../pages/ProjectDetails";
import ProjectBugsBoard from "../../pages/ProjectBugsBoard";
import Employees from "../../pages/Employees";
import EmployeeDetails from "../../pages/EmployeeDetails";
import Bugs from "../../pages/Bugs";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

     

      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/settings" element={<ProfileSettings />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:projectSlug" element={<ProjectDetails />} />
        <Route path="/projects/:projectSlug/bugs" element={<ProjectBugsBoard />} />
        <Route path="/bugs" element={<Bugs />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:employeeSlug" element={<EmployeeDetails />} />
      </Route>

    </Routes>
  );
}
