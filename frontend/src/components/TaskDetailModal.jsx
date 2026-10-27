import React, { useState, useEffect, useRef } from "react";
import API from "../services/api";
import {
  X,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  Layers,
  Calendar,
  FileText,
  Trash2,
  Save,
  Check,
  MessageSquare,
  Send,
  Tag,
  Plus,
  Paperclip,
  Download,
  UploadCloud,
  Image,
  FileCode,
  Archive
} from "lucide-react";
import { PRESET_LABELS, getLabelStyle } from "../utils/labelUtils";

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  members = [],
  isLeader = false,
  currentUser = null,
  showToast
}) {
  const [description, setDescription] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [updatingDeadline, setUpdatingDeadline] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [localDueDate, setLocalDueDate] = useState("");

  // Comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  // Labels state
  const [labels, setLabels] = useState([]);
  const [updatingLabels, setUpdatingLabels] = useState(false);
  const [customLabelInput, setCustomLabelInput] = useState("");

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchComments = async (taskId) => {
    if (!taskId) return;
    try {
      setLoadingComments(true);
      const res = await API.get(`/tasks/${taskId}/comments`);
      setComments(res.data?.comments || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchAttachments = async (taskId) => {
    if (!taskId) return;
    try {
      setLoadingAttachments(true);
      const res = await API.get(`/tasks/${taskId}/attachments`);
      setAttachments(res.data?.attachments || []);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      const desc = task.description || "";
      setDescription(desc);
      setInitialDescription(desc);
      setLocalDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
      setLabels(Array.isArray(task.labels) ? task.labels : []);
      if (isOpen && task.id) {
        fetchComments(task.id);
        fetchAttachments(task.id);
      }
    }
  }, [task, isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const canEdit = isLeader || (currentUser && task.assigned_to === currentUser.user_id);

  // Extract Epic and Clean Task Title
  const parseTaskTitle = (fullTitle = "") => {
    const match = fullTitle.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      return { epic: match[1], title: match[2] };
    }
    return { epic: "General", title: fullTitle };
  };

  const { epic, title: taskCleanTitle } = parseTaskTitle(task.title || "");
  const assignedMember = members.find((m) => m.user_id === task.assigned_to);

  // 1. Update Description
  const handleSaveDescription = async () => {
    if (!canEdit) return;
    try {
      setSavingDesc(true);
      const res = await API.put(`/tasks/${task.id}/description`, {
        description: description.trim()
      });
      setInitialDescription(description.trim());
      if (showToast) showToast("Task description updated", "success");
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, description: description.trim() });
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to update description", "error");
      }
    } finally {
      setSavingDesc(false);
    }
  };

  // 2. Update Status
  const handleStatusChange = async (newStatus) => {
    if (!canEdit) return;
    try {
      setUpdatingStatus(true);
      await API.put(`/tasks/${task.id}`, { status: newStatus });
      if (showToast) showToast(`Status updated to ${newStatus.replace("_", " ")}`, "success");
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, status: newStatus });
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.error || "Failed to update status", "error");
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 3. Update Assignee (Leader only)
  const handleAssigneeChange = async (userId) => {
    if (!isLeader) return;
    try {
      setUpdatingAssignee(true);
      const parsedUserId = userId ? Number(userId) : null;
      if (!parsedUserId) return;

      await API.put(`/tasks/${task.id}/assign`, { user_id: parsedUserId });
      const target = members.find((m) => m.user_id === parsedUserId);
      if (showToast) {
        showToast(`Task assigned to ${target ? target.name : "member"}`, "success");
      }
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, assigned_to: parsedUserId });
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.message || "Failed to assign task", "error");
      }
    } finally {
      setUpdatingAssignee(false);
    }
  };

  // 4. Update Deadline (Leader only)
  const handleDeadlineSave = async () => {
    if (!isLeader) return;
    try {
      setUpdatingDeadline(true);
      await API.put(`/tasks/${task.id}/deadline`, {
        due_date: localDueDate || null
      });
      if (showToast) showToast("Deadline updated successfully", "success");
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, due_date: localDueDate || null });
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to update deadline", "error");
      }
    } finally {
      setUpdatingDeadline(false);
    }
  };

  // 5. Delete Task (Leader only)
  const handleDeleteTask = async () => {
    if (!isLeader) return;
    
    try {
      setDeletingTask(true);

      await API.delete(`/tasks/${task.id}`);
      setShowDeleteConfirm(false);

      if (showToast) showToast("Task deleted successfully", "success");

      onClose();
      if (onTaskUpdated) {
        onTaskUpdated(null, task.id); // signals deletion
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to delete task", "error");
      }
    } finally {
      setDeletingTask(false);
    }
  };

  // 6. Comments: Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    const cleanContent = newComment.trim();
    if (!cleanContent) return;

    try {
      setSubmittingComment(true);
      const res = await API.post(`/tasks/${task.id}/comments`, {
        content: cleanContent
      });
      if (res.data?.comment) {
        setComments((prev) => [...prev, res.data.comment]);
        setNewComment("");
        if (showToast) showToast("Comment posted", "success");
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to post comment", "error");
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  // 7. Comments: Delete Comment
  const handleDeleteComment = async (commentId) => {
    try {
      setDeletingCommentId(commentId);
      await API.delete(`/tasks/${task.id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (showToast) showToast("Comment deleted", "success");
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to delete comment", "error");
      }
    } finally {
      setDeletingCommentId(null);
    }
  };

  // 8. Labels: Save / Toggle / Add / Remove
  const handleSaveLabels = async (newLabels) => {
    if (!canEdit) return;
    try {
      setUpdatingLabels(true);
      const res = await API.put(`/tasks/${task.id}/labels`, {
        labels: newLabels
      });
      const saved = res.data?.task?.labels || newLabels;
      setLabels(saved);
      if (showToast) showToast("Labels updated successfully", "success");
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, labels: saved });
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to update labels", "error");
      }
    } finally {
      setUpdatingLabels(false);
    }
  };

  const handleTogglePreset = (preset) => {
    if (!canEdit || updatingLabels) return;
    const exists = labels.some((l) => l.toLowerCase() === preset.toLowerCase());
    if (exists) {
      const updated = labels.filter((l) => l.toLowerCase() !== preset.toLowerCase());
      handleSaveLabels(updated);
    } else {
      if (labels.length >= 10) {
        if (showToast) showToast("Maximum 10 labels allowed per task", "warning");
        return;
      }
      handleSaveLabels([...labels, preset]);
    }
  };

  const handleAddCustomLabel = (e) => {
    e.preventDefault();
    if (!canEdit || updatingLabels) return;
    const clean = customLabelInput.trim();
    if (!clean) return;
    if (labels.some((l) => l.toLowerCase() === clean.toLowerCase())) {
      setCustomLabelInput("");
      return;
    }
    if (labels.length >= 10) {
      if (showToast) showToast("Maximum 10 labels allowed per task", "warning");
      return;
    }
    handleSaveLabels([...labels, clean]);
    setCustomLabelInput("");
  };

  const handleRemoveLabel = (labelToRemove) => {
    if (!canEdit || updatingLabels) return;
    const updated = labels.filter((l) => l !== labelToRemove);
    handleSaveLabels(updated);
  };

  // 9. File Attachments: Upload, Download, Delete
  const handleFileUpload = async (file) => {
    if (!file) return;
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_SIZE) {
      if (showToast) showToast("File size exceeds 15MB limit", "error");
      return;
    }
    try {
      setUploadingAttachment(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await API.post(`/tasks/${task.id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.attachment) {
        setAttachments((prev) => [res.data.attachment, ...prev]);
        if (showToast) showToast("File attached successfully", "success");
      }
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to upload file", "error");
      }
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadAttachment = async (att) => {
    try {
      const res = await API.get(`/tasks/${task.id}/attachments/${att.id}/download`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", att.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Failed to download file", "error");
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;
    try {
      setDeletingAttachmentId(attId);
      await API.delete(`/tasks/${task.id}/attachments/${attId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
      if (showToast) showToast("Attachment deleted", "success");
    } catch (err) {
      console.error(err);
      if (showToast) {
        showToast(err.response?.data?.detail || "Failed to delete attachment", "error");
      }
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (filename = "") => {
    const ext = filename.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      return <Image size={15} color="#0284c7" />;
    }
    if (["pdf"].includes(ext)) {
      return <FileText size={15} color="#dc2626" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return <Archive size={15} color="#d97706" />;
    }
    if (["js", "jsx", "ts", "tsx", "py", "html", "css", "json", "sql"].includes(ext)) {
      return <FileCode size={15} color="#7c3aed" />;
    }
    return <Paperclip size={15} color="#64748b" />;
  };

  const isDescChanged = description.trim() !== initialDescription.trim();

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 100,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)"
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "720px",
          width: "95%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                padding: "3px 8px",
                borderRadius: "var(--radius-sm)"
              }}
            >
              #{task.id}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
                backgroundColor: "var(--primary-light)",
                border: "1px solid var(--primary-border)",
                padding: "3px 10px",
                borderRadius: "var(--radius-full)"
              }}
            >
              <Layers size={13} />
              {epic}
            </span>

            {task.source === "ai" ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-full)"
                }}
              >
                <Sparkles size={11} /> AI Task
              </span>
            ) : (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-color)",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-full)"
                }}
              >
                Manual Task
              </span>
            )}
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            style={{ padding: "6px", borderRadius: "var(--radius-sm)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Two Columns */}
        <div
          className="modal-body task-detail-modal-body"
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "1.8fr 1.2fr",
            gap: "24px",
            alignItems: "flex-start"
          }}
        >
          {/* Left Column: Title & Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Title */}
            <div>
              <h2
                style={{
                  fontSize: "19px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  lineHeight: 1.4,
                  margin: 0
                }}
              >
                {taskCleanTitle}
              </h2>

              {labels && labels.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                  {labels.map((lbl) => {
                    const style = getLabelStyle(lbl);
                    return (
                      <span
                        key={lbl}
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 600,
                          backgroundColor: style.bg,
                          color: style.text,
                          border: `1px solid ${style.border}`,
                          padding: "2px 9px",
                          borderRadius: "var(--radius-full)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Tag size={10} />
                        {lbl}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Description Section */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px"
                }}
              >
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <FileText size={15} color="var(--primary)" />
                  Description
                </label>

                {canEdit && isDescChanged && (
                  <button
                    onClick={handleSaveDescription}
                    disabled={savingDesc}
                    className="btn btn-sm btn-primary"
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    {savingDesc ? (
                      <span className="spinner" style={{ width: "12px", height: "12px" }} />
                    ) : (
                      <Save size={13} />
                    )}
                    Save
                  </button>
                )}
              </div>

              {canEdit ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <textarea
                    rows={6}
                    className="form-textarea"
                    placeholder="Add details, notes, acceptance criteria, or technical steps..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      fontSize: "13.5px",
                      lineHeight: 1.5,
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      borderColor: isDescChanged ? "var(--primary)" : "var(--border-color)"
                    }}
                  />
                  {isDescChanged && (
                    <span style={{ fontSize: "11.5px", color: "var(--primary)", fontWeight: 500 }}>
                      Unsaved changes. Click "Save" above to update description.
                    </span>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "var(--bg-subtle)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "13px",
                    color: task.description ? "var(--text-main)" : "var(--text-muted)",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {task.description || "No description provided for this task."}
                </div>
              )}
            </div>

            {/* File Attachments Section */}
            <div style={{ marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px"
                }}
              >
                <label
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Paperclip size={15} color="var(--primary)" />
                  Attachments
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "var(--bg-subtle)",
                      color: "var(--text-muted)",
                      padding: "1px 7px",
                      borderRadius: "var(--radius-full)",
                      marginLeft: "4px"
                    }}
                  >
                    {attachments.length}
                  </span>
                </label>

                {/* Upload Trigger Button */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    disabled={uploadingAttachment}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    {uploadingAttachment ? (
                      <>
                        <span className="spinner" style={{ width: "12px", height: "12px" }} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={13} color="var(--primary)" />
                        Add Attachment
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Attachments List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {loadingAttachments ? (
                  <div style={{ textAlign: "center", padding: "12px 0", color: "var(--text-muted)", fontSize: "12.5px" }}>
                    <span className="spinner" style={{ width: "14px", height: "14px", marginRight: "6px" }} />
                    Loading attachments...
                  </div>
                ) : attachments.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      backgroundColor: "var(--bg-subtle)",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--border-color)",
                      color: "var(--text-muted)",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      transition: "var(--transition)"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                  >
                    <UploadCloud size={18} style={{ margin: "0 auto 6px", display: "block", color: "var(--text-muted)" }} />
                    No files attached yet. Click to upload documents, screenshots, or logs (max 15MB).
                  </div>
                ) : (
                  attachments.map((att) => {
                    const isUploader = currentUser && att.user_id === currentUser.user_id;
                    const canDelete = isLeader || isUploader;
                    const isDeleting = deletingAttachmentId === att.id;

                    return (
                      <div
                        key={att.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 12px",
                          backgroundColor: "var(--bg-subtle)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          gap: "12px"
                        }}
                      >
                        {/* File Info */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-color)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            {getFileIcon(att.filename)}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "2px" }}>
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "var(--text-main)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                              title={att.filename}
                            >
                              {att.filename}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {formatFileSize(att.file_size)} • {att.uploader_name}
                              {att.created_at ? ` • ${new Date(att.created_at).toLocaleDateString()}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Actions: Download & Delete */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "4px 8px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            title="Download file"
                          >
                            <Download size={13} />
                            Download
                          </button>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id)}
                              disabled={isDeleting}
                              className="btn btn-sm"
                              style={{
                                padding: "4px 7px",
                                color: "#b91c1c",
                                backgroundColor: "transparent",
                                border: "1px solid transparent"
                              }}
                              title="Delete attachment"
                            >
                              {isDeleting ? (
                                <span className="spinner" style={{ width: "12px", height: "12px" }} />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Discussion / Comments Section */}
            <div style={{ marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px"
                }}
              >
                <label
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <MessageSquare size={16} color="var(--primary)" />
                  Discussion ({comments.length})
                </label>
              </div>

              {/* Comments List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  paddingRight: "4px",
                  marginBottom: "14px"
                }}
              >
                {loadingComments ? (
                  <div style={{ padding: "16px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "12.5px" }}>
                    <span className="spinner" style={{ width: "14px", height: "14px", display: "inline-block", marginRight: "6px" }} />
                    Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      backgroundColor: "var(--bg-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-muted)",
                      fontSize: "12.5px"
                    }}
                  >
                    No comments yet. Start the discussion below!
                  </div>
                ) : (
                  comments.map((c) => {
                    const isAuthor = currentUser && c.user_id === currentUser.user_id;
                    const canDeleteComment = isAuthor || isLeader;
                    const initial = c.user_name ? c.user_name[0].toUpperCase() : "U";
                    const formattedDate = c.created_at
                      ? new Date(c.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "";

                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "10px 12px",
                          backgroundColor: "var(--bg-subtle)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-color)"
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: isAuthor ? "var(--primary-light)" : "var(--bg-surface)",
                            color: isAuthor ? "var(--primary)" : "var(--text-muted)",
                            border: `1px solid ${isAuthor ? "var(--primary-border)" : "var(--border-color)"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 700,
                            flexShrink: 0
                          }}
                        >
                          {initial}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "3px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)" }}>
                                {c.user_name}
                              </span>
                              {isAuthor && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    backgroundColor: "var(--primary-light)",
                                    color: "var(--primary)",
                                    fontWeight: 600
                                  }}
                                >
                                  You
                                </span>
                              )}
                              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                {formattedDate}
                              </span>
                            </div>

                            {canDeleteComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                disabled={deletingCommentId === c.id}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "2px",
                                  color: "#94a3b8"
                                }}
                                title="Delete comment"
                              >
                                {deletingCommentId === c.id ? (
                                  <span className="spinner" style={{ width: "11px", height: "11px" }} />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: "13px",
                              color: "var(--text-main)",
                              lineHeight: 1.4,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word"
                            }}
                          >
                            {c.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Input Form */}
              <form onSubmit={handleAddComment}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Write a comment or update..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={submittingComment}
                    style={{ fontSize: "13px", padding: "8px 12px", flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submittingComment || !newComment.trim()}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "8px 14px",
                      fontSize: "12.5px"
                    }}
                  >
                    {submittingComment ? (
                      <span className="spinner" style={{ width: "12px", height: "12px" }} />
                    ) : (
                      <Send size={13} />
                    )}
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Properties Sidebar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              backgroundColor: "var(--bg-subtle)",
              padding: "16px 18px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)"
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Task Properties
            </div>

            {/* Status Field */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Status
              </label>
              {canEdit ? (
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updatingStatus}
                  className="form-select"
                  style={{
                    width: "100%",
                    fontSize: "13px",
                    fontWeight: 600,
                    backgroundColor:
                      task.status === "completed"
                        ? "var(--success-light)"
                        : task.status === "in_progress"
                        ? "var(--warning-light)"
                        : "var(--bg-surface)",
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
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor:
                      task.status === "completed"
                        ? "#ecfdf5"
                        : task.status === "in_progress"
                        ? "#fffbeb"
                        : "#f1f5f9",
                    color:
                      task.status === "completed"
                        ? "#047857"
                        : task.status === "in_progress"
                        ? "#b45309"
                        : "#475569"
                  }}
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 size={14} color="#10b981" />
                  ) : task.status === "in_progress" ? (
                    <Clock size={14} color="#f59e0b" />
                  ) : (
                    <Circle size={14} color="#94a3b8" />
                  )}
                  {task.status.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Assignee Field */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Assignee
              </label>
              {isLeader ? (
                <select
                  value={task.assigned_to || ""}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  disabled={updatingAssignee}
                  className="form-select"
                  style={{ width: "100%", fontSize: "13px" }}
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
                    gap: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--text-main)",
                    backgroundColor: "var(--bg-surface)",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)"
                  }}
                >
                  <User size={14} color="var(--primary)" />
                  <span>{assignedMember ? assignedMember.name : "Assigned to You"}</span>
                </div>
              )}
            </div>

            {/* Deadline Field */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Deadline
              </label>
              {isLeader ? (
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="date"
                    className="form-input"
                    value={localDueDate}
                    onChange={(e) => setLocalDueDate(e.target.value)}
                    style={{ fontSize: "12.5px", padding: "5px 8px", flex: 1 }}
                  />
                  {localDueDate !== (task.due_date ? task.due_date.slice(0, 10) : "") && (
                    <button
                      onClick={handleDeadlineSave}
                      disabled={updatingDeadline}
                      className="btn btn-sm btn-primary"
                      style={{ padding: "4px 8px" }}
                      title="Save new deadline"
                    >
                      {updatingDeadline ? (
                        <span className="spinner" style={{ width: "12px", height: "12px" }} />
                      ) : (
                        <Check size={14} />
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "var(--text-main)"
                  }}
                >
                  <Calendar size={14} color="var(--text-muted)" />
                  <span>
                    {task.due_date ? task.due_date.slice(0, 10) : "No deadline"}
                  </span>
                </div>
              )}

              {/* Deadline Status Badge */}
              {task.deadline_status && task.due_date && (
                <div style={{ marginTop: "6px" }}>
                  {task.deadline_status === "overdue" && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#b91c1c",
                        backgroundColor: "#fee2e2",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <AlertCircle size={11} /> Overdue
                    </span>
                  )}
                  {task.deadline_status === "upcoming" && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#1d4ed8",
                        backgroundColor: "#dbeafe",
                        padding: "2px 8px",
                        borderRadius: "4px"
                      }}
                    >
                      Upcoming
                    </span>
                  )}
                  {task.deadline_status === "completed" && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#047857",
                        backgroundColor: "#d1fae5",
                        padding: "2px 8px",
                        borderRadius: "4px"
                      }}
                    >
                      Completed on time
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Labels Section */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Tag size={13} color="var(--primary)" /> Labels
                </label>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                  {labels.length}/10
                </span>
              </div>

              {/* Active Labels List */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px", minHeight: "26px" }}>
                {labels.length === 0 ? (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    No labels assigned
                  </span>
                ) : (
                  labels.map((lbl) => {
                    const style = getLabelStyle(lbl);
                    return (
                      <span
                        key={lbl}
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 600,
                          backgroundColor: style.bg,
                          color: style.text,
                          border: `1px solid ${style.border}`,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        {lbl}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(lbl)}
                            disabled={updatingLabels}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              color: style.text,
                              opacity: 0.75
                            }}
                            title={`Remove ${lbl}`}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </span>
                    );
                  })
                )}
              </div>

              {canEdit && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Quick Add Presets */}
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "5px", fontWeight: 500 }}>
                      Quick add / toggle:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {PRESET_LABELS.map((preset) => {
                        const isSelected = labels.some((l) => l.toLowerCase() === preset.toLowerCase());
                        const style = getLabelStyle(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleTogglePreset(preset)}
                            disabled={updatingLabels}
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "var(--radius-full)",
                              border: `1px solid ${isSelected ? style.border : "var(--border-color)"}`,
                              backgroundColor: isSelected ? style.bg : "var(--bg-surface)",
                              color: isSelected ? style.text : "var(--text-muted)",
                              cursor: "pointer",
                              transition: "var(--transition)"
                            }}
                          >
                            {isSelected ? "✓ " : "+ "}{preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Label Input */}
                  <form onSubmit={handleAddCustomLabel} style={{ display: "flex", gap: "5px" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Add custom tag..."
                      value={customLabelInput}
                      onChange={(e) => setCustomLabelInput(e.target.value)}
                      maxLength={30}
                      disabled={updatingLabels || labels.length >= 10}
                      style={{ fontSize: "12px", padding: "5px 8px", flex: 1 }}
                    />
                    <button
                      type="submit"
                      className="btn btn-secondary btn-sm"
                      disabled={updatingLabels || !customLabelInput.trim() || labels.length >= 10}
                      style={{ padding: "5px 8px", fontSize: "11.5px" }}
                      title="Add label"
                    >
                      <Plus size={12} />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Delete Task (Leader only) */}
            {isLeader && (
              <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deletingTask}
                  className="btn btn-sm"
                  style={{
                    width: "100%",
                    color: "var(--danger-text)",
                    backgroundColor: "var(--danger-light)",
                    border: "1px solid var(--danger-border)",
                    fontSize: "12.5px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  {deletingTask ? (
                    <span className="spinner" style={{ width: "12px", height: "12px" }} />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Delete Task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-surface)",
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>


      {/* Delete Confirmation Modal */}
{showDeleteConfirm && (
  <div
    onClick={() => {
      if (!deletingTask) setShowDeleteConfirm(false);
    }}
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 200,
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(3px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}
  >
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-task-title"
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: "420px",
        padding: "24px",
        borderRadius: "12px",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.25)"
      }}
    >
      <h3
        id="delete-task-title"
        style={{
          margin: "0 0 12px",
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--text-main)"
        }}
      >
        Are you sure?
      </h3>

      <p
        style={{
          margin: "0 0 24px",
          fontSize: "14px",
          lineHeight: 1.6,
          color: "var(--text-muted)"
        }}
      >
        Are you sure you want to permanently delete "{taskCleanTitle}"?
        This action cannot be undone.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px"
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowDeleteConfirm(false)}
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
            color: "#ffffff",
            border: "1px solid #dc2626",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          {deletingTask ? (
            <>
              <span
                className="spinner"
                style={{ width: "12px", height: "12px" }}
              />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 size={14} />
              Delete Task
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}