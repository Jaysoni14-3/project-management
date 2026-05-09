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
import Modules from "../../pages/Modules";
import Chat from "../../pages/Chat";
import NotFound from "../../pages/NotFound";
import Forbidden from "../../pages/Forbidden";
import ServerError from "../../pages/ServerError";

import RouteErrorBoundary from "../../components/error/RouteErrorBoundary";
import DevThrow from "../../components/dev/DevThrow";

/* Wrap a route element in a RouteErrorBoundary so a render error in
   one page can't take down the whole app — only that page's content
   bubbles into the fallback, while the dashboard chrome (sidebar /
   header) stays interactive. The `scope` is logged in error reports
   so we can tell at a glance which route blew up.

   `<DevThrow />` is included so `?dev_throw=…` on any route triggers
   a synthetic error inside the boundary. It's a no-op in production
   builds — see DevThrow.jsx. */
const guarded = (scope, node) => (
  <RouteErrorBoundary scope={scope}>
    <DevThrow />
    {node}
  </RouteErrorBoundary>
);

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={guarded("Login", <Login />)} />
        <Route path="/register" element={guarded("Register", <Register />)} />
      </Route>

      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={guarded("Dashboard", <Dashboard />)} />
        <Route path="/settings" element={guarded("Settings", <ProfileSettings />)} />
        <Route path="/projects" element={guarded("Projects", <Projects />)} />
        <Route
          path="/projects/:projectSlug"
          element={guarded("ProjectDetails", <ProjectDetails />)}
        />
        <Route
          path="/projects/:projectSlug/bugs"
          element={guarded("ProjectBugsBoard", <ProjectBugsBoard />)}
        />
        <Route path="/bugs" element={guarded("Bugs", <Bugs />)} />
        <Route path="/modules" element={guarded("Modules", <Modules />)} />
        <Route path="/chat" element={guarded("Chat", <Chat />)} />
        <Route path="/employees" element={guarded("Employees", <Employees />)} />
        <Route
          path="/employees/:employeeSlug"
          element={guarded("EmployeeDetails", <EmployeeDetails />)}
        />

        {/* Dedicated error pages (linkable + reachable via redirect) */}
        <Route path="/403" element={guarded("Forbidden", <Forbidden />)} />
        <Route path="/500" element={guarded("ServerError", <ServerError />)} />
      </Route>

      {/* Catch-all 404 — must come last. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
