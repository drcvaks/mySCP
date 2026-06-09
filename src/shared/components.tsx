import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { globalStyles, theme } from "./theme";

interface ScreenProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}

export function Screen({ title, eyebrow, children }: ScreenProps) {
  return (
    <SafeAreaView style={globalStyles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={globalStyles.content}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={globalStyles.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "primary" | "accent" }) {
  return (
    <View style={[styles.pill, tone === "primary" && styles.pillPrimary, tone === "accent" && styles.pillAccent]}>
      <Text style={[styles.pillText, tone !== "neutral" && styles.pillStrongText]}>{label}</Text>
    </View>
  );
}

export function Button({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" }) {
  return (
    <Pressable style={[styles.button, variant === "secondary" && styles.secondaryButton]}>
      <Text style={[styles.buttonText, variant === "secondary" && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export const styles = StyleSheet.create({
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between"
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: "#F2F4F7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  pillPrimary: {
    backgroundColor: theme.colors.primarySoft
  },
  pillAccent: {
    backgroundColor: "#FBEFD8"
  },
  pillText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  pillStrongText: {
    color: theme.colors.ink
  },
  button: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  secondaryButton: {
    backgroundColor: theme.colors.primarySoft
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButtonText: {
    color: theme.colors.primary
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  body: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 22
  },
  muted: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  statNumber: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: "900"
  }
});
