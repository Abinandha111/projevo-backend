import Sidebar from "./Sidebar";
import DashboardNavbar from "./DashboardNavbar";
import "../styles/Dashboard.css";

function DashboardLayout({ children }) {
  return (
    <div className="dashboard-container">

      <Sidebar />

      <div className="dashboard-content">

        <DashboardNavbar />

        {children}

      </div>

    </div>
  );
}

export default DashboardLayout;