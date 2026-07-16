import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Platform, Text, useWindowDimensions, View } from "react-native";
import { isAdmin, isGlobalAdmin, isRabbi } from "../../src/shared/permissions";
import { Button } from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";

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
  notifications: "notifications-outline",
  "beta-feedback": "chatbubbles-outline",
  help: "help-circle-outline",
  "testing-checklist": "checkbox-outline",
  profile: "person-outline",
  settings: "options-outline"
} as const;

type TabName = keyof typeof iconMap;

function tabIcon(name: TabName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={iconMap[name]} color={color} size={size} />
  );
}

function betaSupportLabel(label: string, badge: string, leftRailNav: boolean) {
  if (!leftRailNav) return label;
  return ({ color }: { color: string }) => (
    <View style={{ alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "space-between", width: 150 }}>
      <Text style={{ color, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 15 }} numberOfLines={1}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: theme.colors.accentSoft,
          borderColor: "#F2D37A",
          borderRadius: 999,
          borderWidth: 1,
          paddingHorizontal: 7,
          paddingVertical: 2
        }}
      >
        <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: "900", lineHeight: 13 }}>{badge}</Text>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { loading, profile, session } = useAuthState();
  const { chaburos, error: dataError, hydrated, loading: dataLoading, refresh, selectedChaburahId } = useAppState();
  const { width } = useWindowDimensions();
  const compactPhoneNav = Platform.OS !== "web" && width < 768;
  if (loading || (session && !hydrated)) {
    return (
      <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }
  if (!session || !profile) return <Redirect href="/auth" />;
  if (dataError) {
    return (
      <View style={{ alignItems: "center", flex: 1, gap: 16, justifyContent: "center", padding: 24 }}>
        <Text style={{ color: theme.colors.danger, fontSize: 16, textAlign: "center" }}>{dataError}</Text>
        <View style={{ maxWidth: 480, width: "100%" }}>
          <Button label="Retry Loading Data" onPress={refresh} />
        </View>
      </View>
    );
  }

  const showRabbiHub = isRabbi(profile) || isGlobalAdmin(profile);
  const showAdmin = isAdmin(profile) || isRabbi(profile) || isGlobalAdmin(profile);
  const showGlobalAdmin = isGlobalAdmin(profile);
  const showProfile = true;
  const selectedChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const askRavEnabled = selectedChaburah?.askRavEnabled ?? true;
  const showAskRav = askRavEnabled || showAdmin;
  const leftRailNav = Platform.OS === "web" || width >= 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: leftRailNav ? undefined : theme.colors.primarySoft,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIconStyle: { marginTop: 2 },
        tabBarItemStyle: leftRailNav
          ? undefined
          : {
              borderRadius: 12,
              marginHorizontal: 4,
              marginVertical: 4
            },
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
      <Tabs.Screen
        name="rabbi-hub"
        options={{ title: "Rabbi Hub", tabBarIcon: tabIcon("rabbi-hub"), href: showRabbiHub ? undefined : null }}
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
        name="beta-feedback"
        options={{
          title: "Beta Feedback",
          tabBarLabel: betaSupportLabel("Beta Feedback", "Beta", leftRailNav),
          tabBarIcon: tabIcon("beta-feedback"),
          href: compactPhoneNav ? null : undefined
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: "Help / How to Use",
          tabBarLabel: betaSupportLabel("Help / How to Use", "Guide", leftRailNav),
          tabBarIcon: tabIcon("help"),
          href: compactPhoneNav ? null : undefined
        }}
      />
      <Tabs.Screen
        name="testing-checklist"
        options={{
          title: "Tester Checklist",
          tabBarLabel: betaSupportLabel("Tester Checklist", "Tasks", leftRailNav),
          tabBarIcon: tabIcon("testing-checklist"),
          href: compactPhoneNav ? null : undefined
        }}
      />
      <Tabs.Screen name="directory" options={{ title: "Directory", tabBarIcon: tabIcon("directory"), href: compactPhoneNav ? null : undefined }} />
      <Tabs.Screen
        name="ask-rav"
        options={{ title: "Ask Rav", tabBarIcon: tabIcon("ask-rav"), href: showAskRav && !compactPhoneNav ? undefined : null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: tabIcon("profile"), href: showProfile && !compactPhoneNav ? undefined : null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Notifications", tabBarIcon: tabIcon("notifications"), href: compactPhoneNav ? null : undefined }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon("settings"), href: compactPhoneNav ? null : undefined }} />
    </Tabs>
  );
}
