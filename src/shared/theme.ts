import { StyleSheet } from "react-native";

export const theme = {
  colors: {
    background: "#F7F5EF",
    surface: "#FFFFFF",
    primary: "#0F5132",
    primarySoft: "#E0EFE7",
    accent: "#B7791F",
    ink: "#1F2933",
    muted: "#667085",
    border: "#E4E0D6",
    danger: "#B42318",
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
    md: 12
  }
};

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md
  },
  title: {
    color: theme.colors.ink,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
