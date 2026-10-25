import { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { isSidebarRoute, navigationItems } from "./SidebarNavigation";
import { usesCompactNavigation } from "./responsiveLayout";

export function PageHeading({ title, eyebrow, pathname, navigationButton, onRefresh, refreshing = false, accessory, stackAccessory = false, accountButton }: {
  title: string; eyebrow?: string; pathname: string; navigationButton?: ReactNode;
  onRefresh?: () => void | Promise<void>; refreshing?: boolean;
  accessory?: ReactNode; stackAccessory?: boolean;
  accountButton?: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const compact = usesCompactNavigation(width, height);
  const route = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  const visual = isSidebarRoute(route) ? navigationItems[route]
    : /shiur|source-sheets|beis-midrash/.test(route) ? navigationItems["rabbi-hub"]
    : { icon: "book" as const, color: "#2563EB", tint: "#EAF1FF" };
  return <View style={s.header}>
    <View style={[s.mainRow, compact && s.compactRow]}>
      {navigationButton}
      <View style={[s.icon, compact && s.compactIcon, { backgroundColor: visual.tint }]}>
        <Ionicons name={visual.icon} size={compact ? 20 : 23} color={visual.color} />
      </View>
      <View style={s.titleBlock}>
        {eyebrow ? <Text numberOfLines={compact ? 1 : undefined} style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[s.title, compact && s.compactTitle]}>{title}</Text>
      </View>
      {accessory && !stackAccessory ? <View style={s.accessory}>{accessory}</View> : null}
      {accountButton ? <View style={accessory && !stackAccessory ? [s.accountSpacing, compact && s.compactAccountSpacing] : undefined}>
        {accountButton}
      </View> : (onRefresh ? <Pressable accessibilityLabel="Refresh" accessibilityRole="button" disabled={refreshing}
        onPress={onRefresh} style={({ pressed }) => [s.refresh, pressed && { backgroundColor: "#EDF3FC" }, refreshing && { opacity: 0.5 }]}>
        <Ionicons name="refresh" size={20} color="#365C91" />
      </Pressable> : null)}
    </View>
    {accessory && stackAccessory ? <View style={s.stackedAccessory}>{accessory}</View> : null}
  </View>;
}

const s = StyleSheet.create({
  header: { width: "100%", gap: 8 },
  mainRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12 },
  compactRow: { gap: 8 },
  compactIcon: { width: 32, height: 36 },
  compactTitle: { fontSize: 21, lineHeight: 27 },
  accessory: { maxWidth: 420, minWidth: 0, flexShrink: 1 },
  accountSpacing: { marginLeft: 12, flexShrink: 0 },
  compactAccountSpacing: { marginLeft: 8 },
  stackedAccessory: { width: "100%", minWidth: 0 },
  icon: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { color: "#67768B", fontSize: 11, fontWeight: "600", lineHeight: 16, letterSpacing: 0 },
  title: { color: "#172033", fontSize: 24, fontWeight: "700", lineHeight: 30, letterSpacing: 0 },
  refresh: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: "#E1E8F2",
    backgroundColor: "#F8FAFD", alignItems: "center", justifyContent: "center", flexShrink: 0 }
});
