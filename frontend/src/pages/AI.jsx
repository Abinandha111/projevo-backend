import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useProject } from "../context/ProjectContext";
import API from "../services/api";
import {
  Sparkles,
  Bot,
  Layers,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowRight,
  FolderKanban,
  Kanban as KanbanIcon,
  ShieldCheck,
  CheckSquare,
  X,
  Plus,
  RefreshCw,
  Info,
  Clock
} from "lucide-react";

function AI() {
  const navigate = useNavigate();
  const {
    projects,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    isLeader,
    showToast
  } = useProject();

  // Loaded tasks & Epics state
  const [epics, setEpics] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [hasAiBreakdown, setHasAiBreakdown] = useState(false);
  const [totalAiCount, setTotalAiCount] = useState(0);
  const [totalManualCount, setTotalManualCount] = useState(0);

  // AI Usage state
  const [aiUsage, setAiUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(true);

  // Generation Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState("form"); // "form" | "preview"
  const [formEpicMode, setFormEpicMode] = useState("existing"); // "existing" | "new"
  const [epicName, setEpicName] = useState("");
  const [newEpicInput, setNewEpicInput] = useState("");
  const [requirements, setRequirements] = useState("");
  const [formError, setFormError] = useState("");

  // Preview & Save state
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // First-time generation state
  const [isGeneratingFirstTime, setIsGeneratingFirstTime] = useState(false);
  const [firstTimeStep, setFirstTimeStep] = useState("");

  const fetchAIUsage = async () => {
    try {
      const res = await API.get("/ai/usage");
      setAiUsage(res.data);
    } catch (err) {
      console.error("Failed to load AI usage:", err);
    } finally {
      setUsageLoading(false);
    }
  };

  // Load all tasks (both AI and Manual) from backend and group by Epic
  const loadSavedTasks = async (project = selectedProject) => {
    const projId = project?.id || Number(selectedProjectId);
    if (!projId) {
      setEpics([]);
      setHasAiBreakdown(false);
      setTotalAiCount(0);
      setTotalManualCount(0);
      return;
    }

    try {
      setLoadingTasks(true);
      const res = await API.get(`/tasks/${projId}`);
      const rawTasks = res.data?.tasks || [];

      let aiCount = 0;
      let manualCount = 0;
      const epicMap = new Map();

      rawTasks.forEach((task) => {
        const isAi = task.source === "ai";
        if (isAi) {
          aiCount++;
        } else {
          manualCount++;
        }

        const match = task.title ? task.title.match(/^\[(.*?)\]\s*(.*)$/) : null;
        const epic = match ? match[1].trim() : "General / Manual Tasks";
        const taskTitle = match ? match[2].trim() : task.title;

        if (!epicMap.has(epic)) {
          epicMap.set(epic, []);
        }

        epicMap.get(epic).push({
          id: task.id,
          title: taskTitle,
          fullTitle: task.title,
          status: task.status || "pending",
          source: task.source || "manual",
          assigned_to: task.assigned_to,
          due_date: task.due_date,
          epic_order: task.epic_order ?? 0
        });
      });

      const epicsList = Array.from(epicMap, ([name, epicTasks]) => {
        const epicAi = epicTasks.filter((t) => t.source === "ai").length;
        const epicManual = epicTasks.filter((t) => t.source !== "ai").length;
        return {
          name,
          tasks: epicTasks,
          aiCount: epicAi,
          manualCount: epicManual
        };
      });

      // Reliable detection strictly based on whether AI tasks exist in database
      const hasPersistedAiTasks = Boolean(res.data?.has_ai_breakdown) || aiCount > 0;

      setEpics(epicsList);
      setTotalAiCount(aiCount);
      setTotalManualCount(manualCount);
      setHasAiBreakdown(hasPersistedAiTasks);
    } catch (err) {
      console.error("Failed to load saved tasks:", err);
      setEpics([]);
      setHasAiBreakdown(false);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadSavedTasks(selectedProject);
  }, [selectedProject]);

  useEffect(() => {
    fetchAIUsage();
  }, []);

  // Case 1: First-time generation flow (generates & saves full breakdown directly without modal)
  const handleFirstTimeFullGeneration = async () => {
    if (!selectedProjectId) {
      showToast("Please select a project first", "error");
      return;
    }
    if (!isLeader) {
      showToast("Only the project leader can generate AI tasks", "error");
      return;
    }

    try {
      setIsGeneratingFirstTime(true);
      setFirstTimeStep("Analyzing project objectives with Gemini AI...");

      const res = await API.post(`/ai/generate-tasks?project_id=${selectedProjectId}`, {});

      setFirstTimeStep("Saving structured tasks to backlog...");
      await fetchAIUsage();
      await loadSavedTasks(selectedProject);

      showToast("Initial AI task breakdown generated successfully! 🚀", "success");
    } catch (err) {
      console.error("First-time generation failed:", err);
      if (err.response?.status === 429) {
        showToast("AI daily limit reached. Please try again after cooldown.", "error");
      } else {
        const errorDetail =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to generate initial AI breakdown. Please retry.";
        showToast(errorDetail, "error");
      }
    } finally {
      setIsGeneratingFirstTime(false);
      setFirstTimeStep("");
    }
  };

  // Case 2: Open generation / regeneration modal (for existing AI breakdowns)
  const handleOpenGenerateModal = () => {
    if (!selectedProjectId) {
      showToast("Please select a project first", "error");
      return;
    }
    if (!isLeader) {
      showToast("Only the project leader can generate AI tasks", "error");
      return;
    }

    setModalStep("form");
    setFormError("");
    setRequirements("");
    setGeneratedTasks([]);

    // If existing epics exist, default to existing mode with first epic
    if (epics.length > 0) {
      setFormEpicMode("existing");
      setEpicName(epics[0].name);
      setNewEpicInput("");
    } else {
      setFormEpicMode("new");
      setEpicName("");
      setNewEpicInput("");
    }

    setShowModal(true);
  };

  // Master Click Handler: Routes to Case 1 (First-time) or Case 2 (Regeneration modal)
  const handleGenerateClick = () => {
    if (!selectedProjectId) {
      showToast("Please select a project first", "error");
      return;
    }
    if (!isLeader) {
      showToast("Only the project leader can generate AI tasks", "error");
      return;
    }

    if (hasAiBreakdown) {
      // Case 2: AI tasks already exist -> open Regeneration Modal
      handleOpenGenerateModal();
    } else {
      // Case 1: No AI tasks yet -> directly generate initial full breakdown
      handleFirstTimeFullGeneration();
    }
  };

  // Open generation form pre-filled for a specific Epic
  const handleOpenRegenerateEpic = (targetEpicName) => {
    if (!selectedProjectId) {
      showToast("Please select a project first", "error");
      return;
    }
    if (!isLeader) {
      showToast("Only the project leader can generate AI tasks", "error");
      return;
    }

    setModalStep("form");
    setFormError("");
    setFormEpicMode("existing");
    setEpicName(targetEpicName);
    setNewEpicInput("");
    setRequirements("");
    setGeneratedTasks([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isGenerating || isSaving) return;
    setShowModal(false);
    setGeneratedTasks([]);
    setRequirements("");
    setFormError("");
  };

  // Step 1: Submit form -> Generate Preview (DOES NOT SAVE TO DATABASE)
  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    setFormError("");

    const activeEpic = formEpicMode === "new" ? newEpicInput.trim() : epicName.trim();

    if (!activeEpic) {
      setFormError("Please select or enter an Epic name.");
      return;
    }

    if (!requirements.trim()) {
      setFormError("Please provide requirements/description for the AI task generation.");
      return;
    }

    try {
      setIsGenerating(true);
      const res = await API.post("/ai/generate-epic-tasks", {
        project_id: Number(selectedProjectId),
        epic_name: activeEpic,
        requirements: requirements.trim()
      });

      const returnedTasks = res.data?.tasks || [];
      if (returnedTasks.length === 0) {
        setFormError("No tasks were returned by the AI. Please try refining your requirements.");
        return;
      }

      setGeneratedTasks(returnedTasks);
      setModalStep("preview");
      await fetchAIUsage();
      showToast("Preview generated successfully! Review tasks before saving.", "success");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 429) {
        setFormError("AI daily limit reached. Please try again after cooldown.");
        showToast("AI limit exceeded.", "error");
      } else {
        const errorDetail =
          err.response?.data?.detail || "AI service temporarily unavailable. Please retry.";
        setFormError(errorDetail);
        showToast(errorDetail, "error");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2: Confirm and Save (Keep vs Replace)
  const handleSaveConfirmedTasks = async (replaceExisting) => {
    const activeEpic = formEpicMode === "new" ? newEpicInput.trim() : epicName.trim();

    if (!activeEpic || generatedTasks.length === 0) {
      showToast("No generated tasks to save.", "error");
      return;
    }

    try {
      setIsSaving(true);
      const res = await API.post("/ai/save-epic-tasks", {
        project_id: Number(selectedProjectId),
        epic_name: activeEpic,
        tasks: generatedTasks,
        replace_existing: replaceExisting
      });

      showToast(res.data?.message || "Epic tasks saved successfully! 🚀", "success");
      setShowModal(false);
      setGeneratedTasks([]);
      setRequirements("");
      setFormError("");

      // Refresh tasks from backend
      await loadSavedTasks(selectedProject);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || "Failed to save Epic tasks.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const activeEpicDisplayName =
    formEpicMode === "new" ? newEpicInput.trim() || "New Epic" : epicName;

  return (
    <DashboardLayout>
      {/* AI Hero Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          color: "white",
          padding: "32px",
          borderRadius: "var(--radius-lg)",
          marginBottom: "24px",
          boxShadow: "0 10px 25px -5px rgba(67, 56, 202, 0.3)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "relative", zIndex: 2, maxWidth: "700px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(4px)",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "14px",
              color: "#e0e7ff"
            }}
          >
            <Sparkles size={14} color="#a5b4fc" /> Powered by Google Gemini AI
          </div>

          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "10px",
              color: "white"
            }}
          >
            AI Task Breakdown & Epic Planner
          </h1>

          <p
            style={{
              fontSize: "14.5px",
              color: "#c7d2fe",
              lineHeight: 1.6,
              marginBottom: "22px"
            }}
          >
            Plan and regenerate project Epics with custom requirements. Preview newly generated
            tasks before saving, and choose whether to append them or replace existing Epic AI
            tasks while preserving all your manual tasks.
          </p>

          {/* Project Selector & Generate Action */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap"
            }}
          >
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="form-select"
              style={{
                width: "auto",
                minWidth: "220px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                color: "var(--text-main)",
                fontWeight: 600,
                border: "none",
                borderRadius: "var(--radius-md)"
              }}
            >
              <option value="">-- Choose Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.role === "leader" ? "(Leader)" : "(Member)"}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateClick}
              disabled={!selectedProjectId || !isLeader || isGeneratingFirstTime}
              className="btn"
              style={{
                backgroundColor: "#ffffff",
                color: "#4338ca",
                fontWeight: 700,
                padding: "10px 22px",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 4px 6px rgba(0,0,0,0.15)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: (!selectedProjectId || !isLeader || isGeneratingFirstTime) ? "not-allowed" : "pointer"
              }}
            >
              {isGeneratingFirstTime ? (
                <>
                  <span
                    className="spinner"
                    style={{
                      width: "16px",
                      height: "16px",
                      borderWidth: "2px",
                      borderColor: "#4338ca",
                      borderTopColor: "transparent"
                    }}
                  />
                  {firstTimeStep || "Generating AI Breakdown..."}
                </>
              ) : (
                <>
                  <Sparkles size={17} color="#4338ca" />
                  Generate AI Breakdown
                </>
              )}
            </button>
          </div>

          {!isLeader && selectedProject && (
            <div
              style={{
                marginTop: "12px",
                fontSize: "12.5px",
                color: "#fca5a5",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <AlertCircle size={14} />
              Only the Project Leader can trigger AI task generation for this project.
            </div>
          )}
        </div>
      </div>

      {/* AI Usage Card */}
      <div
        className="card"
        style={{
          padding: "18px 24px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Sparkles size={18} color="var(--primary)" />
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
            AI Usage Quota
          </h2>
        </div>

        {usageLoading ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading AI usage...</p>
        ) : aiUsage ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap"
              }}
            >
              <span style={{ fontSize: "13.5px", color: "var(--text-muted)" }}>
                Generations remaining today
              </span>
              <strong style={{ color: "var(--text-main)" }}>
                {aiUsage.remaining} / {aiUsage.limit}
              </strong>
            </div>

            <div
              style={{
                height: "8px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "999px",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(aiUsage.remaining / aiUsage.limit) * 100}%`,
                  backgroundColor: aiUsage.remaining === 0 ? "#ef4444" : "#10b981",
                  borderRadius: "999px",
                  transition: "width 0.3s ease"
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12.5px",
                color: "var(--text-muted)",
                flexWrap: "wrap",
                gap: "8px"
              }}
            >
              <span>Used: {aiUsage.used} of {aiUsage.limit} requests</span>
              {aiUsage.remaining === 0 && aiUsage.cooldown_until && (
                <span style={{ color: "#ef4444", fontWeight: 600 }}>
                  Cooldown ends: {new Date(aiUsage.cooldown_until).toLocaleTimeString()}
                </span>
              )}
            </div>
          </>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Unable to load AI usage. Please refresh.
          </p>
        )}
      </div>

      {/* Selected Project Summary Card */}
      {selectedProject && (
        <div
          className="card"
          style={{
            padding: "20px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px"
              }}
            >
              <FolderKanban size={18} color="var(--primary)" />
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                {selectedProject.title}
              </h2>
              <span className={`badge ${isLeader ? "badge-leader" : "badge-member"}`}>
                {isLeader ? (
                  <>
                    <ShieldCheck size={12} /> Leader
                  </>
                ) : (
                  "Member"
                )}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {selectedProject.description || "No description provided."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "13px",
                color: "var(--text-muted)"
              }}
            >
              <Calendar size={15} color="#f59e0b" />
              <span>{selectedProject.deadline || "No deadline"}</span>
            </div>

            <Link to="/tasks" className="btn btn-sm btn-secondary">
              <CheckSquare size={14} /> Open Tasks
            </Link>

            <Link to="/kanban" className="btn btn-sm btn-secondary">
              <KanbanIcon size={14} /> Kanban
            </Link>
          </div>
        </div>
      )}

     

      {/* Manual Tasks Only Banner (when project has manual tasks but NO AI breakdown) */}
      {selectedProject && !hasAiBreakdown && totalManualCount > 0 && (
        <div
          className="card"
          style={{
            padding: "14px 20px",
            marginBottom: "24px",
            backgroundColor: "var(--primary-light)",
            border: "1px solid var(--primary-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                border: "1px solid var(--primary-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Info size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                Manual Tasks Only
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: "var(--bg-subtle)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-color)",
                    padding: "2px 8px",
                    borderRadius: "12px"
                  }}
                >
                  {totalManualCount} Manual Tasks
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
                This project has no AI breakdown yet. Click <strong>Generate AI Breakdown</strong> to generate initial technical tasks. All existing manual tasks will be preserved.
              </p>
            </div>
          </div>

          {isLeader && (
            <button
              onClick={handleGenerateClick}
              disabled={isGeneratingFirstTime}
              className="btn btn-sm"
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {isGeneratingFirstTime ? (
                <>
                  <span className="spinner" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate AI Breakdown
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* First-time generation in-progress banner for projects with existing manual tasks */}
      {isGeneratingFirstTime && totalManualCount > 0 && (
        <div
          className="card"
          style={{
            padding: "14px 20px",
            marginBottom: "20px",
            backgroundColor: "var(--primary-light)",
            border: "1px solid var(--primary-border)",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <div className="spinner spinner-primary" style={{ width: "20px", height: "20px" }} />
          <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>
            {firstTimeStep || "Gemini AI is analyzing project goals and structuring technical epics..."}
          </div>
        </div>
      )}

      {/* =======================================================
          AI EPIC GENERATION & PREVIEW MODAL
      ======================================================= */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-card"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="var(--primary)" />
                  {modalStep === "form" ? "Generate AI Epic Tasks" : "Preview Generated Tasks"}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Project: {selectedProject?.title}
                </span>
              </div>
              <button
                className="modal-close"
                onClick={handleCloseModal}
                disabled={isGenerating || isSaving}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {modalStep === "form" ? (
              <form onSubmit={handleGeneratePreview}>
                <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {formError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "var(--radius-md)",
                        color: "#b91c1c",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Epic Selection Mode */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: "6px" }}>
                      Target Epic *
                    </label>

                    {epics.length > 0 && (
                      <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            cursor: "pointer"
                          }}
                        >
                          <input
                            type="radio"
                            name="epicMode"
                            checked={formEpicMode === "existing"}
                            onChange={() => {
                              setFormEpicMode("existing");
                              if (!epicName && epics.length > 0) setEpicName(epics[0].name);
                            }}
                          />
                          Existing Epic
                        </label>

                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            cursor: "pointer"
                          }}
                        >
                          <input
                            type="radio"
                            name="epicMode"
                            checked={formEpicMode === "new"}
                            onChange={() => setFormEpicMode("new")}
                          />
                          + Create New Epic
                        </label>
                      </div>
                    )}

                    {formEpicMode === "existing" && epics.length > 0 ? (
                      <select
                        className="form-select"
                        value={epicName}
                        onChange={(e) => setEpicName(e.target.value)}
                        required
                      >
                        {epics.map((ep, i) => (
                          <option key={i} value={ep.name}>
                            {ep.name} ({ep.tasks.length} tasks)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Authentication, Payment Gateway, Analytics Dashboard"
                        value={newEpicInput}
                        onChange={(e) => setNewEpicInput(e.target.value)}
                        autoFocus
                        required
                      />
                    )}
                  </div>

                  {/* Requirements / Description */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: "4px" }}>
                      Requirements & Description *
                    </label>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                      Describe what specific features, subtasks, or architectural changes you want
                      Gemini AI to generate for this Epic.
                    </p>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      placeholder="e.g. Add Google OAuth, JWT authentication with token refresh, email verification, password reset, and rate limiting."
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      required
                    />
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      backgroundColor: "var(--bg-subtle)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <Info size={14} color="var(--primary)" />
                    Submitting will generate a preview for your review. No tasks are saved to the
                    database until you confirm.
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <span className="spinner" /> Generating Preview...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Generate Preview
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Preview & Confirmation Screen */
              <div>
                <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "var(--success-light)",
                      border: "1px solid var(--success-border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--success-text)",
                      fontSize: "13px"
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: "2px" }}>
                      Preview Ready: {activeEpicDisplayName}
                    </div>
                    <div>
                      Gemini generated <strong>{generatedTasks.length} tasks</strong>. Review the
                      list below and choose how to apply them. <em>Existing database records have not been changed.</em>
                    </div>
                  </div>

                  {/* Generated Tasks Preview List */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: "6px" }}>
                      Generated Tasks ({generatedTasks.length}):
                    </label>
                    <div
                      style={{
                        maxHeight: "220px",
                        overflowY: "auto",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        padding: "10px 14px",
                        backgroundColor: "var(--bg-app)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px"
                      }}
                    >
                      {generatedTasks.map((t, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            fontSize: "13px",
                            color: "var(--text-main)",
                            lineHeight: 1.4
                          }}
                        >
                          <CheckCircle2
                            size={14}
                            color="#10b981"
                            style={{ flexShrink: 0, marginTop: "3px" }}
                          />
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confirmation Options Explained */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    <div
                      style={{
                        padding: "12px",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-surface)"
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-main)" }}>
                        Option 1: Keep Existing + Add New
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "3px 0 8px 0" }}>
                        Preserves all current tasks in this Epic and adds only the newly generated
                        unique tasks. Duplicates are automatically prevented.
                      </p>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSaveConfirmedTasks(false)}
                        disabled={isSaving}
                        style={{ width: "100%" }}
                      >
                        {isSaving ? <span className="spinner" /> : <Plus size={14} />} Keep Existing + Add New
                      </button>
                    </div>

                    <div
                      style={{
                        padding: "12px",
                        border: "1px solid var(--warning-border)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--warning-light)"
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--warning-text)" }}>
                        Option 2: Replace Existing Epic Tasks
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--warning-text)", opacity: 0.85, margin: "3px 0 8px 0" }}>
                        Replaces <strong>only AI-generated tasks</strong> belonging to this Epic.
                        All manual tasks and other Epics are completely preserved.
                      </p>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleSaveConfirmedTasks(true)}
                        disabled={isSaving}
                        style={{
                          width: "100%",
                          backgroundColor: "#f59e0b",
                          color: "white",
                          fontWeight: 600
                        }}
                      >
                        {isSaving ? <span className="spinner" /> : <Layers size={14} />} Replace Existing Epic Tasks
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Modal Footer */}
                <div className="modal-footer" style={{ justifyContent: "space-between" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setModalStep("form")}
                    disabled={isSaving}
                  >
                    &larr; Back to Form
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCloseModal}
                    disabled={isSaving}
                  >
                    Discard & Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AI;