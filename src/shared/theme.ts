import { Platform, StyleSheet, TextStyle, ViewStyle } from "react-native";

const serifFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: 'Georgia, "Times New Roman", serif'
});

const sansFont = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
});

const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: '"JetBrains Mono", Menlo, Consolas, monospace'
});

export const palette = {
  brand: "#062A72",
  brandDeep: "#041B4D",
  brandHover: "#0B3B99",
  brandMedium: "#1646A6",
  brandSoft: "#EAF0FB",
  brandSurface: "#F3F6FC",
  brandBorder: "#C5D4F2",

  primary: "#062A72",
  primaryDark: "#041D52",
  primarySoft: "#E6ECF8",
  primaryBorder: "#C5D2EC",

  accent: "#F6BA36",
  accentStrong: "#D99B16",
  accentDeep: "#9A6700",
  accentText: "#8A5A00",
  accentSoft: "#FEF5DC",
  accentBorder: "#F5D47A",

  background: "#F4F6FB",
  canvas: "#F6F8FC",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F4FA",
  surfaceSubtle: "#F8FAFD",
  surfaceInverse: "#062A72",

  ink: "#0B1933",
  inkSecondary: "#253659",
  inkMuted: "#516282",
  muted: "#516282",
  inkSubtle: "#7A8BA8",
  inkOnBrand: "#FFFFFF",
  onPrimary: "#FFFFFF",
  inkOnBrandMuted: "#C2D3F7",

  border: "#DDE4F0",
  borderStrong: "#C3CFE3",
  borderSubtle: "#EBF0F8",
  borderSoft: "#EBF0F8",

  success: "#127848",
  successSoft: "#E7F6EE",
  successBorder: "#B4E2C8",

  warning: "#B45309",
  warningSoft: "#FEF3C7",
  warningBorder: "#FCD34D",

  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",

  info: "#0369A1",
  infoSoft: "#E0F2FE",
  infoBorder: "#BAE6FD",

  hebrewTint: "#FDF9EE",
  hebrewBorder: "#EFE1B8"
} as const;

export const radii = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 999
} as const;

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32
} as const;

export const shadows: Record<"none" | "xs" | "sm" | "md" | "lg" | "card" | "raised", ViewStyle> = {
  none: {},
  xs: Platform.select({
    web: { boxShadow: "0 1px 2px rgba(6, 42, 114, 0.05)" } as ViewStyle,
    default: {
      shadowColor: "#062A72",
      shadowOpacity: 0.04,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1
    }
  })!,
  sm: Platform.select({
    web: { boxShadow: "0 2px 6px rgba(6, 42, 114, 0.06), 0 1px 2px rgba(6, 42, 114, 0.04)" } as ViewStyle,
    default: {
      shadowColor: "#062A72",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2
    }
  })!,
  md: Platform.select({
    web: { boxShadow: "0 8px 20px -4px rgba(6, 42, 114, 0.08), 0 2px 6px -1px rgba(6, 42, 114, 0.04)" } as ViewStyle,
    default: {
      shadowColor: "#062A72",
      shadowOpacity: 0.09,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4
    }
  })!,
  lg: Platform.select({
    web: { boxShadow: "0 16px 36px -6px rgba(6, 42, 114, 0.14), 0 4px 10px -2px rgba(6, 42, 114, 0.06)" } as ViewStyle,
    default: {
      shadowColor: "#062A72",
      shadowOpacity: 0.14,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8
    }
  })!,
  card: Platform.select({
    web: { boxShadow: "0 1px 2px rgba(6, 42, 114, 0.05)" } as ViewStyle,
    default: {
      shadowColor: "#062A72",
      shadowOpacity: 0.04,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1
    }
  })!,
  raised: Platform.select({
    web: { boxShadow: "0 8px 20px -4px rgba(6, 42, 114, 0.08), 0 2px 6px -1px rgba(6, 42, 114, 0.04)" } as ViewStyle,
    default: {
      shadowColor: "#062A72",
      shadowOpacity: 0.09,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4
    }
  })!
};

