import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown"
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useProject } from "../context/ProjectContext";
import API from "../services/api";
import {
  Plus,
  KeyRound,
  Calendar,
  Users,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Search,
  FolderKanban,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  Kanban as KanbanIcon,
  X
} from "lucide-react";

function Projects() {
  const navigate = useNavigate();
  const {
    projects,
    refreshProjects,
    setSelectedProjectId,
    showToast
  } = useProject();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [deleteTargetProject, setDeleteTargetProject] = useState(null);

  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const [summaryProject,setSummaryProject] = useState(null)
  const [projectSummary,setProjectSummary] = useState(null)
  const [loadingSummary,setLoadingSummary] = useState(false)

  // Form states
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    deadline: ""
  });
  const [creating, setCreating] = useState(false);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.title.trim()) {
      showToast("Project title is required", "error");
      return;
    }

    try {
      setCreating(true);
      const res = await API.post("/projects/", newProject);
      showToast("Project created successfully! 🚀", "success");
      setNewProject({ title: "", description: "", deadline: "" });
      setShowCreateModal(false);
      await refreshProjects();
      if (res.data?.project?.id) {
        setSelectedProjectId(res.data.project.id);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || "Failed to create project", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinProject = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      showToast("Please enter an invite code", "error");
      return;
    }

    try {
      setJoining(true);
      const res = await API.post("/members/join", {
        invite_code: inviteCodeInput.trim()
      });

      const message = res.data?.message || "Joined project successfully";
      if (message.includes("Invalid") || message.includes("not found")) {
        showToast(message, "error");
      } else {
        showToast(message, "success");
        setInviteCodeInput("");
        setShowJoinModal(false);
        refreshProjects();
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || "Failed to join project", "error");
    } finally {
      setJoining(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetProject) return;

    try {
      setDeleting(true);
      await API.delete(`/projects/${deleteTargetProject.id}`);
      showToast("Project deleted successfully", "success");
      setDeleteTargetProject(null);
      await refreshProjects();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || "Failed to delete project", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyInviteCode = (e, code, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    showToast("Invite code copied to clipboard!", "success");
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleOpenProjectTasks = (projectId) => {
    setSelectedProjectId(projectId);
    navigate("/tasks");
  };

  const handleGetProjectSummary = async (project) => {

    try{
      setSummaryProject(project);
      setProjectSummary(null);
      setLoadingSummary(true);

      const res = await API.get(`/ai/project-summary/${project.id}`);

      setProjectSummary(res.data);
    }catch(err) {
      console.error(err);

      showToast(
        err.response?.data?.detail || "Failed to load AI projects summary","error"
      );

      setSummaryProject(null);

    }finally{
      setLoadingSummary(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.invite_code && p.invite_code.toLowerCase().includes(query))
    );
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            Manage your workspaces, invite team members, and track progress.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn btn-secondary"
          >
            <KeyRound size={16} color="var(--primary)" />
            Join with Code
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap"
        }}
      >
        <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
          <Search
            size={16}
            color="#94a3b8"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search projects by title or invite code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "38px" }}
          />
        </div>

        <div style={{ fontSize: "13.5px", color: "var(--text-muted)", fontWeight: 500 }}>
          Showing <strong>{filteredProjects.length}</strong> of {projects.length} projects
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FolderKanban size={28} />
          </div>
          <div className="empty-title">
            {searchQuery ? "No matching projects found" : "No projects yet"}
          </div>
          <div className="empty-desc">
            {searchQuery
              ? "Try adjusting your search query."
              : "Create a new project as a leader, or join an existing team project with an invite code."}
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn btn-secondary btn-sm"
            >
              <KeyRound size={14} /> Join with Code
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Create Project
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px"
          }}
        >
          {filteredProjects.map((proj) => {
            const isLeader = proj.role === "leader";
            const progress = proj.progress || 0;
            const completedCount = proj.completed_tasks || 0;
            const totalCount = proj.total_tasks || 0;
            const memberCount = proj.member_count || 1;

            return (
              <div
                key={proj.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "22px",
                  position: "relative"
                }}
              >
                <div>
                  {/* Top line: Role badge and Delete action */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span className={`badge ${isLeader ? "badge-leader" : "badge-member"}`}>
                      {isLeader ? (
                        <>
                          <ShieldCheck size={13} /> Project Leader
                        </>
                      ) : (
                        <>
                          <UserCheck size={13} /> Member
                        </>
                      )}
                    </span>

                    {/* Delete action only for leader */}
                    {isLeader && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetProject(proj);
                        }}
                        title="Delete project"
                        style={{
                          color: "#94a3b8",
                          padding: "4px",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          transition: "var(--transition)"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      marginBottom: "6px",
                      lineHeight: 1.3
                    }}
                  >
                    {proj.title}
                  </h3>

                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      marginBottom: "18px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: "38px"
                    }}
                  >
                    {proj.description || "No description provided."}
                  </p>

                  {/* Metadata Row: Members, Deadline */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      marginBottom: "16px",
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Users size={14} color="#6366f1" />
                      <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <Calendar size={14} color="#f59e0b" />
                      <span>{proj.deadline ? `Due ${proj.deadline}` : "No deadline"}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                      <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Tasks Progress</span>
                      <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                        {completedCount}/{totalCount} completed ({progress}%)
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Invite Code Box */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      border: "1px dashed var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "20px"
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 600 }}>
                        Invite Code
                      </span>
                      <div style={{ fontFamily: "monospace", fontSize: "13.5px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "0.08em" }}>
                        {proj.invite_code}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleCopyInviteCode(e, proj.invite_code, proj.id)}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: "5px 10px", fontSize: "12px" }}
                      title="Copy invite code to clipboard"
                    >
                      {copiedCodeId === proj.id ? (
                        <>
                          <Check size={13} color="#10b981" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Quick Links */}
                <div
                  style={{
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "14px",
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap:"12px"
                  }}
                >
                  <div style={{ display: "flex", gap: "8px" ,flexWrap: "wrap",alignItems: "center"}}>
                    <button
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        navigate("/kanban");
                      }}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: "6px 10px" }}
                    >
                      <KanbanIcon size={14} /> Kanban
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        navigate("/members");
                      }}
                      className="btn btn-sm btn-secondary"
                      style={{ padding: "6px 10px" }}
                    >
                      <Users size={14} /> Members
                    </button>

                    {isLeader && (
                      <button
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          navigate("/ai");
                        }}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: "6px 10px", color: "#6366f1" }}
                        title="AI Task Breakdown"
                      >
                        <Sparkles size={14} /> AI
                      </button>
                    )}
                      <button
                        onClick={() => handleGetProjectSummary(proj)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: "6px 10px", color: "#0d9488" }}
                        title="AI Project Summary"
                       >
                        <Sparkles size={14} /> Summary
                      </button>

                  </div>

                  <button
                    onClick={() => handleOpenProjectTasks(proj.id)}
                    className="btn btn-sm btn-primary"
                    style={{ padding: "6px 14px" }}
                  >
                    Open Tasks <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Project</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. NextGen Mobile Banking"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe the scope, goals, and key objectives of this project..."
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <span className="spinner" /> Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN PROJECT MODAL */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Join Project with Invite Code</h2>
              <button className="modal-close" onClick={() => setShowJoinModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinProject}>
              <div className="modal-body">
                <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Enter the 8-character invite code shared by your project leader to collaborate.
                </p>

                <div className="form-group">
                  <label className="form-label">Invite Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 3a8f9c1b"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    required
                    style={{ fontFamily: "monospace", letterSpacing: "0.08em" }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowJoinModal(false)}
                  disabled={joining}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={joining}
                >
                  {joining ? (
                    <>
                      <span className="spinner" /> Joining...
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} /> Join Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTargetProject && (
        <div className="modal-overlay" onClick={() => setDeleteTargetProject(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: "var(--danger)" }}>
                Delete Project
              </h2>
              <button className="modal-close" onClick={() => setDeleteTargetProject(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "14px", color: "var(--text-main)", marginBottom: "10px" }}>
                Are you sure you want to permanently delete <strong>{deleteTargetProject.title}</strong>?
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                This action cannot be undone. All tasks, assignments, and member associations will be permanently removed.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTargetProject(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="spinner" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* AI PROJECT SUMMARY MODAL */}
      {summaryProject && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!loadingSummary) {
              setSummaryProject(null);
              setProjectSummary(null);
            }
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "100%" , maxHeight: "85vh", overflowY: "auto"}}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                <Sparkles
                  size={20}
                  color="#0d9488"
                  style={{ verticalAlign: "middle", marginRight: "8px" }}
                />
                AI Project Summary
              </h2>

              <button
                className="modal-close"
                onClick={() => {
                  if (!loadingSummary) {
                    setSummaryProject(null);
                    setProjectSummary(null);
                  }
                }}
                disabled={loadingSummary}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <h3
                style={{
                  fontSize: "16px",
                  marginBottom: "12px",
                  color: "var(--text-main)"
                }}
              >
                {summaryProject.title}
              </h3>

              {loadingSummary ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "24px 0",
                    color: "var(--text-muted)"
                  }}
                >
                  <span className="spinner" />
                  Generating AI summary...
                </div>
              ) : projectSummary ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "12px",
                      marginBottom: "20px"
                    }}
                  >
                    <div className="card" style={{ padding: "14px" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Total Tasks
                      </p>
                      <h3 style={{ fontSize: "22px" }}>
                        {projectSummary.progress?.total_tasks ?? 0}
                      </h3>
                    </div>

                    <div className="card" style={{ padding: "14px" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Completed
                      </p>
                      <h3 style={{ fontSize: "22px", color: "#10b981" }}>
                        {projectSummary.progress?.completed_tasks ?? 0}
                      </h3>
                    </div>

                    <div className="card" style={{ padding: "14px" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Pending
                      </p>
                      <h3 style={{ fontSize: "22px" }}>
                        {projectSummary.progress?.pending_tasks ?? 0}
                      </h3>
                    </div>

                    <div className="card" style={{ padding: "14px" }}>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Progress
                      </p>
                      <h3 style={{ fontSize: "22px", color: "#0d9488" }}>
                        {projectSummary.progress?.percentage ?? 0}%
                      </h3>

                      
                      <div
                        style={{
                          height: "6px",
                          background: "var(--border-color)",
                          borderRadius: "999px",
                          overflow: "hidden",
                          marginTop: "10px"
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(
                              100,
                              Math.max(0, projectSummary.progress?.percentage ?? 0)
                            )}%`,
                            background: "#0d9488",
                            borderRadius: "999px",
                            transition: "width 0.3s ease"
                          }}
                        />
                      </div>

                    </div>
                  </div>

                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.7,
                      fontSize: "14px",
                      color: "var(--text-main)"
                    }}
                  ><ReactMarkdown
                   components={{
                        h1: ({ ...props }) => (
                          <h1 style={{ fontSize: "20px", margin: "10px 0 5px" }} {...props} />
                        ),
                        h2: ({ ...props }) => (
                          <h2 style={{ fontSize: "18px", margin: "8px 0 4px" }} {...props} />
                        ),
                        h3: ({ ...props }) => (
                          <h3 style={{ fontSize: "16px", margin: "6px 0 4px" }} {...props} />
                        ),
                        p: ({ ...props }) => (
                          <p style={{ margin: "2px 0 5px" }} {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul style={{ paddingLeft: "22px", margin: "2px 0 5px", lineHeight: 1.5 }} {...props} />
                        ),
                        ol: ({ ...props }) => (
                          <ol style={{ paddingLeft: "22px", margin: "2px 0 5px" , lineHeight: 1.5}} {...props} />
                        ),
                        li: ({ ...props }) => (
                          <li style={{ marginBottom: "1px", padding: 0 }} {...props} />
                        )
                      }}
                    >
                    {projectSummary.summary}
                    </ReactMarkdown>
                  </div>
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSummaryProject(null);
                  setProjectSummary(null);
                }}
                disabled={loadingSummary}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default Projects;