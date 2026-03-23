export interface ThemeColors {
  /** Canvas background fill */
  canvasBackground: string;
  /** Gate body fill (AND, OR, NOT, etc.) */
  gateFillColor: string;
  /** Default stroke color for component outlines and wires */
  strokeColor: string;
  /** Text color inside components (e.g. switch value) */
  textColor: string;
  /** Wire color when simulation is disabled */
  wireDefaultColor: string;
  /** Junction dot fill color */
  junctionColor: string;
  /** Pending wire stroke color */
  pendingWireColor: string;
  /** Overlay background (e.g. step counter pill) */
  overlayBg: string;
  /** Inactive signal color (switch/light when off) */
  inactiveSignalColor: string;
}

export const lightColors: ThemeColors = {
  canvasBackground: "#f8f8f8",
  gateFillColor: "#ffffff",
  strokeColor: "#1a1a1a",
  textColor: "#1a1a1a",
  wireDefaultColor: "#1a1a1a",
  junctionColor: "#1a1a1a",
  pendingWireColor: "rgba(0, 0, 0, 0.6)",
  overlayBg: "rgba(0, 0, 0, 0.6)",
  inactiveSignalColor: "#d1d5db",
};

export const darkColors: ThemeColors = {
  canvasBackground: "#1a1a2e",
  gateFillColor: "#2d2d42",
  strokeColor: "#d1d5db",
  textColor: "#d1d5db",
  wireDefaultColor: "#9ca3af",
  junctionColor: "#d1d5db",
  pendingWireColor: "rgba(255, 255, 255, 0.5)",
  overlayBg: "rgba(0, 0, 0, 0.75)",
  inactiveSignalColor: "#4b5563",
};

let _currentTheme: "light" | "dark" = "light";

export function getCurrentTheme(): "light" | "dark" {
  return _currentTheme;
}

export function setCurrentTheme(theme: "light" | "dark"): void {
  _currentTheme = theme;
}

export function getThemeColors(): ThemeColors {
  return _currentTheme === "dark" ? darkColors : lightColors;
}
