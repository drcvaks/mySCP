import { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { isSidebarRoute, navigationItems } from "./SidebarNavigation";

export function PageHeading({ title, eyebrow, pathname, navigationButton, onRefresh, refreshing = false }: {
  title: string; eyebrow?: string; pathname: string; navigationButton?: ReactNode;
  onRefresh?: () => void | Promise<void>; refreshing?: boolean;
}) {
  const route = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  const visual = isSidebarRoute(route) ? navigationItems[route]
    : /shiur|source-sheets/.test(route) ? navigationItems["rabbi-hub"]
    : { icon: "book" as const, color: "#2563EB", tint: "#EAF1FF" };
  return <View style={s.header}>
    {navigationButton}
    <View style={[s.icon, { backgroundColor: visual.tint }]}>
      <Ionicons name={visual.icon} size={23} color={visual.color} />
    </View>
    <View style={s.titleBlock}>
      {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={s.title}>{title}</Text>
    </View>
    {onRefresh ? <Pressable accessibilityLabel="Refresh" accessibilityRole="button" disabled={refreshing}
      onPress={onRefresh} style={({ pressed }) => [s.refresh, pressed && { backgroundColor: "#EDF3FC" }, refreshing && { opacity: 0.5 }]}>
      <Ionicons name="refresh" size={20} color="#365C91" />
    </Pressable> : null}
  </View>;
}

const s = StyleSheet.create({
  header: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { color: "#67768B", fontSize: 11, fontWeight: "600", lineHeight: 16, letterSpacing: 0 },
  title: { color: "#172033", fontSize: 24, fontWeight: "700", lineHeight: 30, letterSpacing: 0 },
  refresh: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: "#E1E8F2",
    backgroundColor: "#F8FAFD", alignItems: "center", justifyContent: "center", flexShrink: 0 }
});
