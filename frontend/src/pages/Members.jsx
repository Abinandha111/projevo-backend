import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useProject } from "../context/ProjectContext";
import API from "../services/api";
import {
  Users,
  ShieldCheck,
  UserCheck,
  Copy,
  Check,
  KeyRound,
  Mail,
  ListTodo,
  Sparkles,
  ArrowRight,
  UserPlus
} from "lucide-react";

function Members() {
  const {
    projects,
    selectedProject,
    selectedProjectId,
    isLeader,
    showToast
  } = useProject();

  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchMembersAndTasks = async () => {
    if (!selectedProjectId) {
      setMembers([]);
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      const [membersRes, tasksRes] = await Promise.all([
        API.get(`/members/${selectedProjectId}`),
        API.get(`/tasks/${selectedProjectId}`).catch(() => ({ data: { tasks: [] } }))
      ]);

      setMembers(membersRes.data || []);
      setTasks(tasksRes.data.tasks || []);
    } catch (err) {
      console.error("Failed to load project members:", err);
      if (err.response?.status === 403) {
        showToast("You are not a member of this project", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersAndTasks();
  }, [selectedProjectId]);

  const handleCopyCode = () => {
    if (!selectedProject?.invite_code) return;
    navigator.clipboard.writeText(selectedProject.invite_code);
    setCopiedCode(true);
    showToast("Project invite code copied to clipboard!", "success");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Calculate task counts per member
  const getMemberTaskCount = (userId) => {
    return tasks.filter((t) => t.assigned_to === userId).length;
  };

  // Find leader
  const leaderMember = members.find((m) => m.role === "leader");
  const regularMembers = members.filter((m) => m.role !== "leader");

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Members</h1>
          <p className="page-subtitle">
            {selectedProject
              ? `Workspace: ${selectedProject.title}`
              : "Select a project to view team members and roles."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {selectedProject && (
            <button
              onClick={handleCopyCode}
              className="btn btn-secondary"
            >
              {copiedCode ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              {copiedCode ? "Copied Code" : "Copy Invite Code"}
            </button>
          )}

          <Link to="/tasks" className="btn btn-primary">
            <ListTodo size={16} /> View Tasks
          </Link>
        </div>
      </div>

      {!selectedProject ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Users size={28} />
          </div>
          <div className="empty-title">No project selected</div>
          <div className="empty-desc">
            Choose a project from your workspace to view its active members.
          </div>
          <Link to="/projects" className="btn btn-primary btn-sm" style={{ marginTop: "8px" }}>
            Go to Projects
          </Link>
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div className="spinner spinner-primary" style={{ width: "32px", height: "32px" }} />
          <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--text-muted)" }}>
            Loading team members...
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Invite Code Showcase Card */}
          <div
            className="card"
            style={{
              padding: "24px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <KeyRound size={18} color="var(--primary)" />
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                  Project Invite Code
                </h3>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "560px", lineHeight: 1.5 }}>
                Share this unique invite code with teammates. They can enter it on the Projects page to join this project instantly with Member permissions.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  padding: "10px 18px",
                  backgroundColor: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-main)"
                }}
              >
                {selectedProject.invite_code}
              </div>

              <button
                onClick={handleCopyCode}
                className="btn btn-primary"
                style={{ padding: "10px 16px" }}
              >
                {copiedCode ? (
                  <>
                    <Check size={16} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Members Count & List */}
          <div className="card" style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                paddingBottom: "14px",
                borderBottom: "1px solid var(--border-color)"
              }}
            >
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                  Team Members ({members.length})
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Dynamic membership roster managed through invite codes.
                </p>
              </div>

              <span className="badge badge-leader" style={{ fontSize: "12px" }}>
                1 Leader, {members.length - 1} {members.length - 1 === 1 ? "Member" : "Members"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {members.map((member) => {
                const isLeaderRole = member.role === "leader";
                const memberTasksCount = getMemberTaskCount(member.user_id);
                const initial = member.name ? member.name[0].toUpperCase() : "U";

                return (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 18px",
                      backgroundColor: isLeaderRole ? "var(--primary-light)" : "var(--bg-surface)",
                      border: `1px solid ${isLeaderRole ? "var(--primary-border)" : "var(--border-color)"}`,
                      borderRadius: "var(--radius-md)",
                      gap: "16px",
                      flexWrap: "wrap",
                      boxShadow: isLeaderRole ? "0 2px 4px rgba(99, 102, 241, 0.05)" : "none"
                    }}
                  >
                    {/* User Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          backgroundColor: isLeaderRole ? "var(--primary-light)" : "var(--bg-subtle)",
                          color: isLeaderRole ? "var(--primary)" : "var(--text-muted)",
                          fontSize: "16px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                      >
                        {initial}
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)" }}>
                            {member.name}
                          </span>
                          <span
                            className={`badge ${isLeaderRole ? "badge-leader" : "badge-member"}`}
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                          >
                            {isLeaderRole ? (
                              <>
                                <ShieldCheck size={12} /> Project Leader
                              </>
                            ) : (
                              <>
                                <UserCheck size={12} /> Member
                              </>
                            )}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-muted)", marginTop: "3px" }}>
                          <Mail size={13} color="#94a3b8" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Task Count Badge & Role details */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>
                          {memberTasksCount} {memberTasksCount === 1 ? "task" : "tasks"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-subtle)" }}>
                          Assigned
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: isLeaderRole ? "var(--primary-light)" : "var(--bg-subtle)",
                          color: isLeaderRole ? "var(--primary)" : "var(--text-muted)",
                          fontWeight: 500
                        }}
                      >
                        {isLeaderRole ? "Full Project Admin" : "Task Contributor"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Members;

