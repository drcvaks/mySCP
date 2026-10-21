import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Redirect, Tabs, useSegments } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SidebarItem, SidebarNavigation, SidebarRoute, isSidebarRoute, navigationItems } from "../../src/shared/SidebarNavigation";
import { chaburahToolAccess, isGlobalAdmin } from "../../src/shared/permissions";
import { Button } from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { navigationRailWidth, usesCompactNavigation, usesLandscapeRail } from "../../src/shared/responsiveLayout";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";

function tabIcon(name: SidebarRoute) {
  const visual = navigationItems[name];
  return ({ focused }: { color: string; size: number; focused: boolean }) => (
    <View style={[mobileTabStyles.icon, { backgroundColor: focused ? "#2563EB" : visual.tint }]}>
      <Ionicons name={visual.icon} color={focused ? "#FFFFFF" : visual.color} size={22} />
    </View>
  );
}

function betaSupportLabel(label: string, badge: string, leftRailNav: boolean, compactLeftRail: boolean) {
  if (!leftRailNav) return label;
  return ({ color }: { color: string }) => (
    <View style={{ alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "space-between", width: compactLeftRail ? 142 : 150 }}>
      <Text
        style={{
          color,
          flex: 1,
          fontSize: compactLeftRail ? 11 : 12,
          fontWeight: "700",
          lineHeight: compactLeftRail ? 14 : 15
        }}
        numberOfLines={1}
      >
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
  const { chaburos, error: dataError, hydrated, loading: dataLoading, memberships, refresh, selectedChaburahId } = useAppState();
  const segments = useSegments();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactPhoneNav = usesCompactNavigation(width, height);
  const landscapeRail = usesLandscapeRail(width, height);
  const railWidth = navigationRailWidth(width, height);
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

  const toolAccess = chaburahToolAccess(profile, memberships, selectedChaburahId);
  const showRabbiHub = toolAccess.rabbiHub;
  const showAdmin = toolAccess.admin;
  const currentRoute = segments[segments.length - 1];
  if ((currentRoute === "admin" && !showAdmin) ||
    (["rabbi-hub", "shiur-builder", "shiur-import-preview", "source-sheets-import-preview"].includes(currentRoute) && !showRabbiHub)) {
    return <Redirect href="/(tabs)/dashboard" />;
  }
  const showGlobalAdmin = isGlobalAdmin(profile);
  const showProfile = true;
  const showReviewInBottomTabs = !(compactPhoneNav && showRabbiHub);
  const selectedChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const askRavEnabled = selectedChaburah?.askRavEnabled ?? true;
  const showAskRav = askRavEnabled;
  const leftRailNav = !compactPhoneNav || landscapeRail;
  const compactLeftRail = leftRailNav && height < 760;
  const denseLeftRail = leftRailNav && height < 640;

  return (
    <Tabs
      tabBar={(props) => landscapeRail
        ? <SafeAreaView edges={["top", "bottom", "left"]} style={{ width: railWidth + insets.left, height: "100%", backgroundColor: "#FFFFFF" }}>
            <SidebarTabBar {...props} chaburah={selectedChaburah?.name} width={railWidth} iconsOnly />
          </SafeAreaView>
        : leftRailNav
          ? <SidebarTabBar {...props} chaburah={selectedChaburah?.name} width={railWidth} />
          : <MobileTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: leftRailNav ? undefined : "#EDF4FF",
        tabBarActiveTintColor: "#1D56BE",
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIconStyle: leftRailNav ? undefined : { width: 36, height: 32, marginBottom: 2, flexShrink: 0 },
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: leftRailNav
          ? {
              minHeight: denseLeftRail ? 34 : compactLeftRail ? 40 : 46,
              paddingVertical: denseLeftRail ? 0 : 2
            }
          : {
              borderRadius: 8,
              marginHorizontal: 3,
              marginVertical: 2,
              paddingVertical: 0,
              minWidth: 0
            },
        tabBarLabelStyle: {
          fontSize: denseLeftRail ? 10 : compactLeftRail ? 11 : 12,
          fontWeight: "700",
          lineHeight: denseLeftRail ? 13 : compactLeftRail ? 14 : 15
        },
        tabBarLabelPosition: leftRailNav ? "beside-icon" : "below-icon",
        tabBarPosition: leftRailNav ? "left" : "bottom",
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          borderRightColor: leftRailNav ? theme.colors.border : undefined,
          backgroundColor: "#FFFFFF",
          height: leftRailNav ? "100%" : 68 + Math.max(insets.bottom, 12),
          minHeight: leftRailNav ? undefined : 80,
          overflow: leftRailNav ? "scroll" : "visible",
          paddingBottom: leftRailNav ? 0 : Math.max(insets.bottom, 12),
          paddingTop: leftRailNav ? (denseLeftRail ? 2 : compactLeftRail ? 4 : 8) : 4,
          width: leftRailNav ? railWidth + (landscapeRail ? insets.left : 0) : undefined
        }
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: tabIcon("dashboard") }} />
      <Tabs.Screen name="chaburah" options={{ title: "My Chaburah", tabBarIcon: tabIcon("chaburah") }} />
      <Tabs.Screen name="review" options={{ title: "Review", tabBarIcon: tabIcon("review"), href: showReviewInBottomTabs ? undefined : null }} />
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
          tabBarLabel: betaSupportLabel("Beta Feedback", "Beta", leftRailNav, compactLeftRail),
          tabBarIcon: tabIcon("beta-feedback"),
          href: compactPhoneNav ? null : undefined
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: "Help / How to Use",
          tabBarLabel: betaSupportLabel("Help / How to Use", "Guide", leftRailNav, compactLeftRail),
          tabBarIcon: tabIcon("help"),
          href: compactPhoneNav ? null : undefined
        }}
      />
      <Tabs.Screen
        name="testing-checklist"
        options={{
          title: "Tester Checklist",
          tabBarLabel: betaSupportLabel("Tester Checklist", "Tasks", leftRailNav, compactLeftRail),
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
      <Tabs.Screen name="shiur-builder" options={{ title: "Shiur Builder", href: null }} />
      <Tabs.Screen name="shiur-import-preview" options={{ title: "Shiur Import Preview", href: null }} />
      <Tabs.Screen name="source-sheets-import-preview" options={{ title: "Source Sheets Import Preview", href: null }} />
      <Tabs.Screen name="shiur-packet" options={{ title: "Review Packet", href: null }} />
    </Tabs>
  );
}

