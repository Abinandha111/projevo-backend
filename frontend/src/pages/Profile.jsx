import React from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useProject } from "../context/ProjectContext";
import {
  User,
  Mail,
  ShieldCheck,
  Settings,
  FolderKanban,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight
} from "lucide-react";

function Profile() {
  const { currentUser, projects } = useProject();

  const username = currentUser?.name || "User";
  const userEmail = currentUser?.email || "No email available";
  const userRole = currentUser?.role || "user";
  const userId = currentUser?.id || currentUser?.user_id || "—";
  const userInitial = username[0]?.toUpperCase() || "U";

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">
            Personal identity credentials, platform permissions, and connected workspaces.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/settings" className="btn btn-secondary">
            <Settings size={16} /> Account Settings
          </Link>
          <Link to="/projects" className="btn btn-primary">
            <FolderKanban size={16} /> My Projects
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="profile-grid">
        {/* Left Column: Avatar & Identity Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            className="card"
            style={{
              padding: "32px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            {/* Large Profile Photo / Avatar */}
            <div
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                fontWeight: 800,
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                marginBottom: "16px"
              }}
            >
              {userInitial}
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
              {username}
            </h2>

            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "14px" }}>
              {userEmail}
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
              <span className="badge badge-leader" style={{ fontSize: "12px", textTransform: "capitalize" }}>
                <ShieldCheck size={13} /> {userRole}
              </span>

              <span
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-color)",
                  fontWeight: 500
                }}
              >
                ID: #{userId}
              </span>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginBottom: "12px" }}>
              Workspace Summary
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)"
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Enrolled Projects</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  {projects.length}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  backgroundColor: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)"
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Auth Status</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <CheckCircle2 size={13} /> Active JWT
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Account Credentials (Read-only as required) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--border-color)" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                Account Information
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                Your verified credentials stored in the NexTask authentication system.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name / Username</label>
                <div style={{ position: "relative" }}>
                  <User
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={username}
                    readOnly
                    style={{
                      paddingLeft: "38px",
                      backgroundColor: "var(--bg-subtle)",
                      cursor: "default"
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="email"
                    className="form-input"
                    value={userEmail}
                    readOnly
                    style={{
                      paddingLeft: "38px",
                      backgroundColor: "var(--bg-subtle)",
                      cursor: "default"
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Account Role</label>
                <div style={{ position: "relative" }}>
                  <ShieldCheck
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={userRole.toUpperCase()}
                    readOnly
                    style={{
                      paddingLeft: "38px",
                      backgroundColor: "var(--bg-subtle)",
                      cursor: "default"
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: "8px",
                  padding: "12px 14px",
                  backgroundColor: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--border-color)",
                  fontSize: "12.5px",
                  color: "var(--text-muted)",
                  lineHeight: 1.5
                }}
              >
                <strong>Note:</strong> Profile information is verified via secure JWT bearer tokens. Direct editing is managed through account administrators.
              </div>
            </div>
          </div>

          {/* Connected Workspaces List */}
          <div className="card" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                Active Workspaces ({projects.length})
              </h3>

              <Link
                to="/projects"
                style={{
                  fontSize: "13px",
                  color: "var(--primary)",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                Browse all <ArrowRight size={13} />
              </Link>
            </div>

            {projects.length === 0 ? (
              <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
                You have not joined any projects yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {projects.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      backgroundColor: "var(--bg-subtle)",
                      borderRadius: "var(--radius-md)"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        {p.deadline ? `Deadline: ${p.deadline}` : "No deadline"}
                      </div>
                    </div>

                    <span className={`badge ${p.role === "leader" ? "badge-leader" : "badge-member"}`} style={{ fontSize: "11px" }}>
                      {p.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Profile;

