import { Ionicons } from "@expo/vector-icons";
import { Href, Link } from "expo-router";
import { ReactNode, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MY_SCP_BADGE_LOGO_URI } from "../data/myScpBrandLogos";
import { InstallButton } from "./PwaInstall";
import { palette, radii } from "./theme";

export type NavigationGroup = "Learning" | "Management" | "Support" | "Community" | "Account";

export type NavigationItemDefinition = {
  group: NavigationGroup;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
  badge?: string;
};

export const navigationItems = {
  dashboard: { icon: "speedometer", color: "#062A72", tint: "#EAF0FB", group: "Learning" },
  chaburah: { icon: "people", color: "#087E8B", tint: "#E6F5F5", group: "Learning" },
  review: { icon: "checkmark-circle", color: "#127848", tint: "#E7F6EE", group: "Learning" },
  files: { icon: "folder-open", color: "#B45309", tint: "#FEF3C7", group: "Learning" },
  "rabbi-hub": { icon: "library", color: "#8F3E68", tint: "#F9ECF2", group: "Learning" },
  "beis-midrash": { icon: "flame", color: "#B45309", tint: "#FEF3C7", group: "Learning" },
  "shiur-builder": { icon: "construct", color: "#062A72", tint: "#EAF0FB", group: "Learning" },
  admin: { icon: "settings", color: "#42516B", tint: "#EDF1F6", group: "Management" },
  "global-admin": { icon: "globe", color: "#087E8B", tint: "#E6F5F5", group: "Management" },
  "beta-feedback": { icon: "chatbubbles", color: "#8F3E68", tint: "#F9ECF2", group: "Support", badge: "Beta" },
  help: { icon: "help-circle", color: "#062A72", tint: "#EAF0FB", group: "Support", badge: "Guide" },
  "testing-checklist": { icon: "checkbox", color: "#127848", tint: "#E7F6EE", group: "Support", badge: "Tasks" },
  directory: { icon: "map", color: "#087E8B", tint: "#E6F5F5", group: "Community" },
  "ask-rav": { icon: "chatbox-ellipses", color: "#8F3E68", tint: "#F9ECF2", group: "Community" },
  profile: { icon: "person", color: "#062A72", tint: "#EAF0FB", group: "Account" },
  notifications: { icon: "notifications", color: "#B45309", tint: "#FEF3C7", group: "Account" },
  settings: { icon: "options", color: "#42516B", tint: "#EDF1F6", group: "Account" }
} satisfies Record<string, NavigationItemDefinition>;

export type SidebarRouteName = keyof typeof navigationItems;
export type SidebarRoute = SidebarRouteName;

export type SidebarNavigationItem = {
  href?: Href | string;
  key?: string;
  label: string;
  name: SidebarRouteName;
  onSelect: () => boolean | void;
};
export type SidebarItem = SidebarNavigationItem;

export function isSidebarRoute(name: string): name is SidebarRouteName {
  return name in navigationItems;
}

