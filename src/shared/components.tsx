import { cloneElement, ReactElement, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, ScrollViewProps, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles, theme } from "./theme";
import { useAuthState } from "../state/AuthState";
import { useAppState } from "../state/AppState";
import { PageHeading } from "./PageHeading";
import { canAccessBeisMidrash, chaburahToolAccess } from "./permissions";
import { SidebarItem, SidebarNavigation } from "./SidebarNavigation";
import { usesCompactNavigation, usesLandscapeMenu } from "./responsiveLayout";
import { AccountMenu, SignOutButton } from "./AccountMenu";
import { InstallBanner, InstallHeaderButton } from "./PwaInstall";

interface ScreenProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  onScroll?: ScrollViewProps["onScroll"];
  programSelector?: ReactElement<{ render?: (slots: { header: ReactNode; management: ReactNode }) => ReactNode }>;
  toolbar?: ReactNode;
}

export function Screen({ title, eyebrow, children, onRefresh, refreshing = false, scrollRef, onScroll, programSelector, toolbar }: ScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthState();
  const { chaburos, memberships, selectedChaburahId } = useAppState();
  const toolAccess = chaburahToolAccess(profile, memberships, selectedChaburahId);
  const { width, height } = useWindowDimensions();
  const showDrawerButton = usesCompactNavigation(width, height);
  const landscapePhone = usesLandscapeMenu(width, height);
  const insets = useSafeAreaInsets();
  const drawerWidth = Math.min(width - 24 - (landscapePhone ? insets.left : 0), 344);
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const askRavEnabled = selectedChaburah?.askRavEnabled ?? true;
  const drawerRoutes: { name: SidebarItem["name"]; label: string; show?: boolean }[] = [
    { name: "dashboard", label: "Dashboard", show: landscapePhone },
    { name: "chaburah", label: "My Chaburah", show: landscapePhone },
    { name: "review", label: "Review", show: landscapePhone || toolAccess.rabbiHub || canAccessBeisMidrash(profile, memberships) },
    { name: "files", label: "Files", show: landscapePhone },
    { name: "rabbi-hub", label: "Rabbi Hub", show: landscapePhone && (toolAccess.rabbiHub || canAccessBeisMidrash(profile, memberships)) },
    { name: "admin", label: "Admin", show: toolAccess.admin },
    { name: "global-admin", label: "Global Admin", show: profile?.role === "global_admin" },
    { name: "beta-feedback", label: "Beta Feedback" },
    { name: "help", label: "Help / How to Use" },
    { name: "testing-checklist", label: "Tester Checklist" },
    { name: "directory", label: "Directory" },
    { name: "ask-rav", label: "Ask Rav", show: askRavEnabled },
    { name: "profile", label: "Profile" },
    { name: "notifications", label: "Notifications" },
    { name: "settings", label: "Settings" }
  ];
  const drawerItems: SidebarItem[] = drawerRoutes.filter((item) => item.show !== false).map((item) => ({
    name: item.name, label: item.label, onSelect: () => navigateTo(item.name)
  }));
  const currentRoute = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  const selectedRoute = ["beis-midrash", "shiur-builder", "shiur-import-preview", "source-sheets-import-preview"].includes(currentRoute)
    ? "rabbi-hub" : currentRoute;

  function navigateTo(name: SidebarItem["name"]) {
    setMenuOpen(false);
    router.navigate(`/(tabs)/${name}` as never);
  }

  // One controller owns both slots, keeping switches and management saves in sync.
  const renderScreen = ({ header = null, management = null }: { header?: ReactNode; management?: ReactNode } = {}) => (
    <SafeAreaView style={globalStyles.screen} edges={landscapePhone ? ["top", "left", "right", "bottom"] : ["top"]}>
      <View style={[styles.headerShell, !showDrawerButton && styles.wideHeaderShell]}>
        <View style={[styles.screenHeader, !showDrawerButton && styles.wideHeaderContent]}>
          <PageHeading title={title} eyebrow={eyebrow} pathname={pathname}
            accountButton={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><InstallHeaderButton /><AccountMenu onRefresh={onRefresh} refreshing={refreshing} /></View>}
            accessory={header} stackAccessory={width < 1100 && !landscapePhone}
            navigationButton={showDrawerButton ? (
            <Pressable
              accessibilityLabel="Open navigation menu"
              accessibilityRole="button"
              onPress={() => setMenuOpen(true)}
              style={styles.menuButton}
            >
              <Ionicons name="menu" color={theme.colors.ink} size={28} />
            </Pressable>
          ) : null} />
        </View>
      </View>
      {toolbar ? <View style={styles.screenToolbar}>{toolbar}</View> : null}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[globalStyles.content, showDrawerButton && styles.phoneContent, !showDrawerButton && styles.wideContent]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.betaNotice}>
          <Ionicons name="flask-outline" color={theme.colors.primary} size={18} />
          <Text style={styles.betaNoticeText}>
            You are using a beta version of mySCP. Please report bugs or confusing parts in Beta Feedback.
          </Text>
        </View>
        <InstallBanner />
        {management}
        {children}
      </ScrollView>
      <Modal animationType="fade" transparent visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.drawerBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss navigation menu"
            style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <SafeAreaView edges={landscapePhone ? ["top", "bottom", "left"] : ["top", "bottom"]}
            style={[styles.drawerPanel, { width: drawerWidth + (landscapePhone ? insets.left : 0) }]}>
            <SidebarNavigation items={drawerItems} selected={selectedRoute} chaburah={selectedChaburah?.name}
              width={drawerWidth} onClose={() => setMenuOpen(false)} footer={<SignOutButton />} />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
  return programSelector ? cloneElement(programSelector, { render: renderScreen }) : renderScreen();
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
  keyboardType = "default",
  textDirection
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric" | "url";
  textDirection?: "ltr" | "rtl";
}) {
  return (
    <TextInput
      autoCapitalize="none"
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.muted}
      keyboardType={keyboardType}
      style={[styles.formInput, textDirection && { writingDirection: textDirection, textAlign: textDirection === "rtl" ? "right" : "left" }]}
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

export function SectionTitle({ children, icon }: { children: ReactNode; icon?: keyof typeof Ionicons.glyphMap }) {
  return icon ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}>
    <Ionicons name={icon} color="#3F6F9D" size={18} />
    <Text style={[styles.sectionTitle, { flexShrink: 1 }]}>{children}</Text>
  </View> : <Text style={styles.sectionTitle}>{children}</Text>;
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
  phoneContent: { padding: 12, gap: 12, paddingBottom: 24 },
  screenToolbar: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  headerShell: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 12,
    width: "100%",
    zIndex: 10
  },
  wideHeaderShell: {
    alignSelf: "center",
    paddingHorizontal: 0
  },
  screenHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
    maxWidth: 1040,
    paddingHorizontal: theme.spacing.md,
    width: "100%"
  },
  wideHeaderContent: { paddingHorizontal: theme.spacing.lg },
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
    flexShrink: 0,
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
    maxWidth: "100%"
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
    shadowOpacity: 0.025,
    shadowRadius: 3,
    ...Platform.select({ android: { elevation: 1, padding: 14 } })
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
    shadowOpacity: 0.02,
    shadowRadius: 3,
    ...Platform.select({ android: { elevation: 1, padding: 14 } })
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
    backgroundColor: "#2563EB",
    borderColor: "#2563EB"
  },
  filterChipText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "600"
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
    backgroundColor: "#2563EB",
    borderRadius: theme.radius.sm,
    alignSelf: "stretch",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10
  },
  secondaryButton: {
    backgroundColor: "#F0F4FA",
    borderWidth: 1,
    borderColor: "#DCE5F1"
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
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center"
  },
  betaNotice: {
    alignItems: "center",
    backgroundColor: "#FFFAED",
    borderColor: "#F1E3B4",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  betaNoticeText: {
    color: theme.colors.primary,
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18
  },
  secondaryButtonText: {
    color: theme.colors.primary
  },
  ghostButtonText: {
    color: theme.colors.primary
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23
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
