export const PRESET_LABELS = [
  "Frontend",
  "Backend",
  "Bug",
  "Urgent",
  "Feature",
  "Design"
];

export const getLabelStyle = (label = "") => {
  const lower = String(label).toLowerCase();
  if (lower.includes("bug") || lower.includes("defect") || lower.includes("error")) {
    return { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" };
  }
  if (lower.includes("urgent") || lower.includes("critical") || lower.includes("high") || lower.includes("p0")) {
    return { bg: "#fef3c7", text: "#b45309", border: "#fde68a" };
  }
  if (lower.includes("frontend") || lower.includes("ui") || lower.includes("ux")) {
    return { bg: "#e0e7ff", text: "#4338ca", border: "#c7d2fe" };
  }
  if (lower.includes("backend") || lower.includes("api") || lower.includes("db") || lower.includes("database")) {
    return { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };
  }
  if (lower.includes("feature")) {
    return { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" };
  }
  if (lower.includes("design")) {
    return { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" };
  }
  return { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
};

