import React from "react";
import { Link } from "react-router-dom";
import { Zap, ArrowRight, LayoutDashboard } from "lucide-react";

function Navbar() {
  const token = localStorage.getItem("token");

  return (
    <nav
      style={{
        height: "70px",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-color)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 36px"
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none"
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9px",
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)"
          }}
        >
          <Zap size={20} />
        </div>
        <span style={{ fontSize: "19px", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
          NexTask
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {token ? (
          <Link to="/dashboard" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LayoutDashboard size={16} /> Open Dashboard <ArrowRight size={14} />
          </Link>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary">
              Get Started <ArrowRight size={14} />
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;