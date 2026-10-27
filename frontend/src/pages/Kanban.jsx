import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import TaskDetailModal from "../components/TaskDetailModal";
import { useProject } from "../context/ProjectContext";
import API from "../services/api";
import {
  Kanban as KanbanIcon,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Circle,
  Sparkles,
  Layers,
  Tag
} from "lucide-react";
import { getLabelStyle } from "../utils/labelUtils";

function Kanban() {
  const {
    projects,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    isLeader,
    currentUser,
    showToast
  } = useProject();

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);

  const fetchKanbanData = async () => {
    if (!selectedProjectId) {
      setTasks([]);
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      const [membersRes, tasksRes] = await Promise.all([
        API.get(`/members/${selectedProjectId}`).catch(() => ({ data: [] })),
        API.get(`/tasks/${selectedProjectId}`)
      ]);

      setMembers(membersRes.data || []);
      setTasks(tasksRes.data.tasks || []);
    } catch (err) {
      console.error("Failed to load Kanban data:", err);
      if (err.response?.status === 403) {
        showToast("You are not a member of this project", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbanData();
  }, [selectedProjectId]);

  const getEpicAndTask = (title) => {
    const match = title.match(/^\[(.*?)\]\s*(.*)$/);
    if (!match) {
      return {
        epic: "General",
        task: title
      };
    }
    return {
      epic: match[1],
      task: match[2]
    };
  };

  const getMemberName = (userId) => {
    const member = members.find((m) => m.user_id === userId);
    return member ? member.name : "Unassigned";
  };

  // Quick move status handler (without a status dropdown, as requested)
  const handleMoveStatus = async (taskId, newStatus) => {
    try {
      const res = await API.put(`/tasks/${taskId}`, { status: newStatus });
      if (res.data?.error) {
        showToast(res.data.error, "error");
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      showToast(`Task moved to ${newStatus.replace("_", " ")}`, "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to update task", "error");
    }
  };

  // Columns definition
  const columns = [
    {
      id: "pending",
      title: "Pending",
      color: "#64748b",
      bgColor: "#f8fafc",
      headerBorder: "#cbd5e1",
      badgeClass: "badge-pending",
      icon: Circle
    },
    {
      id: "in_progress",
      title: "In Progress",
      color: "#d97706",
      bgColor: "#fefdf8",
      headerBorder: "#fde68a",
      badgeClass: "badge-in_progress",
      icon: Clock
    },
    {
      id: "completed",
      title: "Completed",
      color: "#059669",
      bgColor: "#f7fdfa",
      headerBorder: "#a7f3d0",
      badgeClass: "badge-completed",
      icon: CheckCircle2
    }
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kanban Board</h1>
          <p className="page-subtitle">
            {selectedProject
              ? `Workspace: ${selectedProject.title}`
              : "Select a project to visualize your workflow."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {selectedProject && (
            <Link to="/tasks" className="btn btn-secondary">
              List View
            </Link>
          )}
          {isLeader && selectedProject && (
            <Link to="/ai" className="btn btn-primary">
              <Sparkles size={16} /> AI Breakdown
            </Link>
          )}
        </div>
      </div>

      {!selectedProject ? (
        <div className="empty-state">
          <div className="empty-icon">
            <KanbanIcon size={28} />
          </div>
          <div className="empty-title">No project selected</div>
          <div className="empty-desc">
            Choose a project from your workspace to view its Kanban board.
          </div>
          <Link to="/projects" className="btn btn-primary btn-sm" style={{ marginTop: "8px" }}>
            Go to Projects
          </Link>
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div className="spinner spinner-primary" style={{ width: "32px", height: "32px" }} />
          <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--text-muted)" }}>
            Loading board...
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(270px, 1fr))",
            gap: "20px",
            alignItems: "flex-start",
            overflowX: "auto",
            paddingBottom: "24px"
          }}
          className="kanban-board-container"
        >
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const Icon = col.icon;

            return (
              <div
                key={col.id}
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "450px",
                  padding: "16px"
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: "14px",
                    marginBottom: "14px",
                    borderBottom: `2px solid ${col.headerBorder}`
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon size={16} color={col.color} />
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
                      {col.title}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-color)",
                      color: col.color
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  {colTasks.length === 0 ? (
                    <div
                      style={{
                        padding: "36px 16px",
                        textAlign: "center",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-subtle)",
                        fontSize: "13px"
                      }}
                    >
                      No tasks in {col.title.toLowerCase()}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const { epic, task: taskTitle } = getEpicAndTask(task.title);
                      const isAssignedToCurrentUser =
                        currentUser?.user_id && task.assigned_to === currentUser.user_id;
                      const canModify = isLeader || isAssignedToCurrentUser;

                      return (
                        <div
                          key={task.id}
                          className="card"
                          onClick={() => setSelectedTaskForDetail(task)}
                          style={{
                            padding: "16px",
                            backgroundColor: "var(--bg-surface)",
                            boxShadow: "var(--shadow-sm)",
                            border: "1px solid var(--border-color)",
                            transition: "var(--transition)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            cursor: "pointer"
                          }}
                          title="Click to view task details"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "var(--shadow-md)";
                            e.currentTarget.style.borderColor = "var(--border-focus)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                            e.currentTarget.style.borderColor = "var(--border-color)";
                          }}
                        >
                          {/* Top: Epic pill */}
                          <div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "var(--primary-text)",
                                backgroundColor: "var(--primary-light)",
                                border: "1px solid var(--primary-border)",
                                padding: "2px 8px",
                                borderRadius: "var(--radius-sm)",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em"
                              }}
                            >
                              <Layers size={11} /> {epic}
                            </span>
                          </div>

                          {/* Task Title */}
                          <div
                            style={{
                              fontSize: "14.5px",
                              fontWeight: 600,
                              color: "var(--text-main)",
                              lineHeight: 1.4
                            }}
                          >
                            {taskTitle}
                          </div>

                          {/* Labels on Card */}
                          {task.labels && task.labels.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {task.labels.map((lbl) => {
                                const style = getLabelStyle(lbl);
                                return (
                                  <span
                                    key={lbl}
                                    style={{
                                      fontSize: "10.5px",
                                      fontWeight: 600,
                                      backgroundColor: style.bg,
                                      color: style.text,
                                      border: `1px solid ${style.border}`,
                                      padding: "1px 6px",
                                      borderRadius: "var(--radius-full)",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px"
                                    }}
                                  >
                                    <Tag size={9} />
                                    {lbl}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Assignee Row */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              borderTop: "1px solid var(--border-light)",
                              paddingTop: "10px",
                              marginTop: "2px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div
                                style={{
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  backgroundColor: task.assigned_to ? "var(--primary-light)" : "var(--bg-subtle)",
                                  color: task.assigned_to ? "var(--primary)" : "var(--text-subtle)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  fontWeight: 600
                                }}
                              >
                                <User size={12} />
                              </div>
                              <span style={{ fontWeight: 500 }}>
                                {getMemberName(task.assigned_to)}
                              </span>
                            </div>
                          </div>

                          {/* Quick Move Action buttons (No dropdown needed!) */}
                          {canModify && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: "6px",
                                paddingTop: "4px"
                              }}
                            >
                              {col.id === "pending" && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, "in_progress")}
                                  className="btn btn-sm btn-secondary"
                                  style={{ padding: "4px 8px", fontSize: "11.5px" }}
                                  title="Move to In Progress"
                                >
                                  Start <ArrowRight size={12} />
                                </button>
                              )}

                              {col.id === "in_progress" && (
                                <>
                                  <button
                                    onClick={() => handleMoveStatus(task.id, "pending")}
                                    className="btn btn-sm btn-secondary"
                                    style={{ padding: "4px 8px", fontSize: "11.5px", color: "var(--text-muted)" }}
                                    title="Move back to Pending"
                                  >
                                    <ArrowLeft size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveStatus(task.id, "completed")}
                                    className="btn btn-sm btn-primary"
                                    style={{ padding: "4px 8px", fontSize: "11.5px", backgroundColor: "#10b981", borderColor: "#10b981" }}
                                    title="Mark as Completed"
                                  >
                                    Done <CheckCircle2 size={12} />
                                  </button>
                                </>
                              )}

                              {col.id === "completed" && (
                                <button
                                  onClick={() => handleMoveStatus(task.id, "in_progress")}
                                  className="btn btn-sm btn-secondary"
                                  style={{ padding: "4px 8px", fontSize: "11.5px", color: "var(--text-muted)" }}
                                  title="Move back to In Progress"
                                >
                                  <ArrowLeft size={12} /> Reopen
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      <TaskDetailModal
        task={selectedTaskForDetail}
        isOpen={Boolean(selectedTaskForDetail)}
        onClose={() => setSelectedTaskForDetail(null)}
        onTaskUpdated={(updatedTask, deletedTaskId) => {
          if (deletedTaskId) {
            setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
            setSelectedTaskForDetail(null);
          } else if (updatedTask) {
            setTasks((prev) =>
              prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
            );
            setSelectedTaskForDetail((prev) =>
              prev && prev.id === updatedTask.id ? { ...prev, ...updatedTask } : prev
            );
          }
        }}
        members={members}
        isLeader={isLeader}
        currentUser={currentUser}
        showToast={showToast}
      />
    </DashboardLayout>
  );
}

export default Kanban;