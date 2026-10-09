import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Button, Pill } from "./components";
import { navigationItems } from "./SidebarNavigation";

export function WorkflowCard({ active = false, count, label, meta, onPress }: {
  active?: boolean; count?: number; label: string; meta: string; onPress: () => void;
}) {
  const visual = label === "Ask Rav Inbox" ? navigationItems["ask-rav"]
    : label === "Shiur Builder" ? navigationItems["rabbi-hub"] : navigationItems.review;
  return <View style={[s.card, active && s.active]}>
    <View style={s.top}>
      <View style={[s.icon, { backgroundColor: visual.tint }]}><Ionicons name={visual.icon} color={visual.color} size={20} /></View>
      {count !== undefined ? <Pill label={`${count}`} tone={count > 0 ? "accent" : "neutral"} /> : null}
    </View>
    <View style={s.copy}><Text style={s.title}>{label}</Text><Text style={s.meta}>{meta}</Text></View>
    <Button label={active ? "Selected" : "Open"} onPress={onPress} variant={active ? "primary" : "secondary"} />
  </View>;
}

const s = StyleSheet.create({
  card: { flexBasis: 240, flexGrow: 1, minWidth: 0, padding: 14, gap: 10, borderWidth: 1, borderColor: "#E1E8F2",
    borderRadius: 8, backgroundColor: "#FFFFFF" },
  active: { borderColor: "#2874ED", backgroundColor: "#F3F7FF" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  icon: { width: 32, height: 32, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "700", lineHeight: 21, color: "#172033", letterSpacing: 0 },
  meta: { fontSize: 13, lineHeight: 19, color: "#65748B" }
});
