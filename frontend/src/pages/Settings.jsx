import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { useProject } from "../context/ProjectContext";
import { useTheme } from "../context/ThemeContext";
import {
  User,
  Mail,
  Palette,
  Shield,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Lock,
  LogOut,
  Info
} from "lucide-react";

function Settings() {
  const navigate = useNavigate();
  const { currentUser, logout, showToast } = useProject();

  const { theme: selectedTheme, setTheme } = useTheme();

  const username = currentUser?.name || "User";
  const userEmail = currentUser?.email || "No email";
  const userId = currentUser?.id || currentUser?.user_id || "—";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSelectTheme = (theme) => {
  setTheme(theme);

  const message = {
    light: "Light theme is active.",
    dark: "Dark theme is active.",
    system: "Theme is now following your system preference.",
  };

  showToast(message[theme], "success");
};

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Manage your account credentials, interface appearance, and active session security.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "880px", display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Section 1: Account */}
        <div className="card" style={{ padding: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
              paddingBottom: "14px",
              borderBottom: "1px solid var(--border-color)"
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                Account Settings
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                Your personal credentials stored in the database.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username</label>
              <div style={{ position: "relative" }}>
                <User
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  readOnly
                  style={{
                    paddingLeft: "38px",
                    backgroundColor: "var(--bg-subtle)",
                    cursor: "default"
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="email"
                  className="form-input"
                  value={userEmail}
                  readOnly
                  style={{
                    paddingLeft: "38px",
                    backgroundColor: "var(--bg-subtle)",
                    cursor: "default"
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "10px 14px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border-color)",
                fontSize: "12.5px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Info size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span>
                Account profile editing is managed centrally by administrators to preserve team integrity.
              </span>
            </div>
          </div>
        </div>

        
        {/* Section 2: Appearance */}
        <div className="card" style={{ padding: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
              paddingBottom: "14px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Palette size={18} />
            </div>

            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                Appearance & Theme
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                Customize your visual theme and interface preferences.
              </p>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: "12px", display: "block" }}>
              Interface Theme
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
              }}
            >
              {[
                {
                  value: "light",
                  title: "Light",
                  description: "Modern SaaS theme",
                  Icon: Sun,
                },
                {
                  value: "dark",
                  title: "Dark",
                  description: "Low-light palette",
                  Icon: Moon,
                },
                {
                  value: "system",
                  title: "System",
                  description: "Match OS setting",
                  Icon: Laptop,
                },
              ].map(({ value, title, description, Icon }) => {
                const isSelected = selectedTheme === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleSelectTheme(value)}
                    aria-pressed={isSelected}
                    style={{
                      padding: "16px",
                      borderRadius: "var(--radius-md)",
                      border: `2px solid ${
                        isSelected
                          ? "var(--primary)"
                          : "var(--border-color)"
                      }`,
                      backgroundColor: isSelected
                        ? "var(--primary-light)"
                        : "var(--bg-surface)",
                      color: "var(--text-main)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "var(--transition)",
                      width: "100%",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Icon
                        size={18}
                        color={isSelected ? "var(--primary)" : "var(--text-muted)"}
                      />

                      <div>
                        <div
                          style={{
                            fontSize: "13.5px",
                            fontWeight: 600,
                            color: "var(--text-main)",
                          }}
                        >
                          {title}
                        </div>

                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            marginTop: "3px",
                          }}
                        >
                          {description}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 size={17} color="var(--primary)" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>


        {/* Section 3: Security & Session */}
        <div className="card" style={{ padding: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "18px",
              paddingBottom: "14px",
              borderBottom: "1px solid var(--border-color)"
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                Security & Active Session
              </h2>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                Authentication mechanisms and session management.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                backgroundColor: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Lock size={16} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>
                    Authentication Token
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    JSON Web Token (HS256) • 7-day expiration
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: "11.5px",
                  padding: "3px 8px",
                  borderRadius: "var(--radius-full)",
                  backgroundColor: "#d1fae5",
                  color: "#065f46",
                  fontWeight: 600
                }}
              >
                Encrypted
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)"
              }}
            >
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-main)" }}>
                  Sign Out of Current Session
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Clears local credentials and redirects to login.
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-danger btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Settings;

