
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import DashboardNavbar from "./DashboardNavbar";
import ToastContainer from "./ToastContainer";
import { X, ChevronLeft, ChevronRight, Sparkles, FolderKanban, Users, ListTodo, LayoutDashboard } from "lucide-react";
import "../styles/Dashboard.css";

const tutorialSteps = [
  {
    icon: Sparkles,
    title: "Welcome to NexTask!",
    description: "Your smart project management workspace. Organize projects, collaborate with your team, and track progress in one place."
  },
  {
    icon: FolderKanban,
    title: "Create Projects",
    description: "Create projects by adding a title and description. Set an optional deadline and organize your project work."
  },
  {
    icon: Sparkles,
    title: "AI Task Generation",
    description: "Let AI analyze your project description and automatically generate epics and tasks to help your team get started."
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite team members using a project invite code, assign tasks, and work together as a team."
  },
  {
    icon: ListTodo,
    title: "Tasks & Kanban",
    description: "Manage tasks, track their status, and visualize your team's workflow using the Kanban board."
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard & Progress",
    description: "Monitor project statistics, completed tasks, progress charts, recent activities, and upcoming deadlines."
  }
];

function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    try {
      const user = JSON.parse(savedUser);
      const userId = user.id || user.email;

      if (!userId) return;

      const tutorialKey = `nextask_tutorial_completed_${userId}`;

      if (localStorage.getItem(tutorialKey) !== "true") {
        setShowTutorial(true);
      }
    } catch (error) {
      console.error("Failed to check tutorial status:", error);
    }
  }, []);

  const finishTutorial = () => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const userId = user.id || user.email;

        if (userId) {
          localStorage.setItem(
            `nextask_tutorial_completed_${userId}`,
            "true"
          );
        }
      } catch (error) {
        console.error("Failed to save tutorial status:", error);
      }
    }

    setShowTutorial(false);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep === tutorialSteps.length - 1) {
      finishTutorial();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const ActiveIcon = tutorialSteps[currentStep].icon;

  return (
    <div className="dashboard-root">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="dashboard-main">
        <DashboardNavbar onOpenMobile={() => setMobileOpen(true)} />

        <main className="dashboard-content-area">
          {children}
        </main>
      </div>

      <ToastContainer />

      {showTutorial && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "18px",
              padding: "28px",
              position: "relative",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <button
              type="button"
              onClick={finishTutorial}
              aria-label="Skip tutorial"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                color: "var(--text-muted)"
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "22px"
              }}
            >
              <ActiveIcon size={28} />
            </div>

            <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, marginBottom: "8px" }}>
              GETTING STARTED · {currentStep + 1} OF {tutorialSteps.length}
            </p>

            <h2
              id="tutorial-title"
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--text-main)",
                marginBottom: "12px"
              }}
            >
              {tutorialSteps[currentStep].title}
            </h2>

            <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--text-muted)", minHeight: "72px" }}>
              {tutorialSteps[currentStep].description}
            </p>

            <div style={{ display: "flex", gap: "6px", margin: "24px 0" }}>
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  style={{
                    height: "5px",
                    flex: 1,
                    borderRadius: "5px",
                    backgroundColor: index <= currentStep
                      ? "var(--primary)"
                      : "var(--bg-subtle)"
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={previousStep}
                disabled={currentStep === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  color: "var(--text-muted)",
                  opacity: currentStep === 0 ? 0.4 : 1
                }}
              >
                <ChevronLeft size={17} /> Previous
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {currentStep === tutorialSteps.length - 1 ? "Got it" : "Next"}
                {currentStep !== tutorialSteps.length - 1 && (
                  <ChevronRight size={17} />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={finishTutorial}
              style={{
                display: "block",
                margin: "18px auto 0",
                fontSize: "12px",
                color: "var(--text-muted)"
              }}
            >
              Skip Tutorial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;
