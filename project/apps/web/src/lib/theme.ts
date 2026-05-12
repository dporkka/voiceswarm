export const theme = {
  colors: {
    primary: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
    },
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      850: "#182030",
      900: "#111827",
      950: "#0b0f19",
    },
    success: {
      light: "#bbf7d0",
      DEFAULT: "#22c55e",
      dark: "#15803d",
    },
    warning: {
      light: "#fde68a",
      DEFAULT: "#f59e0b",
      dark: "#b45309",
    },
    error: {
      light: "#fecaca",
      DEFAULT: "#ef4444",
      dark: "#b91c1c",
    },
    info: {
      light: "#bfdbfe",
      DEFAULT: "#3b82f6",
      dark: "#1d4ed8",
    },
  },
  font: {
    sans: "Inter, system-ui, -apple-system, sans-serif",
    mono: "JetBrains Mono, Consolas, monospace",
  },
  spacing: {
    sidebar: "240px",
    sidebarCollapsed: "64px",
    header: "56px",
  },
  borderRadius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
    glow: "0 0 20px -5px rgba(16, 185, 129, 0.4)",
    glowStrong: "0 0 30px -5px rgba(16, 185, 129, 0.6)",
  },
  transitions: {
    fast: "150ms ease",
    normal: "250ms ease",
    slow: "350ms ease",
  },
} as const;

export type Theme = typeof theme;

export const statusColors = {
  online: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-500/20",
  },
  offline: {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    dot: "bg-gray-500",
    border: "border-gray-500/20",
  },
  busy: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-500/20",
  },
  error: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-500",
    border: "border-red-500/20",
  },
  idle: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-500/20",
  },
} as const;

export const priorityColors = {
  low: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  medium: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  high: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
  },
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
} as const;
