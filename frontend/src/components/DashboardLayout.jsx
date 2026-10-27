import React, { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardNavbar from "./DashboardNavbar";
import ToastContainer from "./ToastContainer";
import "../styles/Dashboard.css";

function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dashboard-root">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="dashboard-main">
        <DashboardNavbar onOpenMobile={() => setMobileOpen(true)} />

        <main className="dashboard-content-area">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

export default DashboardLayout;