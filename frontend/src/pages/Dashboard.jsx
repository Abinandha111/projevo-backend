import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DashboardNavbar from "../components/DashboardNavbar";
import "../styles/Dashboard.css";


function Dashboard() {

  const navigate = useNavigate();

const handleLogout = () => {
  // remove token
  localStorage.removeItem("token");
  navigate("/login");
};
  return (
    <div className="dashboard-container"> 
      <Sidebar/>

      <div className="dashboard-content">
        <DashboardNavbar/>
      <h1>Dashboard</h1>
      <p>Welcome to your WorkSpace</p>
      
    
    <button onClick={handleLogout}>Logout</button>
    </div>
    </div>
  )
}

export default Dashboard;