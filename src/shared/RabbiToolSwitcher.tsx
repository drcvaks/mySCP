import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { navigationItems } from "./SidebarNavigation";
import { availableContentWidth } from "./responsiveLayout";

export type RabbiTool = "ask-rav" | "shiur-builder" | "quick-review" | "beis-midrash";

export function RabbiToolSwitcher({ active, askRavEnabled, onSelect, beisMidrashEnabled = false, localTools = true }: {
  active: RabbiTool; askRavEnabled: boolean; onSelect: (tool: RabbiTool) => void;
  beisMidrashEnabled?: boolean; localTools?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const narrow = availableContentWidth(width, height) < 500;
  const tools = [
    { key: "ask-rav" as const, label: "Ask Rav", name: "Ask Rav Inbox", visual: navigationItems["ask-rav"] },
    { key: "shiur-builder" as const, label: "Shiur Builder", name: "Shiur Builder", visual: navigationItems["rabbi-hub"] },
    { key: "quick-review" as const, label: "Questions", name: "Quick Review Questions", visual: navigationItems.review },
    { key: "beis-midrash" as const, label: "Beis Midrash", name: "Beis Midrash", visual: navigationItems["ask-rav"] }
  ];
  const buttons = tools.filter(tool => tool.key === "beis-midrash" ? beisMidrashEnabled : localTools && (tool.key !== "ask-rav" || askRavEnabled)).map(tool => <Pressable key={tool.key}
      accessibilityRole="tab" accessibilityLabel={tool.name} accessibilityState={{ selected: active === tool.key }} aria-selected={active === tool.key}
      onPress={() => { if (active !== tool.key) onSelect(tool.key); }}
      style={({ pressed }) => [s.tool, narrow && s.narrowTool, pressed && s.pressed, active === tool.key && s.active]}>
      <Ionicons name={tool.visual.icon} size={18} color={active === tool.key ? "#FFFFFF" : tool.visual.color} />
      <Text style={[s.label, narrow && s.narrowLabel, active === tool.key && s.activeLabel]}>{tool.label}</Text>
    </Pressable>);
  return <View style={s.switcher} accessibilityRole="tablist" accessibilityLabel="Rabbi tools">{buttons}</View>;
}

const s = StyleSheet.create({
  switcher: { flexDirection: "row", gap: 6, width: "100%", maxWidth: 1000, alignSelf: "center" },
  tool: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 6, paddingVertical: 6, gap: 5,
    flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DCE5F1",
    borderRadius: 8, backgroundColor: "#F4F7FC" },
  pressed: { backgroundColor: "#E5EDFA" },
  active: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  label: { color: "#344761", fontSize: 12, fontWeight: "700", lineHeight: 17, textAlign: "center", flexShrink: 1 },
  activeLabel: { color: "#FFFFFF" },
  narrowTool: { flexDirection: "column", minHeight: 64, paddingHorizontal: 3, gap: 3 },
  narrowLabel: { fontSize: 11, lineHeight: 14, minHeight: 28 }
});
