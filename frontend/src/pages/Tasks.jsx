
import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import TaskDetailModal from "../components/TaskDetailModal";
import { useProject } from "../context/ProjectContext";
import API from "../services/api";
import {
  CheckSquare,
  Search,
  Filter,
  User,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Tag,
  Trash2
} from "lucide-react";
import { getLabelStyle } from "../utils/labelUtils";

function Tasks() {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Fetch tasks and members for active project
  const fetchTasksAndMembers = async () => {
    if (!selectedProjectId) {
      setTasks([]);
      setMembers([]);
      return;
    }

    try {
      setLoading(true);
      const [tasksRes, membersRes] = await Promise.all([
        API.get(`/tasks/${selectedProjectId}`),
        API.get(`/members/${selectedProjectId}`).catch(() => ({ data: [] }))
      ]);

      setTasks(tasksRes.data.tasks || []);
      setMembers(membersRes.data || []);
    } catch (err) {
      console.error("Failed to load project tasks:", err);
      if (err.response?.status === 403) {
        showToast("You are not a member of this project", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndMembers();
  }, [selectedProjectId]);

  // Delete Task after confirmation
const handleDeleteTask = async () => {
  if (!taskToDelete || !isLeader || deletingTask) return;

  try {
    setDeletingTask(true);

    await API.delete(`/tasks/${taskToDelete.id}`);

    const deletedTaskId = taskToDelete.id;

    setTasks((prev) =>
      prev.filter((task) => task.id !== deletedTaskId)
    );

    if (selectedTaskForDetail?.id === deletedTaskId) {
      setSelectedTaskForDetail(null);
    }

    setTaskToDelete(null);
    showToast("Task deleted successfully", "success");
  } catch (err) {
    console.error("Failed to delete task:", err);
    showToast(
      err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to delete task",
      "error"
    );
  } finally {
    setDeletingTask(false);
  }
};
  // Assign task (Leader only)
  const handleAssignTask = async (taskId, userId) => {
    try {
      const parsedUserId = userId ? Number(userId) : null;
      if (!parsedUserId) return;

      const res = await API.put(`/tasks/${taskId}/assign`, {
        user_id: parsedUserId
      });

      if (res.data?.message?.includes("Only project leader")) {
        showToast(res.data.message, "error");
        return;
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, assigned_to: parsedUserId } : t
        )
      );

      const targetMember = members.find((m) => m.user_id === parsedUserId);
      showToast(
        `Task assigned to ${targetMember ? targetMember.name : "member"}`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to assign task", "error");
    }
  };

  // Update task status (Leader or Assigned Member)
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const res = await API.put(`/tasks/${taskId}`, { status: newStatus });

      if (res.data?.error) {
        showToast(res.data.error, "error");
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      showToast(`Status updated to ${newStatus.replace("_", " ")}`, "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to update status", "error");
    }
  };

  // Create manual task (Leader only)
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      setCreatingTask(true);
      await API.post("/tasks/", {
        title: newTaskTitle.trim(),
        project_id: Number(selectedProjectId),
        due_date: newTaskDueDate || null
      });
      showToast("Task created successfully", "success");
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setShowCreateModal(false);
      fetchTasksAndMembers();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Failed to create task", "error");
    } finally {
      setCreatingTask(false);
    }
  };

  // Parse [Epic] and task title
  const parseTask = (rawTitle) => {
    const match = rawTitle.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      return { epic: match[1], name: match[2] };
    }
    return { epic: "General", name: rawTitle };
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const parsed = parseTask(t.title);
      const matchesSearch =
        parsed.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        parsed.epic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  // Group tasks by epic
  const groupedTasks = useMemo(() => {
    const groups = {};
    filteredTasks.forEach((t) => {
      const { epic, name } = parseTask(t.title);
      if (!groups[epic]) {
        groups[epic] = [];
      }
      groups[epic].push({ ...t, cleanName: name, epicName: epic });
    });
    return groups;
  }, [filteredTasks]);

  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Task Management</h1>
          <p className="page-subtitle">
            {selectedProject
              ? `Workspace: ${selectedProject.title}`
              : "Select a project to view and manage tasks."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isLeader && selectedProjectId && (
            <>
              <Link to="/ai" className="btn btn-secondary">
                <Sparkles size={16} color="#6366f1" />
                Generate with AI
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                <Plus size={16} />
                New Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Role Context Notification Banner */}
      {selectedProject && (
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: isLeader ? "var(--primary-light)" : "var(--bg-subtle)",
            border: `1px solid ${isLeader ? "var(--primary-border)" : "var(--border-color)"}`,
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isLeader ? (
              <ShieldCheck size={18} color="var(--primary)" />
            ) : (
              <UserCheck size={18} color="#059669" />
            )}
            <span style={{ fontSize: "13.5px", color: "var(--text-main)", fontWeight: 500 }}>
              {isLeader
                ? "You are the Project Leader. You have visibility of all tasks and can assign tasks to yourself or team members."
                : "You are a Project Member. You can view and update the status of tasks assigned to you."}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
              {isLeader ? `${members.length} team members` : "Assigned View"}
            </span>
            <Link
              to="/kanban"
              style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
            >
              Switch to Kanban <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Stats Strip */}
      {selectedProject && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
            marginBottom: "24px"
          }}
        >
          <div
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "12px 16px",
              backgroundColor: statusFilter === "all" ? "var(--primary-light)" : "var(--bg-surface)",
              border: `1px solid ${statusFilter === "all" ? "var(--primary-border)" : "var(--border-color)"}`,
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Tasks</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
              {totalCount}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("pending")}
            style={{
              padding: "12px 16px",
              backgroundColor: statusFilter === "pending" ? "var(--bg-subtle)" : "var(--bg-surface)",
              border: `1px solid ${statusFilter === "pending" ? "var(--text-subtle)" : "var(--border-color)"}`,
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Pending</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
              {pendingCount}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("in_progress")}
            style={{
              padding: "12px 16px",
              backgroundColor: statusFilter === "in_progress" ? "var(--warning-light)" : "var(--bg-surface)",
              border: `1px solid ${statusFilter === "in_progress" ? "var(--warning-border)" : "var(--border-color)"}`,
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--warning-text)" }}>In Progress</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--warning)" }}>
              {inProgressCount}
            </div>
          </div>

          <div
            onClick={() => setStatusFilter("completed")}
            style={{
              padding: "12px 16px",
              backgroundColor: statusFilter === "completed" ? "var(--success-light)" : "var(--bg-surface)",
              border: `1px solid ${statusFilter === "completed" ? "var(--success-border)" : "var(--border-color)"}`,
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            <div style={{ fontSize: "12px", color: "var(--success-text)" }}>Completed</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--success)" }}>
              {completedCount}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      {selectedProject && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "20px",
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
              placeholder="Search tasks by name or epic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "38px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Filter status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: "auto", padding: "6px 12px", fontSize: "13px" }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Task List Content */}
      {!selectedProject ? (
        <div className="empty-state">
          <div className="empty-icon">
            <CheckSquare size={28} />
          </div>
          <div className="empty-title">No project selected</div>
          <div className="empty-desc">
            Please choose a project from your workspace or create one to view and manage tasks.
          </div>
          <Link to="/projects" className="btn btn-primary btn-sm" style={{ marginTop: "8px" }}>
            Go to Projects
          </Link>
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div className="spinner spinner-primary" style={{ width: "32px", height: "32px" }} />
          <p style={{ marginTop: "12px", fontSize: "14px", color: "var(--text-muted)" }}>
            Loading tasks...
          </p>
        </div>
      ) : Object.keys(groupedTasks).length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <CheckSquare size={28} />
          </div>
          <div className="empty-title">
            {searchQuery || statusFilter !== "all"
              ? "No tasks match your filters"
              : isLeader
              ? "No tasks in this project yet"
              : "No tasks assigned to you"}
          </div>
          <div className="empty-desc">
            {isLeader
              ? "Use our AI Assistant to generate a structured epic breakdown, or create tasks manually."
              : "Your project leader hasn't assigned any tasks to your account yet. Check back soon!"}
          </div>

          {isLeader && (
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <Link to="/ai" className="btn btn-primary btn-sm">
                <Sparkles size={15} /> Generate with AI
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={15} /> Add Task Manually
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
            className="card"
            style={{
              height: "650px",
              maxHeight: "70vh",
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
              scrollBehavior: "smooth"
            }}
          >
          {Object.entries(groupedTasks).map(([epicName, epicTasks]) => (
            <div
              key={epicName}
              className="card"
              style={{ padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)"
               }}
            >
              {/* Epic Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--border-color)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Layers size={17} color="var(--primary)" />
                  <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                    {epicName}
                  </h2>
                  <span
                    style={{
                      fontSize: "11.5px",
                      backgroundColor: "var(--bg-subtle)",
                      color: "var(--text-muted)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      fontWeight: 600
                    }}
                  >
                    {epicTasks.length} {epicTasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                <div style={{ fontSize: "12px", color: "var(--text-subtle)" }}>
                  {epicTasks.filter((t) => t.status === "completed").length}/{epicTasks.length} completed
                </div>
              </div>

              {/* Tasks in this epic */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {epicTasks.map((task) => {
                  const assignedMember = members.find((m) => m.user_id === task.assigned_to);

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskForDetail(task)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        gap: "16px",
                        transition: "var(--transition)",
                        cursor: "pointer"
                      }}
                      className="task-row"
                      title="Click to view task details"
                    >
                      {/* Left: Checkmark & Title */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            marginTop: "6px",
                            borderRadius: "50%",
                            flexShrink: 0,
                            backgroundColor:
                              task.status === "completed"
                                ? "#10b981"
                                : task.status === "in_progress"
                                ? "#f59e0b"
                                : "#94a3b8"
                          }}
                        />

                        {/* Title and deadline vertically arranged */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: "6px",
                            minWidth: 0
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color:
                                task.status === "completed"
                                  ? "var(--text-muted)"
                                  : "var(--text-main)",
                              textDecoration:
                                task.status === "completed" ? "line-through" : "none",
                              lineHeight: 1.4
                            }}
                          >
                            {task.cleanName}
                          </span>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexWrap: "wrap"
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <Clock size={13} />
                              {task.due_date
                                ? `Due: ${task.due_date.slice(0, 10)}`
                                : "No deadline"}
                            </span>

                            {task.deadline_status === "overdue" && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#b91c1c",
                                  backgroundColor: "#fee2e2",
                                  padding: "3px 7px",
                                  borderRadius: "6px"
                                }}
                              >
                                Overdue
                              </span>
                            )}

                            {task.deadline_status === "upcoming" && task.due_date && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#1d4ed8",
                                  backgroundColor: "#dbeafe",
                                  padding: "3px 7px",
                                  borderRadius: "6px"
                                }}
                              >
                                Upcoming
                              </span>
                            )}

                            {task.deadline_status === "completed" && task.due_date && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#047857",
                                  backgroundColor: "#d1fae5",
                                  padding: "3px 7px",
                                  borderRadius: "6px"
                                }}
                              >
                                Completed
                              </span>
                            )}

                            {/* Label Badges */}
                            {task.labels && task.labels.length > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
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
                          </div>
                        </div>
                      </div>

                      {/* Right: Controls (Status select + Assignee select/badge + Details button) */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="task-row-controls"
                        style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, flexWrap: "wrap" }}
                      >
                        {/* Status dropdown: Always present on Tasks page as required */}
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                          className="form-select"
                          style={{
                            width: "auto",
                            padding: "6px 10px",
                            fontSize: "12.5px",
                            fontWeight: 500,
                            borderRadius: "var(--radius-sm)",
                            backgroundColor:
                              task.status === "completed"
                                ? "var(--success-light)"
                                : task.status === "in_progress"
                                ? "var(--warning-light)"
                                : "var(--bg-subtle)",
                            borderColor:
                              task.status === "completed"
                                ? "var(--success-border)"
                                : task.status === "in_progress"
                                ? "var(--warning-border)"
                                : "var(--border-color)",
                            color:
                              task.status === "completed"
                                ? "var(--success-text)"
                                : task.status === "in_progress"
                                ? "var(--warning-text)"
                                : "var(--text-main)"
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        {/* Assignee Control: Leader gets dropdown, Member gets read-only badge */}
                        {isLeader ? (
                          <select
                            value={task.assigned_to || ""}
                            onChange={(e) => handleAssignTask(task.id, e.target.value)}
                            className="form-select"
                            style={{
                              width: "140px",
                              padding: "6px 10px",
                              fontSize: "12.5px",
                              borderRadius: "var(--radius-sm)"
                            }}
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.name} {m.role === "leader" ? "(Leader)" : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "5px 10px",
                              backgroundColor: "var(--bg-subtle)",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              fontWeight: 500
                            }}
                          >
                            <User size={13} color="var(--primary)" />
                            <span>{assignedMember ? assignedMember.name : "Assigned to You"}</span>
                          </div>
                        )}

