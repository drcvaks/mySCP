import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../state/AppState";
import { useAuthState } from "../state/AuthState";
import { InstallButton } from "./PwaInstall";
import { SignOutButton } from "./SignOutButton";
import { palette, radii, shadows } from "./theme";
import { getInitials } from "./ui";

export { SignOutButton };

const roleLabels: Record<string, string> = {
  global_admin: "Global Admin",
  local_admin: "Local Admin",
  local_rabbi: "Rabbi",
  participant: "Participant"
};

export function AccountMenu({
  onRefresh,
  refreshing = false
}: {
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
} = {}) {
  const router = useRouter();
  const { profile, session } = useAuthState();
  const { loading, refresh } = useAppState();
  const isRefreshing = refreshing || loading;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [refreshPending, setRefreshPending] = useState(false);
  const refreshLock = useRef(false);
  useEffect(() => { setOpen(false); }, [width, height]);

  const name = profile?.fullName?.trim() || "mySCP Member";
  const email = profile?.email || session?.user.email || "";
  const role = roleLabels[profile?.role ?? "participant"] ?? "Member";
  const initials = getInitials(name);
  const compact = width < 768 || height < 500;
  const menuWidth = Math.min(310, Math.max(248, width - 24));

  useEffect(() => {
    if (!open || Platform.OS !== "web" || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function refreshData() {
    if (isRefreshing || refreshLock.current) return;
    refreshLock.current = true;
    setRefreshPending(true);
    try {
      await (onRefresh ? onRefresh() : refresh());
      setOpen(false);
    } catch {
      const message = "Unable to refresh data. Please try again.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Refresh failed", message);
    } finally {
      refreshLock.current = false;
      setRefreshPending(false);
    }
  }
  if (!profile) return null;

  return (
    <>
      <Pressable
        accessibilityLabel="Open account menu"
        accessibilityRole="button"
        aria-expanded={open}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          s.trigger,
          compact && s.compactTrigger,
          pressed && s.pressed
        ]}
      >
        <View style={[s.avatar, compact && s.compactAvatar]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        {!compact ? (
          <>
            <View style={s.triggerTextWrap}>
              <Text numberOfLines={1} style={s.triggerName}>
                {name}
              </Text>
              <Text numberOfLines={1} style={s.triggerRole}>
                {role}
              </Text>
            </View>
            <Ionicons color={palette.inkMuted} name="chevron-down" size={14} />
          </>
        ) : null}
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={s.backdrop}>
          <Pressable
            accessibilityLabel="Dismiss account menu"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityLabel="Account menu"
            accessibilityViewIsModal
            style={[
              s.menu,
              {
                marginRight: Math.max(insets.right, 12),
                marginTop: Math.max(insets.top + (compact ? 50 : 58), 54),
                width: menuWidth,
                maxHeight: Math.max(120, height - Math.max(insets.top + (compact ? 50 : 58), 54) - insets.bottom - 12)
              }
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.identity}>
              <View style={s.largeAvatar}>
                <Text style={s.largeAvatarText}>{initials}</Text>
              </View>
              <View style={s.identityCopy}>
                <Text numberOfLines={1} style={s.name}>
                  {name}
                </Text>
                {email ? (
                  <Text numberOfLines={1} style={s.email}>
                    {email}
                  </Text>
                ) : null}
                <View style={s.rolePill}>
                  <Text style={s.roleText}>{role}</Text>
                </View>
              </View>
            </View>

            <Pressable
              accessibilityLabel="My Profile"
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
                router.push("/(tabs)/profile");
              }}
              style={({ pressed }) => [s.item, pressed && s.itemPressed]}
            >
              <Ionicons color={palette.brand} name="person-circle-outline" size={18} />
              <Text style={s.itemText}>My Profile</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Refresh Data"
              accessibilityRole="button"
              disabled={isRefreshing || refreshPending}
              onPress={() => { void refreshData(); }}
              style={({ pressed }) => [
                s.item,
                pressed && s.itemPressed,
                (isRefreshing || refreshPending) && s.disabled
              ]}
            >
              <Ionicons color={palette.inkSecondary} name="refresh-outline" size={18} />
              <Text style={s.itemText}>{isRefreshing || refreshPending ? "Refreshing..." : "Refresh Data"}</Text>
            </Pressable>

            <InstallButton variant="account" onSelect={() => setOpen(false)} />

            <View style={s.divider} />
            <SignOutButton onSignedOut={() => setOpen(false)} variant="menu" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    alignItems: "center",
    backgroundColor: palette.surfaceSubtle,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: 220,
    minHeight: 38,
    paddingLeft: 5,
    paddingRight: 11,
    paddingVertical: 4
  },
  compactTrigger: {
    justifyContent: "center",
    minWidth: 36,
    minHeight: 36,
    paddingLeft: 4,
    paddingRight: 4
  },
  pressed: { opacity: 0.88 },
  avatar: {
    alignItems: "center",
    backgroundColor: palette.brand,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
    borderWidth: 1.5,
    borderColor: palette.accent
  },
  compactAvatar: { height: 28, width: 28 },
  avatarText: { color: palette.inkOnBrand, fontSize: 11, fontWeight: "800" },
  triggerTextWrap: { flexShrink: 1 },
  triggerName: { color: palette.ink, fontSize: 12, fontWeight: "700", lineHeight: 15 },
  triggerRole: { color: palette.inkMuted, fontSize: 10, fontWeight: "600", lineHeight: 13 },
  backdrop: {
    alignItems: "flex-end",
    backgroundColor: "rgba(6, 42, 114, 0.22)",
    flex: 1,
    justifyContent: "flex-start"
  },
  menu: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
    padding: 12,
    ...shadows.lg
  },
  identity: {
    alignItems: "center",
    borderBottomColor: palette.borderSubtle,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
    paddingBottom: 10
  },
  largeAvatar: {
    alignItems: "center",
    backgroundColor: palette.brand,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: "center",
    width: 42,
    borderWidth: 2,
    borderColor: palette.accent
  },
  largeAvatarText: { color: palette.inkOnBrand, fontSize: 14, fontWeight: "800" },
  identityCopy: { flex: 1, gap: 2, minWidth: 0 },
  name: { color: palette.ink, fontSize: 14, fontWeight: "800" },
  email: { color: palette.inkMuted, fontSize: 12 },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentBorder,
    borderWidth: 1,
    borderRadius: radii.pill,
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  roleText: { color: palette.accentDeep, fontSize: 10, fontWeight: "800" },
  item: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  itemPressed: { backgroundColor: palette.surfaceMuted },
  itemText: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  divider: { backgroundColor: palette.borderSubtle, height: 1, marginVertical: 4 },
  disabled: { opacity: 0.5 }
});
