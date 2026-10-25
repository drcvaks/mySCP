import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BmArea, bmAreas } from "./beisMidrash";
import { BmActionButton } from "./BmActionButton";

export function BmAreaPicker({ value, onChange, includeAll = true }: {
  value: BmArea | "all"; onChange: (area: BmArea | "all") => void; includeAll?: boolean;
}) {
  const { width } = useWindowDimensions();
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: "row", gap: 10 }}>
      <AreaButton area="message" icon="chatbubbles" color="#2563EB" tint="#EDF3FF" selected={value === "message"}
        stacked={width < 600} onPress={() => onChange("message")} />
      <AreaButton area="resources" icon="folder-open" color="#157B80" tint="#EAF7F6" selected={value === "resources"}
        stacked={width < 600} onPress={() => onChange("resources")} />
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <BmActionButton label={bmAreas.teaching.label} caption={bmAreas.teaching.label} icon="school" selected={value === "teaching"} tone="amber"
        description="Ideas for teaching, leading a chaburah, and general SCP discussion." onPress={() => onChange("teaching")} />
      {includeAll ? <BmActionButton label="All Areas" caption="All Areas" icon="grid" selected={value === "all"}
        description="Show discussions from Message Board, Resources & Materials, and Teaching & Chaburah." onPress={() => onChange("all")} /> : null}
    </View>
  </View>;
}

function AreaButton({ area, icon, color, tint, selected, stacked, onPress }: {
  area: "message" | "resources"; icon: keyof typeof Ionicons.glyphMap; color: string; tint: string;
  selected: boolean; stacked: boolean; onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={bmAreas[area].label} aria-pressed={selected}
    accessibilityHint={area === "message" ? "Discuss official Notes, official Questions, and other learning questions." : "Share and find files, links, and learning material for Rabbonim."}
    onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [s.area, { height: stacked ? 110 : 82, flexDirection: stacked ? "column" : "row", backgroundColor: selected ? color : tint,
      borderColor: selected || hovered || focused || pressed ? color : "#D8E3EF" }]}>
    <View style={[s.picture, { backgroundColor: selected ? "#FFFFFF26" : "#FFFFFF" }]}>
      <Ionicons name={icon} size={29} color={selected ? "#FFFFFF" : color} />
    </View>
    <Text style={[s.label, { color: selected ? "#FFFFFF" : "#172033", flex: stacked ? undefined : 1 }]}>{bmAreas[area].label}</Text>
  </Pressable>;
}
const s = StyleSheet.create({
  area: { flex: 1, minWidth: 0, borderWidth: 2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 8, alignItems: "center", justifyContent: "center" },
  picture: { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center", flexShrink: 1 }
});
