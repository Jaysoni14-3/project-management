import { Routes, Route } from "react-router-dom";
import RequireAuth from "../guards/RequireAuth";

import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";


import Dashboard from "../../pages/Dashboard";
import Login from "../../pages/login";
import Register from "../../pages/Register";
import ProfileSettings from "../../pages/ProfileSettings";
import Projects from "../../pages/Projects";
import Employees from "../../pages/Employees";

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
        <Route path="/employees" element={<Employees />} />
      </Route>

    </Routes>
  );
}
