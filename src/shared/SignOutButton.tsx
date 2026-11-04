import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text } from "react-native";
import { useAppState } from "../state/AppState";
import { useAuthState } from "../state/AuthState";
import { palette, radii } from "./theme";

export function SignOutButton({
  onSignedOut,
  variant = "menu"
}: {
  onSignedOut?: () => void;
  variant?: "drawer" | "menu";
}) {
  const router = useRouter();
  const { signOut } = useAuthState();
  const { hasUnsavedProgramEdits } = useAppState();
  const [signingOut, setSigningOut] = useState(false);
  const pending = useRef(false);

  async function confirmUnsavedSignOut() {
    if (!hasUnsavedProgramEdits) return true;
    const message = "Any unsaved work will be lost. Sign out?";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.confirm(message);
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Sign out?",
        message,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Sign Out", style: "destructive", onPress: () => resolve(true) }
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  }

  async function handlePress() {
    if (signingOut || pending.current) return;
    pending.current = true;
    try {
      if (!(await confirmUnsavedSignOut())) return;
      setSigningOut(true);
      await signOut();
      onSignedOut?.();
      router.replace("/auth");
    } catch {
      const message = "Unable to sign out. Please check your connection and try again.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(message);
      } else {
        Alert.alert("Sign out failed", message);
      }
    } finally {
      pending.current = false;
      setSigningOut(false);
    }
  }

  return (
    <Pressable
      accessibilityLabel="Sign Out"
      accessibilityRole="button"
      disabled={signingOut}
      onPress={() => void handlePress()}
      style={({ pressed }) => [
        s.button,
        variant === "drawer" ? s.drawerButton : s.menuButton,
        pressed && !signingOut ? s.pressed : null,
        signingOut ? s.disabled : null
      ]}
    >
      <Ionicons color={palette.danger} name="log-out-outline" size={17} />
      <Text style={s.label}>{signingOut ? "Signing out..." : "Sign Out"}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radii.md,
    flexDirection: "row",
    gap: 9,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  menuButton: { backgroundColor: palette.dangerSoft },
  drawerButton: {
    backgroundColor: palette.dangerSoft,
    borderColor: palette.dangerBorder,
    borderWidth: 1,
    justifyContent: "center"
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
  label: { color: palette.danger, fontSize: 13, fontWeight: "700" }
});
