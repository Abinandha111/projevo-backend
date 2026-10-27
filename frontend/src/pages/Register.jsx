import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { Zap, Mail, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useProject } from "../context/ProjectContext";

function Register() {
  const navigate = useNavigate();
  const { showToast } = useProject();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
    if (errorMessage) setErrorMessage("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErrorMessage("All fields are required.");
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      await API.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password
      });

      showToast("Account created successfully! Please sign in 🚀", "success");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || "Registration failed. Email might already be taken."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-app)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px"
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
              textDecoration: "none"
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 4px 6px rgba(79, 70, 229, 0.25)"
              }}
            >
              <Zap size={22} />
            </div>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
              NexTask
            </span>
          </Link>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)" }}>
            Create your account
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
            Get started with AI-assisted project management.
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            padding: "32px",
            boxShadow: "var(--shadow-lg)",
            backgroundColor: "var(--bg-surface)"
          }}
        >
          {errorMessage && (
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--danger-light)",
                border: "1px solid var(--danger-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--danger-text)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "20px"
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: "relative" }}>
                <User
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Johnson"
                  onChange={handleChange}
                  value={form.name}
                  autoComplete="name"
                  required
                  style={{ paddingLeft: "38px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="alex@company.com"
                  onChange={handleChange}
                  value={form.email}
                  autoComplete="email"
                  required
                  style={{ paddingLeft: "38px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="At least 6 characters"
                  onChange={handleChange}
                  value={form.password}
                  autoComplete="new-password"
                  required
                  style={{ paddingLeft: "38px", paddingRight: "38px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    cursor: "pointer"
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Repeat your password"
                  onChange={handleChange}
                  value={form.confirmPassword}
                  autoComplete="new-password"
                  required
                  style={{ paddingLeft: "38px" }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "12px", padding: "11px" }}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border-color)",
              textAlign: "center",
              fontSize: "13.5px",
              color: "var(--text-muted)"
            }}
          >
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;