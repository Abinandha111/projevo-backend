import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  Kanban as KanbanIcon,
  CheckCircle2,
  Zap,
  Layers,
  KeyRound
} from "lucide-react";

function Home() {
  const token = localStorage.getItem("token");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-app)" }}>
      <Navbar />

      {/* Hero Section */}
      <section
        style={{
          padding: "90px 24px 70px 24px",
          textAlign: "center",
          maxWidth: "960px",
          margin: "0 auto"
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "#eef2ff",
            border: "1px solid #c7d2fe",
            color: "#4338ca",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "24px"
          }}
        >
          <Sparkles size={15} /> AI-Assisted Agile Management for Modern Teams
        </div>

        <h1
          style={{
            fontSize: "52px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-main)",
            lineHeight: 1.15,
            marginBottom: "20px"
          }}
        >
          Plan faster. Collaborate effortlessly. <br />
          <span
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Powered by NextGen AI.
          </span>
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: "680px",
            margin: "0 auto 36px auto"
          }}
        >
          NexTask is an intelligent project workspace designed for student and engineering teams. Break projects into epics with Gemini AI, distribute tasks with dynamic roles, and ship on time.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
          {token ? (
            <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ fontSize: "16px", padding: "14px 30px" }}>
              Go to Your Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary btn-lg" style={{ fontSize: "16px", padding: "14px 30px" }}>
                Get Started Free <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg" style={{ fontSize: "16px", padding: "14px 28px" }}>
                Live Demo Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section
        style={{
          maxWidth: "1140px",
          margin: "0 auto 80px auto",
          padding: "0 24px"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Engineered for High-Velocity Execution
          </h2>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", marginTop: "6px" }}>
            Everything your team needs from ideation to release.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px"
          }}
        >
          <div className="card" style={{ padding: "28px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#e0e7ff",
                color: "#4338ca",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px"
              }}
            >
              <Sparkles size={22} />
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              AI Backlog Synthesis
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Input your project idea and let Google Gemini construct structured technical epics and itemized task backlogs instantly.
            </p>
          </div>

          <div className="card" style={{ padding: "28px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#ede9fe",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px"
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              Dynamic Role Authority
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Project leaders assign and oversee all tasks. Members stay focused on their assigned workload with dedicated role permissions.
            </p>
          </div>

          <div className="card" style={{ padding: "28px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px"
              }}
            >
              <KanbanIcon size={22} />
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              Visual Kanban Boards
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Move tasks between Pending, In Progress, and Completed with clear assignee visibility and epic tags.
            </p>
          </div>

          <div className="card" style={{ padding: "28px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                backgroundColor: "#d1fae5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px"
              }}
            >
              <KeyRound size={22} />
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              Frictionless Invite Codes
            </h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              No complicated workspace invites. Leaders generate an 8-character code that teammates can use to join in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-surface)",
          padding: "36px 24px",
          textAlign: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
          <Zap size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, color: "var(--text-main)" }}>NexTask</span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          © {new Date().getFullYear()} NexTask AI. All Rights Reserved. Built for modern software and engineering teams.
        </p>
      </footer>
    </div>
  );
}

export default Home;