import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import {
  cloneElement,
  isValidElement,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  RefObject,
  useEffect,
  useRef,
  useState
} from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../state/AppState";
import { useAuthState } from "../state/AuthState";
import { AccountMenu } from "./AccountMenu";
import { PageHeading } from "./PageHeading";
import { canAccessBeisMidrash, chaburahToolAccess } from "./permissions";
import { ProgramControlSlots } from "./ProgramSelector";
import { InstallBanner, InstallHeaderButton } from "./PwaInstall";
import { usesCompactNavigation, usesLandscapeMenu } from "./responsiveLayout";
import { isSidebarRoute, SidebarNavigation } from "./SidebarNavigation";
import { SignOutButton } from "./SignOutButton";
import { globalStyles, theme } from "./theme";

export {
  Avatar,
  Banner,
  EmptyState,
  IconTile,
  Inline,
  MenuItem,
  OverflowMenu,
  ProgressBar,
  SegmentedTabs,
  SkeletonList,
  StatTile
} from "./ui";

type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

type ProgramSelectorElement = ReactElement<{
  disabled?: boolean;
  render?: (slots: ProgramControlSlots) => ReactNode;
}>;

export function Screen({
  title,
  subtitle,
  eyebrow,
  action,
  headerAccessory,
  toolbar,
  onRefresh,
  refreshing = false,
  scrollRef,
  onScroll,
  programSelector,
  children
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  headerAccessory?: ReactNode;
  toolbar?: ReactNode;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  scrollRef?: RefObject<ScrollView | null>;
  onScroll?: ScrollViewProps["onScroll"];
  programSelector?: ProgramSelectorElement;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthState();
  const { chaburos, memberships, selectedChaburahId } = useAppState();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = usesCompactNavigation(width, height);
  const landscapePhone = usesLandscapeMenu(width, height);
  const [menuOpen, setMenuOpen] = useState(false);

  const rawRoute = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  const currentRoute = [
    "shiur-builder",
    "shiur-import-preview",
    "source-sheets-import-preview",
    "beis-midrash"
  ].includes(rawRoute)
    ? "rabbi-hub"
    : isSidebarRoute(rawRoute)
      ? rawRoute
      : "dashboard";

  const activeChaburahId = selectedChaburahId ?? profile?.chaburahId;
  const activeChaburah = chaburos.find((item) => item.id === activeChaburahId)?.name ?? null;
  const toolAccess = chaburahToolAccess(profile, memberships, selectedChaburahId);
  const askRavEnabled = chaburos.find(item => item.id === selectedChaburahId)?.askRavEnabled ?? true;
  const beisMidrashAllowed = canAccessBeisMidrash(profile, memberships);
  const isGlobalAdmin = profile?.role === "global_admin";

  const drawerItems = [
    { name: "dashboard" as const, label: "Dashboard", show: landscapePhone },
    { name: "chaburah" as const, label: "My Chaburah", show: landscapePhone },
    { name: "review" as const, label: "Review", show: landscapePhone || toolAccess.rabbiHub || beisMidrashAllowed },
    { name: "files" as const, label: "Files", show: landscapePhone },
    { name: "rabbi-hub" as const, label: "Rabbi Hub", show: landscapePhone && (toolAccess.rabbiHub || beisMidrashAllowed) },
    { name: "admin" as const, label: "Admin", show: toolAccess.admin },
    { name: "global-admin" as const, label: "Global Admin", show: isGlobalAdmin },
    { name: "beta-feedback" as const, label: "Beta Feedback", show: true },
    { name: "help" as const, label: "Help / How to Use", show: true },
    { name: "testing-checklist" as const, label: "Tester Checklist", show: true },
    { name: "directory" as const, label: "Directory", show: true },
    { name: "ask-rav" as const, label: "Ask Rav", show: askRavEnabled },
    { name: "profile" as const, label: "Profile", show: true },
    { name: "notifications" as const, label: "Notifications", show: true },
    { name: "settings" as const, label: "Settings", show: true }
  ]
    .filter((item) => item.show)
    .map((item) => ({
      key: item.name,
      name: item.name,
      label: item.label,
      onSelect: () => {
        setMenuOpen(false);
        router.navigate(`/(tabs)/${item.name}` as never);
      }
    }));

  const menuButton = compact ? (
    <Pressable
      accessibilityLabel="Open navigation menu"
      accessibilityRole="button"
      onPress={() => setMenuOpen(true)}
      style={localStyles.menuButton}
    >
      <Ionicons color={theme.colors?.brand ?? "#062A72"} name="menu" size={20} />
    </Pressable>
  ) : undefined;

  const accountAction = (
    <View style={localStyles.headerActions}>
      {action}
      <InstallHeaderButton />
      <AccountMenu onRefresh={onRefresh} refreshing={refreshing} />
    </View>
  );

  function renderFrame(slots?: ProgramControlSlots) {
    const accessory = slots?.header ?? headerAccessory;
    const stackAccessory = Boolean(accessory) && !landscapePhone && width < 1100;
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={[
          globalStyles.screen,
          compact && {
            paddingLeft: Math.max(insets.left, 0),
            paddingRight: Math.max(insets.right, 0)
          }
        ]}
      >
        <View style={[localStyles.headerShell, compact && localStyles.compactHeaderShell]}>
          <View style={[localStyles.headerInner, compact && localStyles.compactHeaderInner]}>
            <PageHeading
              accessory={accessory}
              action={accountAction}
              compact={compact}
              eyebrow={eyebrow}
              navigationButton={menuButton}
              routeName={currentRoute}
              stackAccessory={stackAccessory}
              subtitle={subtitle}
              title={title}
            />
          </View>
        </View>

        {toolbar ? <View style={localStyles.screenToolbar}>{toolbar}</View> : null}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[globalStyles.content, compact && globalStyles.compactContent]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <InstallBanner />
          {slots?.management}
          {children}
        </ScrollView>

        {compact ? (
          <Modal
            animationType="fade"
            onRequestClose={() => setMenuOpen(false)}
            transparent
            visible={menuOpen}
          >
            <View style={localStyles.drawerOverlay}>
              <Pressable
                accessibilityLabel="Dismiss navigation menu"
                onPress={() => setMenuOpen(false)}
                style={StyleSheet.absoluteFill}
              />
              <SafeAreaView
                edges={["top", "bottom", "left"]}
                style={{
                  backgroundColor: theme.colors?.surface ?? "#FFFFFF",
                  height: "100%",
                  maxWidth: "86%"
                }}
              >
                <SidebarNavigation
                  chaburah={activeChaburah}
                  compact
                  footer={<SignOutButton onSignedOut={() => setMenuOpen(false)} variant="drawer" />}
                  items={drawerItems}
                  onClose={() => setMenuOpen(false)}
                  selected={rawRoute}
                  width={Math.min(288, Math.max(244, width - 56))}
                />
              </SafeAreaView>
            </View>
          </Modal>
        ) : null}
      </SafeAreaView>
    );
  }

  if (programSelector) {
    return cloneElement(programSelector, {
      disabled: programSelector.props.disabled,
      render: renderFrame
    });
  }

  return renderFrame();
}

