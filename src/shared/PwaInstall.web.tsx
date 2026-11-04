import { Ionicons } from "@expo/vector-icons";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { usePathname } from "expo-router";
import { useAuthState } from "../state/AuthState";
import { useAppState } from "../state/AppState";
import { claimInstallInvitation } from "./pwaRegistration.web";
import { installDevice, installDismissDays, installDismissKey, isHomeScreenApp } from "./pwaCapabilities";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface Window { __mySCPInstallPrompt?: InstallPrompt; __mySCPInstalled?: boolean; }
}
type InstallState = { installed: boolean; banner: boolean; busy: boolean; mobile: boolean; requestInstall: () => void; dismiss: () => void };
const InstallContext = createContext<InstallState | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const { profile, session, loading, passwordRecovery } = useAuthState();
  const { hydrated } = useAppState();
  const pathname = usePathname();
  const [installed, setInstalled] = useState(false);
  const [banner, setBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [invitationUser, setInvitationUser] = useState<string | null>(null);
  const [registrationRevision, setRegistrationRevision] = useState(0);
  const [device, setDevice] = useState<ReturnType<typeof installDevice>>("desktop");
  const prompt = useRef<InstallPrompt | undefined>(undefined);
  const pending = useRef(false);
  const dismissedThisSession = useRef(false);

  function dismiss() {
    dismissedThisSession.current = true;
    setBanner(false);
    try { localStorage.setItem(installDismissKey, String(Date.now() + installDismissDays * 86400000)); } catch { /* Private browsing can disable storage. */ }
  }

  useEffect(() => {
    const kind = installDevice(navigator);
    setDevice(kind);
    const displayMode = window.matchMedia("(display-mode: standalone)");
    function sync() {
      const active = !!window.__mySCPInstalled || isHomeScreenApp(navigator as Navigator & { standalone?: boolean }, window.matchMedia.bind(window));
      setInstalled(active);
      if (active) { setBanner(false); setInstructions(false); setInvitationUser(null); return; }
      prompt.current = window.__mySCPInstallPrompt;
      let dismissed = dismissedThisSession.current;
      try { dismissed = dismissed || Number(localStorage.getItem(installDismissKey)) > Date.now(); } catch { /* Use this session's state if storage is unavailable. */ }
      setBanner(kind !== "desktop" && !dismissed);
    }
    sync();
    window.addEventListener("myscp-install-ready", sync);
    window.addEventListener("appinstalled", sync);
    displayMode.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    if (!__DEV__ && window.isSecureContext && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
        .then(registration => registration.update()).catch(() => { /* Installation guidance still works without a service worker. */ });
    }
    return () => {
      window.removeEventListener("myscp-install-ready", sync);
      window.removeEventListener("appinstalled", sync);
      displayMode.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const changed = () => setRegistrationRevision(value => value + 1);
    window.addEventListener("myscp-registration-ready", changed);
    window.addEventListener("storage", changed);
    return () => { window.removeEventListener("myscp-registration-ready", changed); window.removeEventListener("storage", changed); };
  }, []);

  useEffect(() => { setInvitationUser(null); }, [profile?.id, pathname]);

  useEffect(() => {
    if (pathname !== "/dashboard" || loading || passwordRecovery || !hydrated || !profile || session?.user.id !== profile.id) return;
    if (claimInstallInvitation(profile.id) && !installed) setInvitationUser(profile.id);
  }, [pathname, loading, passwordRecovery, hydrated, profile?.id, session?.user.id, installed, registrationRevision]);
  const invitation = !!invitationUser && invitationUser === profile?.id && pathname === "/dashboard" && !installed && !passwordRecovery;

  function closeInvitation() { setInvitationUser(null); dismiss(); }

  function requestInstall() {
    if (installed || pending.current) return;
    const available = prompt.current;
    if (!available) { setInstructions(true); return; }
    pending.current = true;
    setBusy(true);
    prompt.current = undefined;
    window.__mySCPInstallPrompt = undefined;
    // prompt() must run directly inside the user's click handler.
    try {
      void available.prompt().then(() => available.userChoice).then(() => dismiss())
        .catch(() => setInstructions(true)).finally(() => { pending.current = false; setBusy(false); });
    } catch {
      pending.current = false;
      setBusy(false);
      setInstructions(true);
    }
  }

  useEffect(() => {
    if (!instructions && !invitation) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setInstructions(false); if (invitation) closeInvitation(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [instructions, invitation]);

  const steps = device === "ios" ? [
    "Open mySCP in Safari on your iPhone or iPad.",
    "Tap Share, then Add to Home Screen. You may need to scroll through the options.",
    "Leave Open as Web App on if shown, then tap Add. Open mySCP from its new Home Screen icon."
  ] : device === "android" ? [
    "Open mySCP in Chrome on your Android device.",
    "Open the three-dot browser menu, then tap Install app or Add to Home screen.",
    "Confirm, then open mySCP from its new icon."
  ] : [
    "Open mySCP in Chrome or Microsoft Edge.",
    "Use the install icon in the address bar, or the browser menu's Install option. On Safari for Mac, use File > Add to Dock if available.",
    "If the browser offers a desktop shortcut, select it. Some browsers also offer Create shortcut in their menu."
  ];
  return <InstallContext.Provider value={{ installed, banner, busy, mobile: device !== "desktop", requestInstall, dismiss }}>
    {children}
    <Modal visible={invitation} transparent animationType="fade" onRequestClose={closeInvitation}>
      <View style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss install invitation" style={StyleSheet.absoluteFill} onPress={closeInvitation} />
        <View style={s.dialog} accessibilityViewIsModal accessibilityLabel="Welcome install invitation">
          <View style={s.heading}><Image source={{ uri: "/icons/icon-192-v2.png" }} style={s.appIcon} /><Text style={s.title}>Keep mySCP Close</Text></View>
          <Text style={s.invitationCopy}>{device === "desktop" ? "Add mySCP to your computer for easy access to your learning and chaburah." : "Add mySCP to your Home Screen for easy access to your learning and chaburah."}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Install mySCP from welcome" style={s.primary} onPress={() => { setInvitationUser(null); requestInstall(); }}><Text style={s.primaryLabel}>Install mySCP</Text></Pressable>
          <Pressable accessibilityRole="button" style={s.notNow} onPress={closeInvitation}><Text style={s.menuLabel}>Not Now</Text></Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={instructions} transparent animationType="fade" onRequestClose={() => setInstructions(false)}>
      <View style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss installation instructions" style={StyleSheet.absoluteFill} onPress={() => setInstructions(false)} />
        <View style={s.dialog} accessibilityViewIsModal accessibilityLabel="Install mySCP instructions">
          <View style={s.heading}><Image source={{ uri: "/icons/icon-192-v2.png" }} style={s.appIcon} accessibilityLabel="mySCP app icon" /><Text style={s.title}>Install mySCP</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close installation instructions" onPress={() => setInstructions(false)} style={s.close}><Ionicons name="close" size={22} color="#42516B" /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            {steps.map((step, index) => <View key={step} style={s.step}><Text style={s.number}>{index + 1}</Text><Text style={s.body}>{step}</Text></View>)}
          </ScrollView>
          <Pressable accessibilityRole="button" style={s.primary} onPress={() => { setInstructions(false); dismiss(); }}><Text style={s.primaryLabel}>Got It</Text></Pressable>
        </View>
      </View>
    </Modal>
  </InstallContext.Provider>;
}

export function InstallButton({ onSelect, variant = "menu" }: { onSelect?: () => void; variant?: "menu" | "account" }) {
  const state = useContext(InstallContext);
  if (!state || state.installed) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Install mySCP" disabled={state.busy}
    onPress={() => { onSelect?.(); state.requestInstall(); }} style={({ pressed }) => [s.menuItem, variant === "account" && s.accountItem, pressed && { backgroundColor: "#EAF1FF" }]}>
    <Image source={{ uri: "/icons/icon-192-v2.png" }} style={s.appIcon} /><Text style={s.menuLabel}>{state.busy ? "Opening..." : "Install mySCP"}</Text>
  </Pressable>;
}

export function InstallHeaderButton() {
  const state = useContext(InstallContext);
  const { width } = useWindowDimensions();
  if (!state || state.installed || !state.mobile) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Install mySCP from header" {...{ title: "Install mySCP" }}
    disabled={state.busy} onPress={state.requestInstall} style={({ pressed }) => [s.headerButton, pressed && { backgroundColor: "#EAF1FF" }]}>
    <Image source={{ uri: "/icons/icon-192-v2.png" }} style={s.headerIcon} />
    {width >= 520 ? <Text style={s.menuLabel}>Install</Text> : <Ionicons name="download" size={12} color="#2563EB" style={s.installBadge} />}
  </Pressable>;
}

export function InstallBanner() {
  const state = useContext(InstallContext);
  if (!state?.banner || state.installed) return null;
  return <View style={s.banner} testID="pwa-install-banner">
    <Image source={{ uri: "/icons/icon-192-v2.png" }} style={s.appIcon} />
    <Text style={s.bannerTitle}>mySCP on your Home Screen</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Install mySCP from banner" disabled={state.busy} onPress={state.requestInstall} style={s.primary}>
      <Text style={s.primaryLabel}>{state.busy ? "Opening..." : "Install"}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss install suggestion" onPress={state.dismiss} style={s.close}>
      <Ionicons name="close" size={20} color="#42516B" />
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  headerButton: { minWidth: 44, height: 44, paddingHorizontal: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#C9DAFF", backgroundColor: "#F1F6FF", borderRadius: 8 },
  headerIcon: { width: 28, height: 28, borderRadius: 5 },
  installBadge: { position: "absolute", right: 1, bottom: 1, backgroundColor: "#FFFFFF", borderRadius: 3 },
  accountItem: { marginTop: 0, borderWidth: 0, borderRadius: 0, paddingHorizontal: 16, backgroundColor: "#FFFFFF" },
  notNow: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  invitationCopy: { fontSize: 14, lineHeight: 22, color: "#42516B", flexShrink: 1 },
  appIcon: { width: 32, height: 32, borderRadius: 6, flexShrink: 0 },
  banner: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#C9DAFF", backgroundColor: "#EFF5FF" },
  bannerTitle: { flex: 1, minWidth: 110, color: "#1E3E70", fontSize: 13, fontWeight: "600", lineHeight: 19 },
  primary: { paddingHorizontal: 16, paddingVertical: 11, minHeight: 44, borderRadius: 6, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  primaryLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  close: { width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 12, marginTop: 14, borderRadius: 8, backgroundColor: "#F1F6FF", borderWidth: 1, borderColor: "#D6E3FA" },
  menuLabel: { color: "#2456A1", fontSize: 13, fontWeight: "700", flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: "#17203366", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { backgroundColor: "#FFFFFF", borderRadius: 8, padding: 20, width: "100%", maxWidth: 440, maxHeight: "90%", gap: 20 },
  heading: { flexDirection: "row", gap: 10, alignItems: "center" },
  title: { flex: 1, fontSize: 19, fontWeight: "700", color: "#172033" },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  number: { fontSize: 14, lineHeight: 26, width: 26, textAlign: "center", color: "#2563EB", backgroundColor: "#EAF1FF", borderRadius: 6, fontWeight: "700" },
  body: { flex: 1, fontSize: 14, lineHeight: 22, color: "#42516B" }
});
