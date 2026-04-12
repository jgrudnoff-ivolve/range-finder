export type ScreenMode = "estimate" | "golf" | "calibration";

export type AppPalette = {
  bg: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  greenSoft: string;
  greenText: string;
  shadow: string;
  chipNeutral: string;
  chipNeutralText: string;
  menuActiveEstimate: string;
  menuActiveEstimateBorder: string;
  menuActiveGolf: string;
  menuActiveGolfBorder: string;
  menuActiveCalibration: string;
  menuActiveCalibrationBorder: string;
};

export const palettes: Record<ScreenMode, AppPalette> = {
  estimate: {
    bg: "#f3efe7",
    surface: "#fffaf2",
    surfaceStrong: "#ffffff",
    border: "#d8cfbf",
    text: "#1f1a14",
    muted: "#6f665b",
    accent: "#c56238",
    accentDark: "#8f4021",
    accentSoft: "#f0d1bd",
    greenSoft: "#dce8dd",
    greenText: "#33523b",
    shadow: "rgba(73, 47, 33, 0.08)",
    chipNeutral: "#efe7da",
    chipNeutralText: "#1f1a14",
    menuActiveEstimate: "#dce8dd",
    menuActiveEstimateBorder: "#bfd1c0",
    menuActiveGolf: "#dce8dd",
    menuActiveGolfBorder: "#bfd1c0",
    menuActiveCalibration: "#f0d1bd",
    menuActiveCalibrationBorder: "#dfb49a",
  },
  golf: {
    bg: "#edf5eb",
    surface: "#f7fcf4",
    surfaceStrong: "#ffffff",
    border: "#c9dcc5",
    text: "#18301f",
    muted: "#58705c",
    accent: "#3f7c4f",
    accentDark: "#285337",
    accentSoft: "#d9ecd3",
    greenSoft: "#dff0da",
    greenText: "#2f6a3f",
    shadow: "rgba(33, 66, 41, 0.10)",
    chipNeutral: "#e8f2e3",
    chipNeutralText: "#18301f",
    menuActiveEstimate: "#dff0da",
    menuActiveEstimateBorder: "#b9d6b4",
    menuActiveGolf: "#d9ecd3",
    menuActiveGolfBorder: "#a7caa5",
    menuActiveCalibration: "#e8f2e3",
    menuActiveCalibrationBorder: "#c9dcc5",
  },
  calibration: {
    bg: "#f2f0f8",
    surface: "#fbf9ff",
    surfaceStrong: "#ffffff",
    border: "#d8d0e6",
    text: "#211a33",
    muted: "#6a617b",
    accent: "#6f5ea8",
    accentDark: "#4f427c",
    accentSoft: "#ddd5f1",
    greenSoft: "#e5e0f5",
    greenText: "#554779",
    shadow: "rgba(53, 37, 92, 0.09)",
    chipNeutral: "#eee8f8",
    chipNeutralText: "#211a33",
    menuActiveEstimate: "#e5e0f5",
    menuActiveEstimateBorder: "#cbbfe6",
    menuActiveGolf: "#e5e0f5",
    menuActiveGolfBorder: "#cbbfe6",
    menuActiveCalibration: "#ddd5f1",
    menuActiveCalibrationBorder: "#bcaedf",
  },
};
