import { ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, ScrollViewProps, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { globalStyles, theme } from "./theme";
import { useAuthState } from "../state/AuthState";
import { useAppState } from "../state/AppState";

interface ScreenProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  onScroll?: ScrollViewProps["onScroll"];
}

export function Screen({ title, eyebrow, children, onRefresh, refreshing = false, scrollRef, onScroll }: ScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthState();
  const { chaburos, selectedChaburahId } = useAppState();
  const { width } = useWindowDimensions();
  const showDrawerButton = Platform.OS !== "web" && width < 768;
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const askRavEnabled = selectedChaburah?.askRavEnabled ?? true;
  const canManageAskRavSetting = profile?.role === "local_admin" || profile?.role === "local_rabbi" || profile?.role === "global_admin";
  const drawerItems = [
    { label: "Directory", href: "/(tabs)/directory", icon: "map-outline" as const, show: true },
    { label: "Ask Rav", href: "/(tabs)/ask-rav", icon: "chatbubble-ellipses-outline" as const, show: askRavEnabled || canManageAskRavSetting },
    {
      label: "Rabbi Hub",
      href: "/(tabs)/rabbi-hub",
      icon: "library-outline" as const,
      show: profile?.role === "local_rabbi" || profile?.role === "global_admin"
    },
    {
      label: "Admin",
      href: "/(tabs)/admin",
      icon: "settings-outline" as const,
      show: profile?.role === "local_admin" || profile?.role === "local_rabbi" || profile?.role === "global_admin"
    },
    {
      label: "Global Admin",
      href: "/(tabs)/global-admin",
      icon: "globe-outline" as const,
      show: profile?.role === "global_admin"
    },
    { label: "Notifications", href: "/(tabs)/notifications", icon: "notifications-outline" as const, show: true },
    { label: "Profile", href: "/(tabs)/profile", icon: "person-outline" as const, show: true },
    { label: "Settings", href: "/(tabs)/settings", icon: "options-outline" as const, show: true }
  ].filter((item) => item.show);

  function navigateTo(href: (typeof drawerItems)[number]["href"]) {
    setMenuOpen(false);
    router.push(href as never);
  }

  function isActiveDrawerItem(href: (typeof drawerItems)[number]["href"]) {
    const normalizedHref = href.replace("/(tabs)", "");
    return pathname === href || pathname === normalizedHref;
  }

  return (
    <SafeAreaView style={globalStyles.screen} edges={["top"]}>
      <View style={[styles.headerShell, width >= 768 && styles.wideHeaderShell]}>
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
          {onRefresh ? (
            <Pressable
              accessibilityLabel="Refresh"
              accessibilityRole="button"
              disabled={refreshing}
              onPress={onRefresh}
              style={[styles.menuButton, refreshing && styles.disabledButton]}
            >
              <Ionicons name="refresh" color={refreshing ? theme.colors.muted : theme.colors.primary} size={22} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[globalStyles.content, width >= 768 && styles.wideContent]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
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
            {drawerItems.map((item) => {
              const active = isActiveDrawerItem(item.href);
              return (
                <Pressable key={item.href} onPress={() => navigateTo(item.href)} style={[styles.drawerItem, active && styles.drawerItemActive]}>
                  <Ionicons name={item.icon} color={active ? theme.colors.primary : theme.colors.muted} size={22} />
                  <Text style={[styles.drawerItemText, active && styles.drawerItemTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function CompactCard({ children }: { children: ReactNode }) {
  return <View style={styles.compactCard}>{children}</View>;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Pill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "primary" | "accent" | "success" | "danger";
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "primary" && styles.pillPrimary,
        tone === "accent" && styles.pillAccent,
        tone === "success" && styles.pillSuccess,
        tone === "danger" && styles.pillDanger
      ]}
    >
      <Text style={[styles.pillText, tone !== "neutral" && styles.pillStrongText]}>{label}</Text>
    </View>
  );
}

export function FilterChip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
    >
      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" color={theme.colors.muted} size={18} />
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        style={styles.searchInput}
        value={value}
      />
    </View>
  );
}

export function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default"
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric" | "url";
}) {
  return (
    <TextInput
      autoCapitalize="none"
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.muted}
      keyboardType={keyboardType}
      style={styles.formInput}
      value={value}
    />
  );
}

export function TextArea({
  value,
  onChangeText,
  placeholder
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      multiline
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.muted}
      style={styles.textArea}
      textAlignVertical="top"
      value={value}
    />
  );
}

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped}%` }]} />
    </View>
  );
}

export function MetaText({ children }: { children: ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

export function StatusBanner({
  message,
  tone = "info"
}: {
  message: string;
  tone?: "success" | "error" | "info";
}) {
  const lastAlertedMessage = useRef("");

  useEffect(() => {
    if (!message || tone !== "error" || lastAlertedMessage.current === message) return;
    lastAlertedMessage.current = message;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`Action Failed\n\n${message}`);
      return;
    }
    Alert.alert("Action Failed", message);
  }, [message, tone]);

  if (!message) return null;
  return (
    <View
      style={[
        styles.statusBanner,
        tone === "success" && styles.statusSuccess,
        tone === "error" && styles.statusError,
        tone === "info" && styles.statusInfo
      ]}
    >
      <Text
        style={[
          styles.statusText,
          tone === "success" && styles.statusSuccessText,
          tone === "error" && styles.statusErrorText,
          tone === "info" && styles.statusInfoText
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

export function Button({
  label,
  variant = "primary",
  onPress,
  disabled = false
}: {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        variant === "ghost" && styles.ghostButton,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.secondaryButtonText,
          variant === "ghost" && styles.ghostButtonText
        ]}
      >
        {label}
      </Text>
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
  wideContent: {
    alignSelf: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  headerShell: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    width: "100%",
    zIndex: 10
  },
  wideHeaderShell: {
    alignSelf: "center",
    paddingHorizontal: theme.spacing.lg
  },
  screenHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
    maxWidth: 1040,
    width: "100%"
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
  disabledButton: {
    opacity: 0.55
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
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 50,
    paddingHorizontal: theme.spacing.md
  },
  drawerItemActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.border
  },
  drawerItemText: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "700"
  },
  drawerItemTextActive: {
    color: theme.colors.primary
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6
  },
  compactCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5
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
    backgroundColor: theme.colors.accentSoft
  },
  pillSuccess: {
    backgroundColor: theme.colors.successSoft
  },
  pillDanger: {
    backgroundColor: theme.colors.dangerSoft
  },
  pillText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  pillStrongText: {
    color: theme.colors.ink
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  filterChipText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  filterChipTextSelected: {
    color: "#FFFFFF"
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md
  },
  searchInput: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 48
  },
  formInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: theme.spacing.md
  },
  textArea: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 132,
    padding: theme.spacing.md
  },
  progressTrack: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 999,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    height: "100%"
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  statusBanner: {
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  statusSuccess: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "#86EFAC"
  },
  statusError: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: "#FDA29B"
  },
  statusInfo: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: "#F2D37A"
  },
  statusText: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  statusSuccessText: {
    color: theme.colors.success
  },
  statusErrorText: {
    color: theme.colors.danger
  },
  statusInfoText: {
    color: theme.colors.primary
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
  ghostButton: {
    backgroundColor: "transparent",
    minHeight: 44
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  buttonDisabled: {
    opacity: 0.45
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
  ghostButtonText: {
    color: theme.colors.primary
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
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
  successText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: "800"
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "800"
  },
  statNumber: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: "900"
  }
});
