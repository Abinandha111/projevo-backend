import React, { useState,useEffect,useRef } from "react";
import API from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  ChevronDown,
  Plus,
  ShieldCheck,
  UserCheck,
  FolderKanban,
  Sparkles,
  User,
  Settings,
  LogOut,
  Bell,
  Pointer
} from "lucide-react";
import { useProject } from "../context/ProjectContext";

function DashboardNavbar({ onOpenMobile }) {
  const {
    projects,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    isLeader,
    currentUser,
    logout
  } = useProject();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const notificationRef = useRef(null);

  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try{
      const response = await API.get("/notifications/");

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);


    }catch(error){
        console.error("Failed to fetch notifications:", error);
    }
  };

    useEffect(() =>{

      fetchNotifications();
    },[]);

    useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      notificationRef.current &&
      !notificationRef.current.contains(event.target)
    ) {
      setNotificationOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  const handleLogoutAction = () => {
    setProfileOpen(false);
    logout();
    navigate("/login");
  };

  const username = currentUser?.name || "User";
  const userEmail = currentUser?.email || "";
  const userInitial = username[0]?.toUpperCase() || "U";

  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "var(--bg-surface)",
        color: "var(--text-main)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 30
      }}
    >
      {/* Left: Mobile hamburger & Project Switcher */}
      <div className="navbar-left" 
        style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0  }}>
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobile}
          style={{
            padding: "8px",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            display: "none"
          }}
          className="mobile-menu-btn"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Global Project Switcher Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "7px 12px",
              backgroundColor: "var(--bg-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              fontSize: "13.5px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "var(--transition)"
            }}
          >
            <FolderKanban size={16} color="var(--primary)" />
            <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedProject ? selectedProject.title : "Select Project"}
            </span>

            {selectedProject && (
              <span
                className={`badge ${isLeader ? "badge-leader" : "badge-member"}`}
                style={{ fontSize: "11px", padding: "2px 7px" }}
              >
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
            )}

            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 60 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div
                className="project-switcher-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  width: "260px",
                  maxWidth: "calc(100vw - 32px)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  padding: "6px",
                  zIndex: 70
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-subtle)",
                    padding: "6px 10px"
                  }}
                >
                  Your Projects
                </div>

                {projects.length === 0 ? (
                  <div style={{ padding: "10px", fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}>
                    No projects found
                  </div>
                ) : (
                  <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                    {projects.map((p) => {
                      const isCurrent = String(p.id) === String(selectedProjectId);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProjectId(p.id);
                            setDropdownOpen(false);
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "13px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: isCurrent ? "var(--primary-light)" : "transparent",
                            color: isCurrent ? "var(--primary)" : "var(--text-main)",
                            fontWeight: isCurrent ? 600 : 500,
                            transition: "var(--transition)"
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.title}
                          </span>
                          <span
                            className={`badge ${p.role === "leader" ? "badge-leader" : "badge-member"}`}
                            style={{
                              fontSize: "10px",
                              padding: "2px 5px",
                              borderRadius: "4px"
                            }}
                          >
                            {p.role}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "6px", paddingTop: "6px" }}>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/projects");
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12.5px",
                      color: "var(--primary)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={14} /> Manage all projects
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick Action & TOP-RIGHT USER PROFILE AREA */}
      <div className="navbar-right"
          style={{ display: "flex", alignItems: "center", gap: "12px",flexShrink: 0 }}>
        <Link
          to="/projects"
          className="btn btn-sm btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={15} />
          <span className="navbar-btn-text">New / Join Project</span>
        </Link>
        <div ref={notificationRef} style={{ position: "relative" }}>
        <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                color: "inherit"
              }}
              aria-label="Notifications"
            >
              <Bell size={22} />

              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "0",
                    right: "0",
                    background: "#ef4444",
                    color: "#ffffff",
                    borderRadius: "50%",
                    minWidth: "18px",
                    height: "18px",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
                <div
                  className="notifications-dropdown"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "320px",
                    maxWidth: "calc(100vw - 32px)",
                    maxHeight: "400px",
                    overflowY: "auto",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    zIndex: 100,
                    padding: "12px"
                  }}
                >
                  <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>
                    Notifications
                  </h3>

                  {notifications.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#64748b" }}>
                      No notifications yet
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={async () => {
                              if (notification.is_read) return;

                              try {
                                await API.put(`/notifications/${notification.id}/read`);

                                setNotifications((previous) =>
                                  previous.map((item) =>
                                    item.id === notification.id
                                      ? { ...item, is_read: true }
                                      : item
                                  )
                                );

                                setUnreadCount((previous) => Math.max(0, previous - 1));
                              } catch (error) {
                                console.error("Failed to mark notification as read:", error);
                              }
                            }}
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid var(--border-color)",
                          backgroundColor: notification.is_read ? "var(--bg-surface)" : "var(--primary-light)",
                          borderRadius: "6px",
                          marginBottom: "6px",
                          cursor:"Pointer",
                        }}
                      >
                        <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                          {notification.title || "Notification"}
                        </p>

                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                          {notification.message || ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              </div>

        {/* Vertical divider */}
        <div style={{ width: "1px", height: "24px", backgroundColor: "var(--border-color)" }} />

        {/* Profile Area [Profile Photo] [Username] */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "5px 10px 5px 6px",
              borderRadius: "var(--radius-full)",
              backgroundColor: profileOpen ? "var(--bg-subtle)" : "transparent",
              border: "1px solid",
              borderColor: profileOpen ? "var(--border-color)" : "transparent",
              cursor: "pointer",
              transition: "var(--transition)"
            }}
            className="user-profile-trigger"
            aria-label="User menu"
            onMouseEnter={(e) => {
              if (!profileOpen) e.currentTarget.style.backgroundColor = "var(--bg-subtle)";
            }}
            onMouseLeave={(e) => {
              if (!profileOpen) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {/* Profile Avatar / Photo */}
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                boxShadow: "0 1px 3px rgba(79, 70, 229, 0.2)",
                flexShrink: 0
              }}
            >
              {userInitial}
            </div>

            {/* Username */}
            <span
              style={{
                fontSize: "13.5px",
                fontWeight: 600,
                color: "var(--text-main)",
                maxWidth: "140px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {username}
            </span>

            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {/* PROFILE DROPDOWN / PROFILE PANEL */}
          {profileOpen && (
            <>
              {/* Click outside backdrop */}
              <div
                style={{ position: "fixed", inset: 0, zIndex: 60 }}
                onClick={() => setProfileOpen(false)}
              />

              <div
                className="profile-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "260px",
                  maxWidth: "calc(100vw - 32px)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-xl)",
                  zIndex: 70,
                  overflow: "hidden",
                  animation: "scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                {/* User Info Header */}
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "var(--bg-subtle)",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center"
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      fontWeight: 700,
                      marginBottom: "8px",
                      boxShadow: "0 2px 5px rgba(79, 70, 229, 0.25)"
                    }}
                  >
                    {userInitial}
                  </div>

                  <div
                    style={{
                      fontSize: "14.5px",
                      fontWeight: 700,
                      color: "var(--text-main)",
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {username}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: "2px"
                    }}
                  >
                    {userEmail}
                  </div>
                </div>

                {/* Navigation Options */}
                <div style={{ padding: "6px" }}>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/profile");
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "13px",
                      color: "var(--text-main)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "var(--transition)"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <User size={16} color="var(--primary)" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "13px",
                      color: "var(--text-main)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "var(--transition)"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Settings size={16} color="#64748b" />
                    <span>Settings</span>
                  </button>
                </div>

                {/* Logout Option */}
                <div style={{ borderTop: "1px solid var(--border-color)", padding: "6px" }}>
                  <button
                    onClick={handleLogoutAction}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "13px",
                      color: "var(--danger-text)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "var(--transition)"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--danger-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <LogOut size={16} color="var(--danger)" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default DashboardNavbar;