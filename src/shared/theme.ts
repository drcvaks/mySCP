import { StyleSheet } from "react-native";

export const theme = {
  colors: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    primary: "#172033",
    primarySoft: "#EEF2F7",
    accent: "#C9971A",
    accentSoft: "#FFF4D6",
    ink: "#172033",
    muted: "#64748B",
    border: "#E2E8F0",
    danger: "#B42318",
    dangerSoft: "#FEE4E2",
    success: "#15803D",
    successSoft: "#DCFCE7",
    info: "#235789"
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16
  }
};

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
    maxWidth: 1040,
    width: "100%"
  },
  title: {
    color: theme.colors.ink,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