export function SidebarNavigation({
  chaburah,
  compact = false,
  footer,
  headerAction,
  iconsOnly = false,
  items,
  onClose,
  selected,
  width = 244
}: {
  chaburah?: string | null;
  compact?: boolean;
  footer?: ReactNode;
  headerAction?: ReactNode;
  iconsOnly?: boolean;
  items: SidebarNavigationItem[];
  onClose?: () => void;
  selected?: string;
  width?: number;
}) {
  return (
    <View
      accessibilityLabel="Main navigation"
      style={[
        s.sidebar,
        compact && s.compactSidebar,
        { width, minWidth: width, maxWidth: width }
      ]}
    >
      <View style={[s.brand, iconsOnly && s.railBrand]}>
        <View style={s.brandTop}>
          <View style={s.brandIdentity}>
            <View style={s.brandMark}>
              <Image
                accessibilityLabel="mySCP"
                resizeMode="cover"
                source={{ uri: MY_SCP_BADGE_LOGO_URI }}
                style={s.brandLogoImg}
              />
            </View>
            {!iconsOnly ? (
              <View style={s.brandCopy}>
                <View style={s.brandWordmarkRow}>
                  <Text style={s.brandMy}>my</Text>
                  <Text style={s.brandTitle}>SCP</Text>
                </View>
                <Text numberOfLines={1} style={s.brandSubtitle}>
                  Semichas Chaver Program
                </Text>
              </View>
            ) : null}
          </View>
          {headerAction}
          {onClose ? (
            <Pressable
              accessibilityLabel="Close navigation menu"
              accessibilityRole="button"
              hitSlop={4}
              onPress={onClose}
              style={({ pressed }) => [s.close, pressed && s.hovered]}
            >
              <Ionicons color="#42516B" name="close" size={22} />
            </Pressable>
          ) : null}
        </View>
        {!iconsOnly && chaburah ? (
          <View style={s.chaburahBadge}>
            <Ionicons color={palette.brand} name="location" size={13} />
            <Text numberOfLines={1} style={s.chaburah}>
              {chaburah}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[s.content, iconsOnly && s.railContent]}
        showsVerticalScrollIndicator={true}
        style={s.scroll}
      >
        {items.map((item, index) => {
          const group = navigationItems[item.name]?.group ?? "Learning";
          const prevGroup = index > 0 ? navigationItems[items[index - 1].name]?.group : undefined;
          return (
            <View key={item.key ?? item.name}>
              {!iconsOnly && (index === 0 || group !== prevGroup) ? (
                <Text style={[s.group, index > 0 && s.laterGroup]}>{group}</Text>
              ) : null}
              <SidebarButton
                iconsOnly={iconsOnly}
                item={item}
                mobile={Boolean(onClose) || compact}
                selected={selected === item.name}
              />
            </View>
          );
        })}
        {!iconsOnly ? <InstallButton onSelect={onClose} /> : null}
      </ScrollView>

      {footer ? <View style={s.footer}>{footer}</View> : null}
    </View>
  );
}

function SidebarButton({
  item,
  selected,
  mobile,
  iconsOnly
}: {
  item: SidebarNavigationItem;
  selected: boolean;
  mobile: boolean;
  iconsOnly: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const visual: NavigationItemDefinition = navigationItems[item.name] ?? {
    icon: "ellipse",
    color: palette.brand,
    tint: palette.brandSoft,
    group: "Learning"
  };
  const badge = visual.badge;

  const button = (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole={item.href ? "link" : "button"}
      accessibilityState={{ selected }}
      {...(Platform.OS === "web"
        ? { "aria-current": selected ? ("page" as const) : undefined, title: item.label }
        : {})}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={(event) => {
        if (item.onSelect() === false) event.preventDefault?.();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={StyleSheet.flatten([
        s.item,
        mobile && s.mobileItem,
        iconsOnly && s.railItem,
        (hovered || pressed) && !selected && s.hovered,
        selected && s.selected,
        focused && s.focused
      ])}
    >
      <View
        style={[
          s.iconTile,
          { backgroundColor: selected ? "rgba(255, 255, 255, 0.18)" : visual.tint }
        ]}
      >
        <Ionicons
          color={selected ? "#FFFFFF" : visual.color}
          name={visual.icon}
          size={20}
        />
      </View>
      {!iconsOnly ? (
        <Text
          style={[s.label, mobile && s.mobileLabel, selected && s.selectedLabel]}
        >
          {item.label}
        </Text>
      ) : null}
      {badge && !iconsOnly ? (
        <View style={[s.badge, selected && s.selectedBadge]}>
          <Text style={[s.badgeText, selected && s.selectedBadgeText]}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return item.href ? (
    <Link asChild href={item.href as never}>
      {button}
    </Link>
  ) : (
    button
  );
}

const s = StyleSheet.create({
  sidebar: {
    height: "100%",
    maxHeight: "100%",
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: palette.border
  },
  compactSidebar: {
    borderRightColor: palette.border
  },
  brand: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F6"
  },
  railBrand: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  brandTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  brandIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0
  },
  brandLogoImg: {
    width: 36,
    height: 36
  },
  brandCopy: {
    flex: 1,
    minWidth: 0
  },
  brandWordmarkRow: {
    flexDirection: "row",
    alignItems: "baseline"
  },
  brandMy: {
    color: palette.accentStrong,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    fontStyle: "italic"
  },
  brandTitle: {
    color: palette.brand,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: 0
  },
  brandSubtitle: {
    color: palette.inkMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    marginTop: 1
  },
  chaburahBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.brandSurface,
    borderColor: palette.brandBorder,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  chaburah: {
    color: palette.brand,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    flex: 1
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  scroll: {
    flex: 1,
    minHeight: 0
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 20
  },
  railContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8
  },
  group: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5B6B86",
    lineHeight: 15,
    marginHorizontal: 8,
    marginTop: 12,
    marginBottom: 6
  },
  laterGroup: {
    marginTop: 16
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F2",
    backgroundColor: "#F8FAFC",
    marginBottom: 5
  },
  railItem: {
    width: 44,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: "center"
  },
  hovered: {
    backgroundColor: "#EEF3FB",
    borderColor: palette.brandBorder
  },
  mobileItem: {
    minHeight: 50,
    paddingVertical: 7
  },
  mobileLabel: {
    fontSize: 14,
    lineHeight: 20
  },
  selected: {
    backgroundColor: palette.brand,
    borderColor: palette.brandDeep
  },
  focused: {
    borderColor: palette.accentStrong
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  label: {
    flex: 1,
    minWidth: 0,
    color: "#253659",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    letterSpacing: 0
  },
  selectedLabel: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  badge: {
    borderRadius: 6,
    backgroundColor: "#EEF2F8",
    borderWidth: 1,
    borderColor: "#DCE4F0",
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    color: "#516282",
    fontWeight: "700"
  },
  selectedBadge: {
    backgroundColor: "rgba(246, 186, 54, 0.22)",
    borderColor: "rgba(246, 186, 54, 0.55)"
  },
  selectedBadgeText: {
    color: palette.accent,
    fontWeight: "800"
  },
  footer: {
    flexShrink: 0,
    borderTopWidth: 1,
    borderColor: "#DEE6F0",
    paddingTop: 8
  }
});
