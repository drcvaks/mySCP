import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
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
  profile: "person-outline"
} as const;

type TabName = keyof typeof iconMap;

function tabIcon(name: TabName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={iconMap[name]} color={color} size={size} />
  );
}

export default function TabLayout() {
  const showRabbiHub = isRabbi(currentUser) || isGlobalAdmin(currentUser);
  const showAdmin = isAdmin(currentUser) || isRabbi(currentUser) || isGlobalAdmin(currentUser);
  const showGlobalAdmin = isGlobalAdmin(currentUser);
  const showProfile = currentUser.role === "participant";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          minHeight: 64,
          paddingTop: 8,
          paddingBottom: 8
        }
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: tabIcon("dashboard") }} />
      <Tabs.Screen name="chaburah" options={{ title: "My Chaburah", tabBarIcon: tabIcon("chaburah") }} />
      <Tabs.Screen name="files" options={{ title: "Files", tabBarIcon: tabIcon("files") }} />
      <Tabs.Screen name="review" options={{ title: "Review", tabBarIcon: tabIcon("review") }} />
      <Tabs.Screen name="directory" options={{ title: "Directory", tabBarIcon: tabIcon("directory") }} />
      <Tabs.Screen name="ask-rav" options={{ title: "Ask Rav", tabBarIcon: tabIcon("ask-rav") }} />
      <Tabs.Screen
        name="rabbi-hub"
        options={{ title: "Rabbi Hub", tabBarIcon: tabIcon("rabbi-hub"), href: showRabbiHub ? undefined : null }}
      />
      <Tabs.Screen
        name="admin"
        options={{ title: "Admin", tabBarIcon: tabIcon("admin"), href: showAdmin ? undefined : null }}
      />
      <Tabs.Screen
        name="global-admin"
        options={{
          title: "Global",
          tabBarIcon: tabIcon("global-admin"),
          href: showGlobalAdmin ? undefined : null
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("profile"), href: showProfile ? undefined : null }}
      />
    </Tabs>
  );
}
