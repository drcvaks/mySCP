import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Href, Link } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const navigationItems = {
  dashboard: { icon: "speedometer", color: "#2563EB", tint: "#EAF1FF", group: "Learning" },
  chaburah: { icon: "people", color: "#087E8B", tint: "#E6F5F5", group: "Learning" },
  review: { icon: "checkmark-circle", color: "#22834A", tint: "#EAF7EE", group: "Learning" },
  files: { icon: "folder-open", color: "#AD7412", tint: "#FFF5DE", group: "Learning" },
  "rabbi-hub": { icon: "library", color: "#8F3E68", tint: "#F9ECF2", group: "Learning" },
  admin: { icon: "settings", color: "#546278", tint: "#EDF1F6", group: "Management" },
  "global-admin": { icon: "globe", color: "#087E8B", tint: "#E6F5F5", group: "Management" },
  "beta-feedback": { icon: "chatbubbles", color: "#8F3E68", tint: "#F9ECF2", group: "Support", badge: "Beta" },
  help: { icon: "help-circle", color: "#2563EB", tint: "#EAF1FF", group: "Support", badge: "Guide" },
  "testing-checklist": { icon: "checkbox", color: "#22834A", tint: "#EAF7EE", group: "Support", badge: "Tasks" },
  directory: { icon: "map", color: "#087E8B", tint: "#E6F5F5", group: "Community" },
  "ask-rav": { icon: "chatbox-ellipses", color: "#8F3E68", tint: "#F9ECF2", group: "Community" },
  profile: { icon: "person", color: "#2563EB", tint: "#EAF1FF", group: "Account" },
  notifications: { icon: "notifications", color: "#AD7412", tint: "#FFF5DE", group: "Account" },
  settings: { icon: "options", color: "#546278", tint: "#EDF1F6", group: "Account" }
} as const;

export type SidebarRoute = keyof typeof navigationItems;
export type SidebarItem = { name: SidebarRoute; label: string; href?: Href; onSelect: () => boolean | void };
export function isSidebarRoute(name: string): name is SidebarRoute { return name in navigationItems; }

export function SidebarNavigation({ items, selected, chaburah, width = 248 }: {
  items: SidebarItem[]; selected: string; chaburah?: string; width?: number;
}) {
  return <View style={[s.sidebar, { width }]}>
    <View style={s.brand}>
      <View style={s.brandIcon}><Ionicons name="book" size={23} color="#FFFFFF" /></View>
      <View style={s.brandText}><Text style={s.brandName}>mySCP</Text>
        {chaburah ? <Text style={s.chaburah} numberOfLines={2}>{chaburah}</Text> : null}
      </View>
    </View>
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {items.map((item, index) => {
        const group = navigationItems[item.name].group;
        return <View key={item.name}>
          {index === 0 || group !== navigationItems[items[index - 1].name].group
            ? <Text style={[s.group, index > 0 && s.laterGroup]}>{group}</Text> : null}
          <SidebarButton item={item} selected={selected === item.name} />
        </View>;
      })}
    </ScrollView>
  </View>;
}

function SidebarButton({ item, selected }: { item: SidebarItem; selected: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const visual = navigationItems[item.name];
  const badge = "badge" in visual ? visual.badge : undefined;
  const button = <Pressable accessibilityRole={item.href ? "link" : "button"}
    accessibilityLabel={item.label} accessibilityState={{ selected }}
    {...(Platform.OS === "web" ? { "aria-current": selected ? "page" : undefined } : {})}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
    onPress={(event) => { if (item.onSelect() === false) event.preventDefault(); }}
    style={StyleSheet.flatten([s.item, (hovered || pressed) && s.hovered, selected && s.selected, focused && s.focused])}>
    <View style={[s.iconTile, { backgroundColor: selected ? "#FFFFFF26" : visual.tint }]}>
      <Ionicons name={visual.icon} color={selected ? "#FFFFFF" : visual.color} size={21} />
    </View>
    <Text style={[s.label, selected && s.selectedLabel]}>{item.label}</Text>
    {badge ? <View style={[s.badge, selected && s.selectedBadge]}>
      <Text style={[s.badgeText, selected && s.selectedLabel]}>{badge}</Text>
    </View> : null}
  </Pressable>;
  return item.href ? <Link href={item.href} asChild>{button}</Link> : button;
}

const s = StyleSheet.create({
  sidebar: { height: "100%", flexShrink: 0, backgroundColor: "#FFFFFF", borderRightWidth: 1, borderRightColor: "#DEE6F0" },
  brand: { flexDirection: "row", alignItems: "center", gap: 11, padding: 18, borderBottomWidth: 1, borderBottomColor: "#EDF1F6" },
  brandIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  brandText: { flex: 1, minWidth: 0 },
  brandName: { color: "#172033", fontSize: 21, lineHeight: 27, fontWeight: "800", letterSpacing: 0 },
  chaburah: { color: "#68788F", fontSize: 11, lineHeight: 16, marginTop: 2 },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 10, paddingBottom: 20 },
  group: { fontSize: 10, fontWeight: "700", color: "#738198", lineHeight: 14, marginHorizontal: 10, marginTop: 14, marginBottom: 6 },
  laterGroup: { marginTop: 18 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46, paddingHorizontal: 9, paddingVertical: 6,
    borderRadius: 8, borderWidth: 2, borderColor: "#E8EDF4", backgroundColor: "#F8FAFC", marginBottom: 4 },
  hovered: { backgroundColor: "#F1F5FA" },
  selected: { backgroundColor: "#2874ED", borderColor: "#2874ED" },
  focused: { borderColor: "#133E8A" },
  iconTile: { width: 32, height: 32, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  label: { flex: 1, minWidth: 0, color: "#42516B", fontSize: 12, lineHeight: 17, fontWeight: "600", letterSpacing: 0 },
  selectedLabel: { color: "#FFFFFF", fontWeight: "700" },
  badge: { borderRadius: 5, backgroundColor: "#F2F5FA", paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 9, lineHeight: 13, color: "#66758D", fontWeight: "700" },
  selectedBadge: { backgroundColor: "#FFFFFF26" }
});
