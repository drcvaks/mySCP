import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Pill, styles } from "./components";
import { navigationItems } from "./SidebarNavigation";

export function WorkflowCard({ active = false, count, countLabel, label, meta, onPress, equalWidth = false, navigationLabel }: {
  active?: boolean; count?: number; label: string; meta: string; onPress: () => void;
  countLabel?: string; equalWidth?: boolean; navigationLabel?: string;
}) {
  const visual = label === "Ask Rav Inbox" || label === "Beis Midrash" ? navigationItems["ask-rav"]
    : label === "Shiur Builder" ? navigationItems["rabbi-hub"] : navigationItems.review;
  return <View style={[s.card, equalWidth && s.equalWidth, active && s.active]}>
    <View style={s.top}>
      <View style={[s.icon, { backgroundColor: visual.tint }]}><Ionicons name={visual.icon} color={visual.color} size={20} /></View>
      {count !== undefined ? <Pill label={`${count}${countLabel ? ` ${countLabel}` : ""}`} tone={count > 0 ? "accent" : "neutral"} /> : null}
    </View>
    <View style={s.copy}><Text style={s.title}>{label}</Text><Text style={s.meta}>{meta}</Text></View>
    {navigationLabel ? <Pressable accessibilityRole="tab" accessibilityLabel={navigationLabel} accessibilityState={{ selected: active }} aria-selected={active}
      onPress={onPress} style={({ pressed }) => [styles.button, !active && styles.secondaryButton, pressed && styles.buttonPressed]}>
      <Text style={[styles.buttonText, !active && styles.secondaryButtonText]}>{active ? "Selected" : "Open"}</Text>
    </Pressable> : <Button label={active ? "Selected" : "Open"} onPress={onPress} variant={active ? "primary" : "secondary"} />}
  </View>;
}

const s = StyleSheet.create({
  card: { flexBasis: 240, flexGrow: 1, minWidth: 0, padding: 14, gap: 10, borderWidth: 1, borderColor: "#E1E8F2",
    borderRadius: 8, backgroundColor: "#FFFFFF" },
  active: { borderColor: "#2874ED", backgroundColor: "#F3F7FF" },
  equalWidth: { flexBasis: 0, flexGrow: 1, flexShrink: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  icon: { width: 32, height: 32, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "700", lineHeight: 21, color: "#172033", letterSpacing: 0 },
  meta: { fontSize: 13, lineHeight: 19, color: "#65748B" }
});
