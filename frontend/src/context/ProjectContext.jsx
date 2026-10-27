import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../services/api";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState(() => {
    return localStorage.getItem("selectedProject") || "";
  });
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [toasts, setToasts] = useState([]);

  // Toast Notification helper
  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Set selected project and persist in localStorage
  const setSelectedProjectId = useCallback((id) => {
    const stringId = id ? String(id) : "";
    setSelectedProjectIdState(stringId);
    if (stringId) {
      localStorage.setItem("selectedProject", stringId);
    } else {
      localStorage.removeItem("selectedProject");
    }
  }, []);

  // Fetch projects from backend
  const refreshProjects = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setProjects([]);
      setLoadingProjects(false);
      return [];
    }

    try {
      setLoadingProjects(true);
      const res = await API.get("/projects/");
      const list = Array.isArray(res.data) ? res.data : [];
      setProjects(list);

      // Validate or auto-select active project
      const currentSelected = localStorage.getItem("selectedProject");
      const found = list.find((p) => String(p.id) === String(currentSelected));

      if (found) {
        setSelectedProjectIdState(String(found.id));
      } else if (list.length > 0) {
        setSelectedProjectIdState(String(list[0].id));
        localStorage.setItem("selectedProject", String(list[0].id));
      } else {
        setSelectedProjectIdState("");
        localStorage.removeItem("selectedProject");
      }

      return list;
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      return [];
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Fetch current user profile
  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await API.get("/auth/profile");
      if (res.data?.user) {
        const saved = localStorage.getItem("user");
        let existing = {};
        try {
          existing = saved ? JSON.parse(saved) : {};
        } catch {}
        const merged = { ...existing, ...res.data.user };
        setCurrentUser(merged);
        localStorage.setItem("user", JSON.stringify(merged));
      }
    } catch {
      // Retain existing localStorage user if offline/error
    }
  }, []);

  // Centralized logout function
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("selectedProject");
    localStorage.removeItem("user");
    setCurrentUser(null);
    setSelectedProjectIdState("");
    setProjects([]);
    showToast("Signed out successfully", "info");
  }, [showToast]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      refreshProjects();
      fetchUserProfile();
    } else {
      setLoadingProjects(false);
    }
  }, [refreshProjects, fetchUserProfile]);

  const selectedProject = projects.find(
    (p) => String(p.id) === String(selectedProjectId)
  ) || null;

  // Determine role in selected project
  const userRole = selectedProject?.role || "member";
  const isLeader = userRole === "leader";

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectedProjectId,
        setSelectedProjectId,
        userRole,
        isLeader,
        loadingProjects,
        refreshProjects,
        currentUser,
        setCurrentUser,
        logout,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