export function Card({
  children,
  tone = "default",
  compact = false,
  style
}: PropsWithChildren<{
  tone?: "default" | "warm" | "accent" | "brand" | "hero" | "inverse" | "muted";
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View
      style={[
        globalStyles.card,
        compact && globalStyles.cardCompact,
        (tone === "warm" || tone === "accent") && globalStyles.cardWarm,
        tone === "brand" && globalStyles.cardBrand,
        (tone === "inverse" || tone === "hero") && globalStyles.cardInverse,
        tone === "muted" && { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
        style
      ]}
    >
      {children}
    </View>
  );
}

export function CompactCard({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[globalStyles.card, globalStyles.cardCompact, style]}>{children}</View>;
}

export function SectionTitle({
  children,
  icon,
  style
}: PropsWithChildren<{
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<TextStyle>;
}>) {
  if (icon) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Ionicons color={theme.colors.brand} name={icon} size={18} />
        <Text style={[globalStyles.sectionTitle, { flexShrink: 1 }, style]}>{children}</Text>
      </View>
    );
  }
  return <Text style={[globalStyles.sectionTitle, style]}>{children}</Text>;
}

export function BodyText({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[globalStyles.body, style]}>{children}</Text>;
}

export function MetaText({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[globalStyles.muted, style]}>{children}</Text>;
}

