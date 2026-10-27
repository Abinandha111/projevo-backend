import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useProject } from "../context/ProjectContext";
import API from "../services/api";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Sparkles,
  Calendar,
  ArrowRight,
  Plus,
  ShieldCheck,
  UserCheck,
  AlertCircle
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

function Dashboard() {
  const navigate = useNavigate();
  const { projects, setSelectedProjectId, refreshProjects } = useProject();

  const [stats, setStats] = useState({
    total_projects: 0,
    total_tasks: 0,
    completed_tasks: 0,
    in_progress_tasks: 0,
    pending_tasks: 0,
    progress_percentage: 0,
    recent_projects: []
  });
  const [loading, setLoading] = useState(true);

  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/dashboard/stats");
      setStats({
        total_projects: res.data?.total_projects ?? 0,
        total_tasks: res.data?.total_tasks ?? 0,
        completed_tasks: res.data?.completed_tasks ?? 0,
        in_progress_tasks: res.data?.in_progress_tasks ?? 0,
        pending_tasks: res.data?.pending_tasks ?? 0,
        progress_percentage: res.data?.progress_percentage ?? 0,
        recent_projects: Array.isArray(res.data?.recent_projects) ? res.data.recent_projects : []
      });
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
      setError(
      err.response?.data?.detail ||
      err.response?.data?.message ||
      "Unable to load dashboard statistics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchActivities = async () => {
  try {
    const res = await API.get("/activities/recent");
    setActivities(
      Array.isArray(res.data?.activities) ? res.data.activities : []
    );
  } catch (err) {
    console.error("Failed to load recent activities:", err);
  } finally {
    setActivityLoading(false);
  }
};

useEffect(() => {
  fetchActivities();
}, []);

  // Safe fallback to projects if recent_projects isn't returned by older/external backend
  const recentProjectsList = (Array.isArray(stats.recent_projects) && stats.recent_projects.length > 0)
    ? stats.recent_projects
    : (Array.isArray(projects) ? projects : []);

  // Data for Recharts Pie Chart (Status Distribution)
  const pieData = [
    { name: "Completed", value: stats.completed_tasks, color: "#10b981" },
    { name: "In Progress", value: stats.in_progress_tasks, color: "#f59e0b" },
    { name: "Pending", value: stats.pending_tasks, color: "#64748b" }
  ].filter((item) => item.value > 0);

  // Data for Project Comparison Bar Chart
  const barData = recentProjectsList.slice(0, 5).map((p) => ({
    name: p.title?.length > 12 ? p.title.substring(0, 10) + "..." : (p.title || "Project"),
    Completed: p.completed_tasks || 0,
    Remaining: Math.max(0, (p.total_tasks || 0) - (p.completed_tasks || 0))
  }));

  const deadlineProjects = recentProjectsList.filter((p) => Boolean(p.deadline));

  const handleSelectProjectAndGo = (projectId, path) => {
    setSelectedProjectId(projectId);
    navigate(path);
  };

  return (
    <DashboardLayout>
      
{error && !loading && (
  <div
    role="alert"
    style={{
      padding: "16px",
      marginBottom: "20px",
      borderRadius: "12px",
      border: "1px solid #fecaca",
      backgroundColor: "#fef2f2",
      color: "#b91c1c",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap"
    }}
  >
    <div>
      <strong>Unable to load dashboard</strong>
      <p style={{ margin: "6px 0 0" }}>{error}</p>
    </div>

    <button
      type="button"
      onClick={fetchStats}
      disabled={loading}
      style={{
        padding: "9px 16px",
        border: "none",
        borderRadius: "8px",
        backgroundColor: "#b91c1c",
        color: "#ffffff",
        cursor: "pointer"
      }}
    >
      Try Again
    </button>
  </div>
)}

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Dashboard</h1>
          <p className="page-subtitle">
            Overview of your active projects, tasks, and team productivity.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/ai" className="btn btn-secondary">
            <Sparkles size={16} color="#6366f1" />
            AI Task Generator
          </Link>
          <Link to="/projects" className="btn btn-primary">
            <Plus size={16} />
            New Project
          </Link>
        </div>
      </div>

      
      {/* Metrics Cards */}
      <div className="stats-grid">
        {loading ? (
          [1, 2, 3, 4, 5].map((item) => (
            <div className="stat-card" key={item}>
              <div className="skeleton-shimmer"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "var(--bg-subtle)",
                  flexShrink: 0
                }}
              />

              <div
                className="stat-info"
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
              >
                <div className="skeleton-shimmer"
                  style={{
                    height: "10px",
                    width: "90px",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-subtle)"
                  }}
                />

                <div className="skeleton-shimmer"
                  style={{
                    height: "22px",
                    width: "48px",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-subtle)"
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "#e0e7ff", color: "#4f46e5" }}>
                <FolderKanban size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Projects</span>
                <span className="stat-value">{stats.total_projects}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "#ede9fe", color: "#7c3aed" }}>
                <ListTodo size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Tasks</span>
                <span className="stat-value">{stats.total_tasks}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
                <Clock size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">In Progress</span>
                <span className="stat-value">{stats.in_progress_tasks}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "#d1fae5", color: "#059669" }}>
                <CheckCircle2 size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Completed</span>
                <span className="stat-value">{stats.completed_tasks}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
                <TrendingUp size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Overall Progress</span>
                <span className="stat-value">{stats.progress_percentage}%</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
       {stats.total_tasks > 0 ? (
        <div className="charts-grid">
          {/* Status Breakdown Donut Chart */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", marginBottom: "16px" }}>
              Task Status Distribution
            </h3>
            <div style={{ height: "240px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-md)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                Completed ({stats.completed_tasks})
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                In Progress ({stats.in_progress_tasks})
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#64748b" }} />
                Pending ({stats.pending_tasks})
              </div>
            </div>
          </div>

          {/* Project Progress Comparison */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", marginBottom: "16px" }}>
              Tasks per Project
            </h3>
            <div style={{ height: "240px", width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" fontSize={12} stroke="var(--text-subtle)" />
                  <YAxis fontSize={12} stroke="var(--text-subtle)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-surface)",
                      color: "var(--text-main)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-md)"
                    }}
                  />
                  <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Remaining" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#10b981" }} />
                Completed
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#cbd5e1" }} />
                Remaining
              </div>
            </div>
          </div>
        </div>
             
      ) : (
        <div className="empty-state" style={{ marginBottom: "24px" }}>
          <div className="empty-icon">
            <ListTodo size={26} />
          </div>

          <div className="empty-title">No task statistics yet</div>

          <div className="empty-desc">
            Your task charts will appear here once your projects have tasks.
            Create a project or add tasks to start tracking your team's progress.
          </div>

          <Link
            to="/projects"
            className="btn btn-primary btn-sm"
            style={{ marginTop: "8px" }}
          >
            <Plus size={15} /> Explore Projects
          </Link>
        </div>
      )}

      
      {/* Recent Activity Section */}
      <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--text-main)",
            marginBottom: "16px"
          }}
        >
          Recent Activity
        </h3>

        {activityLoading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Loading activities...
          </p>
        
) : activities.length === 0 ? (
  <div
    className="empty-state"
    style={{ padding: "24px 16px" }}
  >
    <div className="empty-icon">
      <Clock size={24} />
    </div>

    <div className="empty-title">No recent activity</div>

    <div className="empty-desc">
      Your team's recent actions will appear here when projects
      are created, tasks are assigned, or work is completed.
    </div>

    <Link
      to="/projects"
      className="btn btn-secondary btn-sm"
      style={{ marginTop: "8px" }}
    >
      View Projects <ArrowRight size={14} />
    </Link>
  </div>
) : (

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--border-color, #e2e8f0)"
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "#ede9fe",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <Clock size={16} />
                </div>

                <div>
                  <p style={{ fontSize: "13px", color: "var(--text-main)" }}>
                    {activity.message}
                  </p>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {activity.activity_type === "type_assigned"
                      ? "task assigned"
                      : activity.activity_type.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Main Content: Recent Projects & Upcoming Deadlines */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }} className="dashboard-columns">
        {/* Recent Projects Section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)" }}>
              Active Projects
            </h2>
            <Link to="/projects" style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {recentProjectsList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FolderKanban size={26} />
              </div>
              <div className="empty-title">No projects yet</div>
              <div className="empty-desc">
                Create your first project or join one with an invite code to get started.
              </div>
              <Link to="/projects" className="btn btn-primary btn-sm" style={{ marginTop: "8px" }}>
                <Plus size={15} /> Create or Join Project
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentProjectsList.map((proj) => {
                const isLeader = proj.role === "leader";
                return (
                  <div
                    key={proj.id}
                    className="card card-clickable"
                    onClick={() => handleSelectProjectAndGo(proj.id, "/tasks")}
                    style={{ padding: "18px 20px" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)" }}>
                            {proj.title}
                          </span>
                          <span className={`badge ${isLeader ? "badge-leader" : "badge-member"}`}>
                            {isLeader ? (
                              <>
                                <ShieldCheck size={12} /> Leader
                              </>
                            ) : (
                              <>
                                <UserCheck size={12} /> Member
                              </>
                            )}
                          </span>
                        </div>
                        {proj.description && (
                          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", maxWidth: "600px" }}>
                            {proj.description}
                          </p>
                        )}
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                          {proj.progress}%
                        </span>
                        <div style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                          {proj.completed_tasks}/{proj.total_tasks} tasks
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="progress-bar-container" style={{ margin: "10px 0 12px 0" }}>
                      <div className="progress-bar-fill" style={{ width: `${proj.progress}%` }} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12.5px", color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Calendar size={14} color="#94a3b8" />
                        <span>Deadline: {proj.deadline || "No deadline"}</span>
                      </div>

                      <div style={{ display: "flex", gap: "12px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProjectAndGo(proj.id, "/tasks");
                          }}
                          style={{ color: "var(--primary)", fontWeight: 600, fontSize: "12.5px" }}
                        >
                          Tasks
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProjectAndGo(proj.id, "/kanban");
                          }}
                          style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "12.5px" }}
                        >
                          Kanban
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines & Quick Tips Widget */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Upcoming Deadlines Card */}
          <div className="card">
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={16} color="var(--primary)" /> Upcoming Deadlines
            </h3>

           
{deadlineProjects.length === 0 ? (
  <div
    className="empty-state"
    style={{ padding: "20px 12px" }}
  >
    <div className="empty-icon">
      <Calendar size={24} />
    </div>

    <div className="empty-title">No deadlines scheduled</div>

    <div className="empty-desc">
      Set a deadline for your project to keep track of your team's timeline.
    </div>

    <Link
      to="/projects"
      className="btn btn-secondary btn-sm"
      style={{ marginTop: "8px" }}
    >
      View Projects <ArrowRight size={14} />
    </Link>
  </div>
) : (

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {deadlineProjects
                  .slice(0, 4)
                  .map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => handleSelectProjectAndGo(proj.id, "/tasks")}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "var(--bg-subtle)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "var(--transition)"
                      }}
                    >
                      <div style={{ overflow: "hidden", paddingRight: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {proj.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {proj.deadline}
                        </div>
                      </div>
                      <span className="badge badge-in_progress" style={{ fontSize: "11px" }}>
                        {proj.progress || 0}% done
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* AI Helper Callout */}
          <div
            className="card"
            style={{
              background: "var(--primary-light)",
              borderColor: "var(--primary-border)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "var(--primary)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Sparkles size={15} />
              </div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary-text)" }}>
                AI Task Generation
              </h3>
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "14px" }}>
              Leaders can generate automated task breakdowns and epics for any project with Google Gemini.
            </p>
            <Link to="/ai" className="btn btn-sm btn-primary">
              Launch AI Planner
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;