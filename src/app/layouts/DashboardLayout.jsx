
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import ImpersonationBanner from "../../components/layout/ImpersonationBanner";
import WhatsNewModal from "../../components/whats-new/WhatsNewModal";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";
import useWhatsNew from "../../hooks/useWhatsNew";


export default function DashboardLayout() {
  /* Single source of truth for the What's new modal — managed at the
     layout level so any sidebar / header trigger can open it via the
     same hook instance. */
  const { entries, open, close } = useWhatsNew();

  /* Notifications panel state lives here so both the desktop sidebar
     bell and the mobile header bell can drive a single panel
     instance. Otherwise we'd duplicate the polling subscription and
     get drift between the two badge counts. */
  const [notifsOpen, setNotifsOpen] = useState(false);
  const openNotifs = () => setNotifsOpen(true);
  const closeNotifs = () => setNotifsOpen(false);

  return (
    <div className="min-h-screen bg-bg">
      {/* Impersonation banner sits at the very top — outside the flex
          row so it spans the entire viewport, including over the
          sidebar. Hard to miss is the point. */}
      <ImpersonationBanner />
      <div className="flex">
        <Sidebar onOpenNotifications={openNotifs} />
        <main className="flex-1 min-w-0 flex flex-col">
          <Header onOpenNotifications={openNotifs} />
          <div className="flex-1 px-xl py-xl">
            <Outlet />
          </div>
        </main>
      </div>
      <WhatsNewModal entries={entries} isOpen={open} onClose={close} />
      <NotificationsPanel isOpen={notifsOpen} onClose={closeNotifs} />
    </div>
  );
}
