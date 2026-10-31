import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Kanban as KanbanIcon,
  Users,
  Sparkles,
  Zap,
  X,
  User
} from "lucide-react";
import { useProject } from "../context/ProjectContext";

function Sidebar({ mobileOpen, onCloseMobile }) {
  const navigate = useNavigate();
  const { currentUser} = useProject();

  

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/tasks", label: "Tasks", icon: CheckSquare },
    { to: "/kanban", label: "Kanban Board", icon: KanbanIcon },
    { to: "/members", label: "Members", icon: Users },
    { to: "/ai", label: "AI Assistant", icon: Sparkles, highlight: true },
  ];

  const userInitial = currentUser?.name ? currentUser.name[0].toUpperCase() : "U";

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            zIndex: 40,
            backdropFilter: "blur(2px)"
          }}
        />
      )}

      <aside
        style={{
          width: "260px",
          backgroundColor: "var(--bg-surface)",
          color: "var(--text-main)",
          flexShrink: 0,
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "fixed",
          top: 0,
          zIndex: 50,
          left:0,
          transition: "transform 0.3s ease",
          ...(mobileOpen
            ? {
                position: "fixed",
                transform: "translateX(0)",
                boxShadow: "var(--shadow-xl)"
              }
            : {})
        }}
        className={`sidebar-nav ${mobileOpen ? "open" : ""}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: "20px 22px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "9px",
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)"
              }}
            >
              <Zap size={19} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "17px", color: "var(--text-main)", letterSpacing: "-0.02em" }}>
                NexTask
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-subtle)", fontWeight: 500 }}>
                AI Project Platform
              </div>
            </div>
          </div>

          {/* Close button for mobile */}
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              style={{
                padding: "6px",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-muted)",
                cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-subtle)",
              padding: "0 10px 8px 10px"
            }}
          >
            Workspace
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onCloseMobile && onCloseMobile()}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "11px",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--primary)" : "var(--text-muted)",
                    backgroundColor: isActive ? "var(--primary-light)" : "transparent",
                    transition: "var(--transition)",
                    textDecoration: "none"
                  })}
                  className="sidebar-link"
                  onMouseEnter={(e) => {
                    const isActive = e.currentTarget.classList.contains("active");
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "var(--bg-subtle)";
                      e.currentTarget.style.color = "var(--text-main)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isActive = e.currentTarget.classList.contains("active");
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--text-muted)";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>

                  {item.highlight && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        backgroundColor: "var(--primary-light)",
                        color: "var(--primary)",
                        padding: "2px 6px",
                        borderRadius: "var(--radius-full)",
                        textTransform: "uppercase"
                      }}
                    >
                      AI
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              navigate("/profile");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              overflow: "hidden",
              cursor: "pointer",
              flex: 1
            }}
            title="View Profile"
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                fontWeight: 700,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              {userInitial}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "var(--text-main)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {currentUser?.name || "User"}
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "var(--text-subtle)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {currentUser?.email || ""}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              navigate("/profile");
            }}
            title="Account Profile"
            style={{
              padding: "7px",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "var(--transition)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            className="btn-secondary"
          >
            <User size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;