import { useState } from "react";
import { Redirect } from "expo-router";
import { Text, useWindowDimensions, View } from "react-native";
import { SidebarItem, SidebarNavigation, SidebarRoute } from "../src/shared/SidebarNavigation";

const labels: [SidebarRoute, string][] = [
  ["dashboard", "Dashboard"], ["chaburah", "My Chaburah"], ["review", "Review"], ["files", "Files"],
  ["rabbi-hub", "Rabbi Hub"], ["admin", "Admin"], ["global-admin", "Global Admin"],
  ["beta-feedback", "Beta Feedback"], ["help", "Help / How to Use"], ["testing-checklist", "Tester Checklist"],
  ["directory", "Directory"], ["ask-rav", "Ask Rav"], ["profile", "Profile"], ["notifications", "Notifications"], ["settings", "Settings"]
];
export default function NavigationPreview() {
  const [selected, setSelected] = useState<SidebarRoute>("rabbi-hub");
  const { width } = useWindowDimensions();
  if (!__DEV__) return <Redirect href="/auth" />;
  const items: SidebarItem[] = labels.map(([name, label]) => ({ name, label, href: "/navigation-preview",
    onSelect: () => { setSelected(name); return false; } }));
  return <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#F8FAFC" }}>
    <SidebarNavigation items={items} selected={selected} chaburah="Vaks Test Chaburah" width={width < 1100 ? 224 : 248} />
    <View style={{ flex: 1, minWidth: 0, padding: 24 }}><Text style={{ fontSize: 28, color: "#172033", fontWeight: "800" }}>
      {labels.find(([name]) => name === selected)?.[1]}
    </Text></View>
  </View>;
}
