import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { currentUser } from "../../src/data/mockData";
import { isAdmin, isGlobalAdmin, isRabbi } from "../../src/shared/permissions";
import { theme } from "../../src/shared/theme";

const iconMap = {
  dashboard: "speedometer-outline",
  chaburah: "people-outline",
  files: "folder-open-outline",
  review: "checkmark-circle-outline",
  directory: "map-outline",
  "ask-rav": "chatbox-ellipses-outline",
  "rabbi-hub": "library-outline",
  admin: "settings-outline",
  "global-admin": "globe-outline",
  profile: "person-outline",
  settings: "options-outline"
} as const;

type TabName = keyof typeof iconMap;

function tabIcon(name: TabName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={iconMap[name]} color={color} size={size} />
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const compactPhoneNav = Platform.OS !== "web" && width < 768;
  const showRabbiHub = isRabbi(currentUser) || isGlobalAdmin(currentUser);
  const showAdmin = isAdmin(currentUser) || isRabbi(currentUser) || isGlobalAdmin(currentUser);
  const showGlobalAdmin = isGlobalAdmin(currentUser);
  const showProfile = currentUser.role === "participant";
  const leftRailNav = Platform.OS === "web" || width >= 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIconStyle: { marginTop: 2 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700", lineHeight: 15 },
        tabBarPosition: leftRailNav ? "left" : "bottom",
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          borderRightColor: leftRailNav ? theme.colors.border : undefined,
          minHeight: leftRailNav ? undefined : 72,
          paddingBottom: leftRailNav ? 0 : 10,
          paddingTop: 8,
          width: leftRailNav ? 220 : undefined
        }
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: tabIcon("dashboard") }} />
      <Tabs.Screen name="chaburah" options={{ title: "My Chaburah", tabBarIcon: tabIcon("chaburah") }} />
      <Tabs.Screen name="review" options={{ title: "Review", tabBarIcon: tabIcon("review") }} />
      <Tabs.Screen name="files" options={{ title: "Files", tabBarIcon: tabIcon("files") }} />
      <Tabs.Screen name="directory" options={{ title: "Directory", tabBarIcon: tabIcon("directory"), href: compactPhoneNav ? null : undefined }} />
      <Tabs.Screen
        name="ask-rav"
        options={{ title: "Ask Rav", tabBarIcon: tabIcon("ask-rav"), href: compactPhoneNav ? null : undefined }}
      />
      <Tabs.Screen
        name="rabbi-hub"
        options={{ title: "Rabbi Hub", tabBarIcon: tabIcon("rabbi-hub"), href: showRabbiHub && !compactPhoneNav ? undefined : null }}
      />
      <Tabs.Screen
        name="admin"
        options={{ title: "Admin", tabBarIcon: tabIcon("admin"), href: showAdmin && !compactPhoneNav ? undefined : null }}
      />
      <Tabs.Screen
        name="global-admin"
        options={{
          title: "Global Admin",
          tabBarIcon: tabIcon("global-admin"),
          href: showGlobalAdmin && !compactPhoneNav ? undefined : null
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("profile"), href: showProfile && !compactPhoneNav ? undefined : null }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon("settings"), href: compactPhoneNav ? null : undefined }} />
    </Tabs>
  );
}
