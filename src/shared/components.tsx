import { ReactNode, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { globalStyles, theme } from "./theme";

interface ScreenProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}

export function Screen({ title, eyebrow, children }: ScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const showDrawerButton = Platform.OS === "android" && width < 768;
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerItems = [
    { label: "Directory", href: "/(tabs)/directory" },
    { label: "Rabbi Hub", href: "/(tabs)/rabbi-hub" },
    { label: "Admin", href: "/(tabs)/admin" },
    { label: "Global Admin", href: "/(tabs)/global-admin" },
    { label: "Profile", href: "/(tabs)/profile" },
    { label: "Settings", href: "/(tabs)/settings" }
  ] as const;

  function navigateTo(href: (typeof drawerItems)[number]["href"]) {
    setMenuOpen(false);
    router.push(href as never);
  }

  return (
    <SafeAreaView style={globalStyles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={globalStyles.content}>
        <View style={styles.screenHeader}>
          {showDrawerButton ? (
            <Pressable
              accessibilityLabel="Open navigation menu"
              accessibilityRole="button"
              onPress={() => setMenuOpen(true)}
              style={styles.menuButton}
            >
              <Ionicons name="menu" color={theme.colors.ink} size={28} />
            </Pressable>
          ) : null}
          <View style={styles.titleBlock}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={globalStyles.title}>{title}</Text>
          </View>
        </View>
        {children}
      </ScrollView>
      <Modal animationType="fade" transparent visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.drawerBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <Pressable
                accessibilityLabel="Close navigation menu"
                accessibilityRole="button"
                onPress={() => setMenuOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" color={theme.colors.ink} size={24} />
              </Pressable>
            </View>
            {drawerItems.map((item) => (
              <Pressable key={item.href} onPress={() => navigateTo(item.href)} style={styles.drawerItem}>
                <Text style={styles.drawerItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
  screenHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  titleBlock: {
    flex: 1,
    gap: 2
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  drawerBackdrop: {
    backgroundColor: "rgba(31, 41, 51, 0.35)",
    flex: 1
  },
  drawerPanel: {
    backgroundColor: theme.colors.surface,
    borderRightColor: theme.colors.border,
    borderRightWidth: 1,
    flex: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    width: 288
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm
  },
  drawerTitle: {
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  drawerItem: {
    borderRadius: theme.radius.sm,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md
  },
  drawerItemText: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "700"
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
    alignSelf: "stretch",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13
  },
  secondaryButton: {
    backgroundColor: theme.colors.primarySoft
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
    textAlign: "center"
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
