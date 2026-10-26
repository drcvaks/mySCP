import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthState } from "../state/AuthState";
import { useAppState } from "../state/AppState";
import { InstallButton } from "./PwaInstall";

function useSignOutAction() {
  const { signOut } = useAuthState();
  const { hasUnsavedProgramEdits } = useAppState();
  const [signingOut, setSigningOut] = useState(false);
  const pending = useRef(false);
  async function requestSignOut() {
    if (pending.current) return;
    pending.current = true;
    try {
      if (hasUnsavedProgramEdits) {
        const message = "Any unsaved work will be lost. Sign out?";
        const confirmed = Platform.OS === "web" ? window.confirm(message) : await new Promise<boolean>(resolve => {
          Alert.alert("Sign out?", message, [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Sign Out", style: "destructive", onPress: () => resolve(true) }
          ], { cancelable: true, onDismiss: () => resolve(false) });
        });
        if (!confirmed) return;
      }
      setSigningOut(true);
      await signOut();
    } catch {
      const message = "Unable to sign out. Please check your connection and try again.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Sign out failed", message);
    } finally {
      pending.current = false;
      setSigningOut(false);
    }
  }
  return { requestSignOut, signingOut };
}

export function SignOutButton() {
  const { requestSignOut, signingOut } = useSignOutAction();
  return <Pressable accessibilityRole="button" accessibilityLabel="Sign Out" disabled={signingOut}
    onPress={requestSignOut} style={({ pressed }) => [s.item, pressed && s.pressed]}>
    <Ionicons name="log-out-outline" size={21} color="#B42318" />
    <Text style={[s.itemLabel, s.danger]}>{signingOut ? "Signing out..." : "Sign Out"}</Text>
  </Pressable>;
}

export function AccountMenu({ onRefresh, refreshing = false }: {
  onRefresh?: () => void | Promise<void>; refreshing?: boolean;
}) {
  const { profile } = useAuthState();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const anchorRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [width, height]);
  useEffect(() => {
    if (!open || Platform.OS !== "web") return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);
  const [anchor, setAnchor] = useState({ right: 12, top: 64 });
  const [refreshPending, setRefreshPending] = useState(false);
  const refreshLock = useRef(false);
  const nameParts = profile?.fullName.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = nameParts.length ? (Array.from(nameParts[0])[0] + (nameParts.length > 1 ? Array.from(nameParts[nameParts.length - 1])[0] : "")).toLocaleUpperCase() : "";
  if (!profile) return null;

  function showMenu() {
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ right: Math.max(12, width - x - w), top: y + h + 8 });
      setOpen(true);
    });
  }
  async function refreshData() {
    if (!onRefresh || refreshing || refreshLock.current) return;
    refreshLock.current = true;
    setRefreshPending(true);
    try {
      await onRefresh();
      setOpen(false);
    } catch {
      if (Platform.OS === "web") window.alert("Unable to refresh data. Please try again.");
      else Alert.alert("Refresh failed", "Unable to refresh data. Please try again.");
    } finally { refreshLock.current = false; setRefreshPending(false); }
  }
  const top = Math.max(insets.top + 8, Math.min(anchor.top, height - insets.bottom - 180));
  return <>
    <View ref={anchorRef} collapsable={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open account menu" aria-expanded={open}
        {...(Platform.OS === "web" ? { title: "Account" } : {})}
        onPress={showMenu} style={({ pressed }) => [s.avatar, pressed && s.pressed]}>
        {initials ? <Text style={s.initials}>{initials}</Text> : <Ionicons name="person" size={21} color="#2563EB" />}
      </Pressable>
    </View>
    <Modal transparent visible={open} animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Dismiss account menu" onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal accessibilityLabel="Account menu" style={[s.menu, {
          top, right: Math.min(anchor.right, Math.max(12, width - 312)), width: Math.min(300, width - 24),
          maxHeight: Math.max(120, height - top - insets.bottom - 12)
        }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={s.identity}>
              <Text style={s.name}>{profile.fullName || "My Account"}</Text>
              <Text style={s.email}>{profile.email}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="My Profile" style={({ pressed }) => [s.item, pressed && s.pressed]}
              onPress={() => { setOpen(false); router.navigate("/(tabs)/profile"); }}>
              <Ionicons name="person-outline" size={21} color="#365C91" /><Text style={s.itemLabel}>My Profile</Text>
            </Pressable>
            {onRefresh ? <Pressable accessibilityRole="button" accessibilityLabel="Refresh Data" disabled={refreshing || refreshPending}
              onPress={refreshData} style={({ pressed }) => [s.item, pressed && s.pressed, (refreshing || refreshPending) && { opacity: 0.5 }]}>
              <Ionicons name="refresh-outline" size={21} color="#365C91" /><Text style={s.itemLabel}>{refreshing || refreshPending ? "Refreshing..." : "Refresh Data"}</Text>
            </Pressable> : null}
            <InstallButton variant="account" onSelect={() => setOpen(false)} />
            <View style={s.separator}><SignOutButton /></View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#C9D9F8", backgroundColor: "#EAF1FF" },
  initials: { fontSize: 15, fontWeight: "700", color: "#245FC4", letterSpacing: 0 },
  overlay: { flex: 1, backgroundColor: "#17203320" },
  menu: { position: "absolute", borderWidth: 1, borderColor: "#DEE6F0", borderRadius: 8, backgroundColor: "#FFFFFF", overflow: "hidden", elevation: 12,
    shadowColor: "#172033", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16 },
  identity: { padding: 16, gap: 4, borderBottomWidth: 1, borderColor: "#EDF1F6" },
  name: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: "#172033" },
  email: { fontSize: 12, lineHeight: 18, color: "#64748B", flexShrink: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 },
  itemLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#334155" },
  pressed: { backgroundColor: "#F1F5FA" },
  danger: { color: "#B42318" },
  separator: { borderTopWidth: 1, borderColor: "#EDF1F6", marginTop: 4 }
});
