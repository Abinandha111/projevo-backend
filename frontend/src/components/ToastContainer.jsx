import React from "react";
import { useProject } from "../context/ProjectContext";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useProject();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`toast ${
              isSuccess ? "toast-success" : isError ? "toast-error" : "toast-info"
            }`}
          >
            {isSuccess && (
              <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            {isError && (
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            {!isSuccess && !isError && (
              <Info size={18} color="#4f46e5" style={{ flexShrink: 0, marginTop: 2 }} />
            )}

            <div style={{ flex: 1, fontSize: "13.5px", color: "var(--text-main)", fontWeight: 500 }}>
              {toast.message}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                color: "#94a3b8",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center"
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