{/* Delete Task Button - Leader only */}
{isLeader && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setTaskToDelete(task);
    }}
    disabled={deletingTask}
    className="btn btn-sm"
    style={{
      padding: "6px 9px",
      fontSize: "12px",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      color: "var(--danger-text)",
      backgroundColor: "var(--danger-light)",
      border: "1px solid var(--danger-border)"
    }}
    title="Delete task"
  >
    <Trash2 size={13} />
    Delete
  </button>
)}

{/* Quick View Details Button */}
<button
  type="button"
  onClick={() => setSelectedTaskForDetail(task)}
  className="btn btn-secondary btn-sm"
  style={{
    padding: "6px 9px",
    fontSize: "12px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  }}
  title="View task details"
>
  <ExternalLink size={12} /> Details
</button>
</div>
</div>
);
})}
</div>
</div>
))}
</div>
)}


      {/* CREATE TASK MODAL (Leader only) */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Task</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. [Backend] Design user database schema"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    autoFocus
                  />

                  <span style={{ fontSize: "11.5px", color: "var(--text-subtle)", marginTop: "4px" }}>
                    Tip: Prefix with <code>[Epic Name]</code> to group this task automatically.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    min={new Date().toLocaleDateString("en-CA")}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingTask}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingTask}
                >
                  {creatingTask ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
{taskToDelete && (
  <div
    className="modal-overlay"
    onClick={() => {
      if (!deletingTask) setTaskToDelete(null);
    }}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(3px)"
    }}
  >
    <div
      className="modal-card"
      role="alertdialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: "420px",
        padding: "24px"
      }}
    >
      <h3 style={{ marginTop: 0 }}>
        Delete Task?
      </h3>

      <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
        Are you sure you want to permanently delete{" "}
        <strong>{taskToDelete.title}</strong>?
        This action cannot be undone.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "24px"
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setTaskToDelete(null)}
          disabled={deletingTask}
        >
          Cancel
        </button>

        <button
          type="button"
          className="btn btn-sm"
          onClick={handleDeleteTask}
          disabled={deletingTask}
          style={{
            backgroundColor: "#dc2626",
            color: "#fff",
            border: "1px solid #dc2626",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Trash2 size={14} />
          {deletingTask ? "Deleting..." : "Delete Task"}
        </button>
      </div>
    </div>
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


export default Tasks;