export function Pill({
  label,
  tone = "default",
  icon
}: {
  label: string;
  tone?: "default" | "primary" | "info" | "warn" | "accent" | "gold" | "success" | "danger" | "neutral";
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const normalizedTone =
    tone === "primary"
      ? "default"
      : tone === "accent"
        ? "gold"
        : tone;
  const toneStyles = {
    default: { bg: theme.colors.brandSoft, border: theme.colors.brandBorder, fg: theme.colors.brand },
    info: { bg: theme.colors.infoSoft, border: theme.colors.infoBorder, fg: theme.colors.info },
    warn: { bg: theme.colors.warningSoft, border: theme.colors.warningBorder, fg: theme.colors.warning },
    gold: { bg: theme.colors.accentSoft, border: theme.colors.accentBorder, fg: theme.colors.accentDeep },
    success: { bg: theme.colors.successSoft, border: theme.colors.successBorder, fg: theme.colors.success },
    danger: { bg: theme.colors.dangerSoft, border: theme.colors.dangerBorder, fg: theme.colors.danger },
    neutral: { bg: theme.colors.surfaceMuted, border: theme.colors.border, fg: theme.colors.inkSecondary }
  }[normalizedTone];

  return (
    <View
      style={[
        globalStyles.pill,
        { backgroundColor: toneStyles.bg, borderColor: toneStyles.border, flexDirection: "row", alignItems: "center", gap: 4 }
      ]}
    >
      {icon ? <Ionicons color={toneStyles.fg} name={icon} size={12} /> : null}
      <Text style={[globalStyles.pillText, { color: toneStyles.fg }]}>{label}</Text>
    </View>
  );
}

export function FilterChip({
  label,
  active,
  selected,
  disabled = false,
  onPress
}: {
  label: string;
  active?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const isSelected = Boolean(selected ?? active);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isSelected }}
      {...(Platform.OS === "web" ? { "aria-pressed": isSelected } : {})}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, focused }: PressState) => [
        globalStyles.chip,
        isSelected ? globalStyles.chipActive : null,
        pressed && !disabled ? { opacity: 0.86 } : null,
        focused ? theme.focusRing : null,
        disabled ? globalStyles.buttonDisabled : null
      ]}
    >
      <Text style={[globalStyles.chipText, isSelected ? globalStyles.chipTextActive : null]}>{label}</Text>
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
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.searchBox,
        focused ? { borderColor: theme.colors.brand, backgroundColor: "#FFFFFF" } : null
      ]}
    >
      <Ionicons color={theme.colors.inkMuted} name="search" size={18} />
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkSubtle}
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
  multiline,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType = "default",
  textDirection
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "url";
  textDirection?: "ltr" | "rtl";
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      accessibilityLabel={placeholder}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      multiline={multiline}
      onBlur={() => setFocused(false)}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.inkSubtle}
      secureTextEntry={secureTextEntry}
      style={[
        globalStyles.input,
        multiline ? globalStyles.inputMultiline : null,
        textDirection ? { writingDirection: textDirection, textAlign: textDirection === "rtl" ? "right" : "left" } : null,
        focused
          ? {
              borderColor: theme.colors.brand,
              backgroundColor: "#FFFFFF"
            }
          : null
      ]}
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
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      accessibilityLabel={placeholder}
      multiline
      onBlur={() => setFocused(false)}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.inkSubtle}
      style={[
        globalStyles.input,
        globalStyles.inputMultiline,
        focused ? { borderColor: theme.colors.brand, backgroundColor: "#FFFFFF" } : null
      ]}
      textAlignVertical="top"
      value={value}
    />
  );
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
  const icon = tone === "success" ? "checkmark-circle" : tone === "error" ? "alert-circle" : "information-circle";
  const color = tone === "success" ? theme.colors.success : tone === "error" ? theme.colors.danger : theme.colors.brand;
  const bg = tone === "success" ? theme.colors.successSoft : tone === "error" ? theme.colors.dangerSoft : theme.colors.brandSoft;
  const border = tone === "success" ? theme.colors.successBorder : tone === "error" ? theme.colors.dangerBorder : theme.colors.brandBorder;

  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={[styles.statusBanner, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons color={color} name={icon} size={18} style={{ marginTop: 1 }} />
      <Text style={[styles.statusText, { color }]}>{message}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  secondary,
  disabled = false,
  tone,
  variant,
  icon,
  compact = false,
  fullWidth = false,
  style
}: {
  label: string;
  onPress?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "ghost" | "gold" | "accent" | "danger";
  variant?: "primary" | "secondary" | "ghost" | "gold" | "accent" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const rawTone = variant ?? tone ?? (secondary ? "secondary" : "primary");
  const resolvedTone = rawTone === "accent" ? "gold" : rawTone;
  const iconColor =
    resolvedTone === "secondary" || resolvedTone === "gold"
      ? theme.colors.ink
      : resolvedTone === "ghost"
        ? theme.colors.brand
        : resolvedTone === "danger"
          ? theme.colors.danger
          : theme.colors.inkOnBrand;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, focused }: PressState) => [
        globalStyles.button,
        fullWidth ? { alignSelf: "stretch", width: "100%", minHeight: 42 } : null,
        compact ? { paddingVertical: 7, paddingHorizontal: 12, minHeight: 36 } : null,
        resolvedTone === "secondary" ? globalStyles.buttonSecondary : null,
        resolvedTone === "ghost" ? globalStyles.buttonGhost : null,
        resolvedTone === "gold" ? globalStyles.buttonGold : null,
        resolvedTone === "danger" ? globalStyles.buttonDanger : null,
        pressed && !disabled ? { opacity: 0.88 } : null,
        focused ? theme.focusRing : null,
        disabled ? globalStyles.buttonDisabled : null,
        style
      ]}
    >
      {icon ? <Ionicons color={iconColor} name={icon} size={15} /> : null}
      <Text
        style={[
          globalStyles.buttonText,
          resolvedTone === "secondary" ? globalStyles.buttonSecondaryText : null,
          resolvedTone === "ghost" ? globalStyles.buttonGhostText : null,
          resolvedTone === "gold" ? globalStyles.buttonGoldText : null,
          resolvedTone === "danger" ? globalStyles.buttonDangerText : null
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({
  children,
  spread = false,
  style
}: PropsWithChildren<{ spread?: boolean; style?: StyleProp<ViewStyle> }>) {
  const valid = Array.isArray(children)
    ? children.filter((child) => child !== null && child !== undefined && child !== false)
    : isValidElement(children)
      ? [children]
      : children;
  return <View style={[spread ? globalStyles.spreadRow : globalStyles.row, style]}>{valid}</View>;
}

export function Divider() {
  return <View style={globalStyles.divider} />;
}

export const styles = {
  ...globalStyles,
  titleBlock: { flex: 1, gap: 2 },
  compactCard: { ...globalStyles.card, ...globalStyles.cardCompact },
  pillPrimary: { backgroundColor: theme.colors.brandSoft },
  pillInfo: { backgroundColor: theme.colors.infoSoft },
  pillAccent: { backgroundColor: theme.colors.accentSoft },
  pillSuccess: { backgroundColor: theme.colors.successSoft },
  pillDanger: { backgroundColor: theme.colors.dangerSoft },
  pillStrongText: { color: theme.colors.ink },
  filterChip: globalStyles.chip,
  filterChipSelected: globalStyles.chipActive,
  filterChipText: globalStyles.chipText,
  filterChipTextSelected: globalStyles.chipTextActive,
  searchBox: {
    alignItems: "center" as const,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 13
  },
  searchInput: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 14,
    minHeight: 44
  },
  formInput: globalStyles.input,
  textArea: {
    ...globalStyles.input,
    ...globalStyles.inputMultiline
  },
  progressTrack: {
    backgroundColor: theme.colors.brandSoft,
    borderRadius: theme.radii.pill,
    height: 8,
    overflow: "hidden" as const
  },
  progressFill: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.pill,
    height: "100%" as const
  },
  meta: globalStyles.muted,
  statusBanner: {
    alignItems: "flex-start" as const,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
    lineHeight: 19
  },
  secondaryButton: globalStyles.buttonSecondary,
  ghostButton: globalStyles.buttonGhost,
  secondaryButtonText: globalStyles.buttonSecondaryText,
  ghostButtonText: globalStyles.buttonGhostText,
  successText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: "800" as const
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: "800" as const
  },
  statNumber: {
    color: theme.colors.brand,
    fontSize: 24,
    fontWeight: "900" as const
  },
  headerShell: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  screenHeader: {
    maxWidth: 1280,
    width: "100%" as const,
    alignSelf: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  wideHeaderContent: {
    paddingHorizontal: 22,
    paddingVertical: 13
  },
  wideContent: {
    paddingHorizontal: 22
  },
  betaNotice: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentBorder,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  betaNoticeText: {
    color: theme.colors.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
    flex: 1
  }
};

const localStyles = StyleSheet.create({
  headerShell: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  compactHeaderShell: {
    borderBottomColor: theme.colors.border
  },
  headerInner: {
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 13
  },
  compactHeaderInner: {
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  screenToolbar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center"
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(6, 42, 114, 0.36)",
    flexDirection: "row"
  },
  closeDrawerButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center"
  }
});