export const typography = {
  families: {
    serif: serifFont,
    sans: sansFont,
    mono: monoFont
  },
  display: {
    fontFamily: serifFont,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: palette.ink
  } satisfies TextStyle,
  h1: {
    fontFamily: serifFont,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: palette.ink
  } satisfies TextStyle,
  h2: {
    fontFamily: sansFont,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: palette.ink
  } satisfies TextStyle,
  h3: {
    fontFamily: sansFont,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    color: palette.ink
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: sansFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
    color: palette.brandMedium
  } satisfies TextStyle,
  body: {
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "400",
    color: palette.inkSecondary
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    color: palette.ink
  } satisfies TextStyle,
  caption: {
    fontFamily: sansFont,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    color: palette.inkMuted
  } satisfies TextStyle,
  micro: {
    fontFamily: sansFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: palette.inkMuted
  } satisfies TextStyle
} as const;

export const theme = {
  colors: palette,
  radii,
  radius: radii,
  spacing,
  shadows,
  shadow: {
    ...shadows,
    card: shadows.xs,
    raised: shadows.md
  },
  typography,
  type: {
    display: { fontSize: 28, lineHeight: 34 },
    title: { fontSize: 22, lineHeight: 28 },
    heading: { fontSize: 18, lineHeight: 24 },
    body: { fontSize: 15, lineHeight: 22 },
    small: { fontSize: 13, lineHeight: 18 },
    tiny: { fontSize: 12, lineHeight: 16 },
    bodyHebrew: { fontSize: 17, lineHeight: 30 }
  },
  focusRing: {
    outlineColor: "#4C8DFF",
    outlineWidth: 2,
    outlineOffset: 2,
    outlineStyle: "solid"
  } as const
} as const;

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.canvas
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 16,
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center"
  },
  compactContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12
  },
  header: {
    gap: 4
  },
  eyebrow: {
    ...typography.eyebrow
  },
  title: {
    ...typography.h1
  },
  subtitle: {
    ...typography.body,
    color: palette.inkMuted
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.xs
  },
  cardCompact: {
    padding: 14,
    gap: 10
  },
  cardWarm: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentBorder
  },
  cardBrand: {
    backgroundColor: palette.brandSurface,
    borderColor: palette.brandBorder
  },
  cardInverse: {
    backgroundColor: palette.brand,
    borderColor: palette.brandDeep
  },
  sectionTitle: {
    ...typography.h2
  },
  body: {
    ...typography.body
  },
  muted: {
    ...typography.caption
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center"
  },
  spreadRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between"
  },
  pill: {
    backgroundColor: palette.brandSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.brandBorder
  },
  pillText: {
    color: palette.brand,
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 15
  },
  button: {
    backgroundColor: palette.brand,
    borderRadius: radii.md,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: palette.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...shadows.xs
  },
  buttonSecondary: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    shadowOpacity: 0,
    elevation: 0
  },
  buttonGold: {
    backgroundColor: palette.accent,
    borderColor: palette.accentStrong
  },
  buttonDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: palette.dangerBorder
  },
  buttonDisabled: {
    opacity: 0.48
  },
  buttonText: {
    color: palette.inkOnBrand,
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 18
  },
  buttonSecondaryText: {
    color: palette.ink
  },
  buttonGhostText: {
    color: palette.brand
  },
  buttonGoldText: {
    color: palette.ink
  },
  buttonDangerText: {
    color: palette.danger
  },
  chip: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  chipActive: {
    backgroundColor: palette.brand,
    borderColor: palette.brand
  },
  chipText: {
    color: palette.inkSecondary,
    fontSize: 12,
    fontWeight: "700"
  },
  chipTextActive: {
    color: palette.inkOnBrand
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 10
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  divider: {
    height: 1,
    backgroundColor: palette.borderSubtle,
    width: "100%"
  }
});

export const styles = globalStyles;