const mobileTabStyles = StyleSheet.create({
  icon: { width: 36, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" }
});

function MobileTabBar(props: BottomTabBarProps) {
  const activeRoute = props.state.routes[props.state.index].name;
  const hubIndex = props.state.routes.findIndex((route) => route.name === "rabbi-hub");
  const builderActive = ["shiur-builder", "shiur-import-preview", "source-sheets-import-preview"].includes(activeRoute);
  const state = builderActive && hubIndex >= 0 ? { ...props.state, index: hubIndex } : props.state;
  return <BottomTabBar {...props} state={state} />;
}

function SidebarTabBar({ state, descriptors, navigation, chaburah, width, iconsOnly = false }: BottomTabBarProps & { chaburah?: string; width: number; iconsOnly?: boolean }) {
  const items: SidebarItem[] = state.routes.flatMap((route) => {
    const options = descriptors[route.key].options;
    if (!isSidebarRoute(route.name) || StyleSheet.flatten(options.tabBarItemStyle)?.display === "none") return [];
    return [{ name: route.name, label: options.title ?? route.name, href: `/${route.name}` as SidebarItem["href"],
      onSelect: () => !navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true }).defaultPrevented }];
  });
  const active = state.routes[state.index].name;
  const selected = ["shiur-builder", "shiur-import-preview", "source-sheets-import-preview"].includes(active) ? "rabbi-hub" : active;
  return <SidebarNavigation items={items} selected={selected} chaburah={chaburah} width={width} iconsOnly={iconsOnly} />;
}
