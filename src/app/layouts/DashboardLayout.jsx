
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";


export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 px-xl py-xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
