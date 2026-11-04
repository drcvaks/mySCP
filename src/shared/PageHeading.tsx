import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { styles } from "./components";
import { isSidebarRoute, navigationItems, SidebarRouteName } from "./SidebarNavigation";

export function PageHeading({
  accessory,
  accountButton,
  action,
  compact = false,
  eyebrow,
  navigationButton,
  pathname,
  routeName,
  stackAccessory = false,
  subtitle,
  title
}: {
  accessory?: ReactNode;
  accountButton?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  eyebrow?: string;
  navigationButton?: ReactNode;
  onRefresh?: () => void;
  pathname?: string;
  routeName?: string;
  stackAccessory?: boolean;
  subtitle?: string;
  title: string;
}) {
  const { width } = useWindowDimensions();
  const resolvedRoute = routeName ?? pathname?.replace(/^\/+/, "");
  const key: SidebarRouteName = resolvedRoute && isSidebarRoute(resolvedRoute) ? resolvedRoute : "dashboard";
  const visual = navigationItems[key];
  const rightAction = action ?? accountButton;

  return (
    <View style={[styles.header, s.header, compact && s.compactHeader]}>
      <View style={[s.topRow, compact && s.compactTopRow]}>
        <View style={[s.titleCluster, compact && s.compactTitleCluster]}>
          {navigationButton}
          {!(compact && width < 380) ? (
            <View
              style={[
                s.badge,
                compact && s.compactBadge,
                { backgroundColor: visual.tint }
              ]}
            >
              <Ionicons color={visual.color} name={visual.icon} size={compact ? 17 : 20} />
            </View>
          ) : null}
          <View style={s.copy}>
            {eyebrow ? (
              <Text
                ellipsizeMode="tail"
                numberOfLines={compact ? 1 : 2}
                style={[styles.eyebrow, compact && s.compactEyebrow]}
              >
                {eyebrow}
              </Text>
            ) : null}
            <Text accessibilityRole="header" style={[styles.title, compact && s.compactTitle]}>
              {title}
            </Text>
            {subtitle && !compact ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {accessory && !stackAccessory ? (
          <View style={[s.accessory, s.accessoryBesideTitle]}>{accessory}</View>
        ) : null}
        {rightAction ? <View style={s.action}>{rightAction}</View> : null}
      </View>
      {subtitle && compact ? (
        <Text numberOfLines={2} style={[styles.subtitle, s.compactSubtitle]}>
          {subtitle}
        </Text>
      ) : null}
      {accessory && stackAccessory ? <View style={s.stackedAccessory}>{accessory}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: { gap: 8 },
  compactHeader: { gap: 6 },
  topRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  compactTopRow: { alignItems: "center", gap: 8 },
  titleCluster: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12, minWidth: 0 },
  compactTitleCluster: { gap: 9 },
  badge: {
    alignItems: "center",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
    borderWidth: 1,
    borderColor: "rgba(6, 42, 114, 0.08)"
  },
  compactBadge: { borderRadius: 8, height: 32, width: 32 },
  copy: { flex: 1, gap: 1, minWidth: 0 },
  compactEyebrow: { fontSize: 10, letterSpacing: 0.4, lineHeight: 13 },
  compactTitle: { fontSize: 21, lineHeight: 26 },
  compactSubtitle: { fontSize: 12, lineHeight: 17 },
  accessory: { alignItems: "flex-end", justifyContent: "center", maxWidth: "100%" },
  accessoryBesideTitle: { flexShrink: 1, marginLeft: 12 },
  stackedAccessory: { width: "100%", paddingTop: 2 },
  action: { alignItems: "center", flexDirection: "row", flexShrink: 0 }
});
