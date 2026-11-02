
import React, { useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import {
  Zap,
  Mail,
  ArrowLeft,
  AlertCircle,
  ShieldCheck
} from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [resetToken, setResetToken] = useState("");
  const [resetCompleted, setResetCompleted] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await API.post("/auth/forgot-password", null, {
        params: { email }
      });

      setStep(2);
      setMessage("OTP sent successfully! Please check your email.");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await API.post("/auth/verify-reset-otp", null, {
        params: { email, otp }
      });

      setResetToken(res.data.reset_token);
      setStep(3);
      setMessage("OTP verified successfully!");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await API.post("/auth/reset-password", null, {
        params: {
          email,
          reset_token: resetToken,
          new_password: newPassword
        }
      });

      setResetCompleted(true);
      setMessage("Password reset successfully!");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to reset password. Please try again."
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
        justifyContent: "center",
        alignItems: "center",
        padding: "24px"
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px"
          }}>
            <Zap size={28} color="#6366f1" />
            <span style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text-main)"
            }}>
              NexTask
            </span>
          </div>

          <h1 style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--text-main)"
          }}>
            {step === 1 && "Forgot Password?"}
            {step === 2 && "Verify OTP"}
            {step === 3 && (resetCompleted ? "Password Reset" : "Set New Password")}
          </h1>

          <p style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            marginTop: "8px"
          }}>
            {step === 1 && "Enter your registered email address to receive an OTP."}
            {step === 2 && `Enter the 6-digit OTP sent to ${email}.`}
            {step === 3 && (resetCompleted
              ? "Your password has been updated successfully."
              : "Enter your new password below."
            )}
          </p>
        </div>

        <div
          className="card"
          style={{
            padding: "32px",
            backgroundColor: "var(--bg-surface)",
            boxShadow: "var(--shadow-lg)"
          }}
        >
          {error && (
            <div style={{
              color: "var(--danger-text)",
              marginBottom: "16px",
              fontSize: "13px"
            }}>
              <AlertCircle size={15} style={{
                display: "inline",
                marginRight: "6px"
              }} />
              {error}
            </div>
          )}

          {message && (
            <p style={{
              color: "var(--success)",
              fontSize: "13px",
              marginBottom: "16px"
            }}>
              {message}
            </p>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label className="form-label">Email Address</label>

                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    color="#94a3b8"
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)"
                    }}
                  />

                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: "38px" }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "11px"
                }}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label className="form-label">Enter 6-Digit OTP</label>

                <div style={{ position: "relative" }}>
                  <ShieldCheck
                    size={16}
                    color="#94a3b8"
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)"
                    }}
                  />

                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    inputMode="numeric"
                    style={{
                      paddingLeft: "38px",
                      letterSpacing: "5px"
                    }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || otp.length !== 6}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "11px"
                }}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
                style={{
                  width: "100%",
                  marginTop: "14px",
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600
                }}
              >
                Change Email
              </button>
            </form>
          )}

          {step === 3 && !resetCompleted && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">New Password</label>

                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>

                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "11px"
                }}
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </button>
            </form>
          )}

          {step === 3 && resetCompleted && (
            <div style={{
              textAlign: "center",
              padding: "12px 0"
            }}>
              <ShieldCheck
                size={42}
                color="#16a34a"
                style={{ marginBottom: "12px" }}
              />

              <p style={{
                color: "var(--text-main)",
                fontSize: "14px"
              }}>
                Your password has been changed successfully. You can now log in with your new password.
              </p>

              <Link
                to="/login"
                className="btn btn-primary"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "20px",
                  padding: "11px",
                  textDecoration: "none"
                }}
              >
                Go to Login
              </Link>
            </div>
          )}

          {!resetCompleted && (
            <div style={{
              textAlign: "center",
              marginTop: "24px",
              fontSize: "13px"
            }}>
              <Link
                to="/login"
                style={{
                  color: "var(--primary)",
                  textDecoration: "none",
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={14} style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: "5px"
                }} />
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
