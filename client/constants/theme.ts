import { Platform } from "react-native";

const primaryColor = "#4A90E2";
const primaryDark = "#357ABD";
const secondaryColor = "#7B68EE";
const accentColor = "#50C878";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6A737D",
    textTertiary: "#959DA5",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6A737D",
    tabIconSelected: primaryColor,
    link: primaryColor,
    primary: primaryColor,
    primaryDark: primaryDark,
    secondary: secondaryColor,
    accent: accentColor,
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F8F9FA",
    backgroundSecondary: "#E1E4E8",
    backgroundTertiary: "#D9D9D9",
    border: "#E1E4E8",
    statusPending: "#FFA726",
    statusInProgress: "#42A5F5",
    statusCompleted: "#50C878",
    statusError: "#EF5350",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    textTertiary: "#6A737D",
    buttonText: "#FFFFFF",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: primaryColor,
    link: primaryColor,
    primary: primaryColor,
    primaryDark: primaryDark,
    secondary: secondaryColor,
    accent: accentColor,
    backgroundRoot: "#1F2123",
    backgroundDefault: "#2A2C2E",
    backgroundSecondary: "#353739",
    backgroundTertiary: "#404244",
    border: "#404244",
    statusPending: "#FFA726",
    statusInProgress: "#42A5F5",
    statusCompleted: "#50C878",
    statusError: "#EF5350",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 48,
  buttonHeight: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 28,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
