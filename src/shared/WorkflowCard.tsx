import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Pill, styles } from "./components";
import { navigationItems } from "./SidebarNavigation";

export function WorkflowCard({ active = false, count, countLabel, label, meta, onPress, equalWidth = false, navigationLabel }: {
  active?: boolean; count?: number; label: string; meta: string; onPress: () => void;
  countLabel?: string; equalWidth?: boolean; navigationLabel?: string;
}) {
  const visual = label === "Beis Midrash" ? { icon: "people-circle" as const, color: "#062A72", tint: "#E6ECF8" }
    : label === "Ask Rav Inbox" ? navigationItems["ask-rav"]
    : label === "Shiur Builder" ? navigationItems["rabbi-hub"] : navigationItems.review;
  return <View style={[s.card, equalWidth && s.equalWidth, active && s.active]}>
    <View style={s.top}>
      <View style={[s.icon, { backgroundColor: visual.tint }]}><Ionicons name={visual.icon} color={visual.color} size={20} /></View>
      {count !== undefined ? <Pill label={`${count}${countLabel ? ` ${countLabel}` : ""}`} tone={count > 0 ? "accent" : "neutral"} /> : null}
    </View>
    <View style={s.copy}><Text style={s.title}>{label}</Text><Text style={s.meta}>{meta}</Text></View>
    {navigationLabel ? <Pressable accessibilityRole="tab" accessibilityLabel={navigationLabel} accessibilityState={{ selected: active }} aria-selected={active}
      onPress={onPress} style={({ pressed }) => [styles.button, !active && styles.secondaryButton, pressed && { opacity: 0.85 }]}>
      <Text style={[styles.buttonText, !active && styles.secondaryButtonText]}>{active ? "Selected" : "Open"}</Text>
    </Pressable> : <Button label={active ? "Selected" : "Open"} onPress={onPress} variant={active ? "primary" : "secondary"} />}
  </View>;
}

const s = StyleSheet.create({
  card: { flexBasis: 240, flexGrow: 1, minWidth: 0, padding: 14, gap: 10, borderWidth: 1, borderColor: "#DDE4F0",
    borderRadius: 12, backgroundColor: "#FFFFFF" },
  active: { borderColor: "#062A72", borderWidth: 2, backgroundColor: "#F3F6FD" },
  equalWidth: { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  icon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "800", lineHeight: 21, color: "#0E1A3A", letterSpacing: 0 },
  meta: { fontSize: 13, lineHeight: 19, color: "#55657F" }
});
