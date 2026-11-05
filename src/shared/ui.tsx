import { Ionicons } from "@expo/vector-icons";
import { PropsWithChildren, ReactNode, useState } from "react";
import { Modal, Pressable, StyleProp, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from "react-native";
import { palette, radii, shadows, theme, typography } from "./theme";

type IconName = keyof typeof Ionicons.glyphMap;
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

export function Inline({ children, gap = 6, align = "center" }: { children: ReactNode; gap?: number; align?: "center" | "flex-start" }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: align, gap, minWidth: 0 }}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: palette.border, alignSelf: "stretch" }} />;
}

const AVATAR_TONES = [
  { bg: "#EAF0FB", fg: "#062A72", border: "#C5D4F2" },
  { bg: "#FEF5DC", fg: "#9A6700", border: "#F5D47A" },
  { bg: "#E7F6EE", fg: "#127848", border: "#B4E2C8" },
  { bg: "#EDE9FE", fg: "#5B21B6", border: "#DDD6FE" },
  { bg: "#E0F2FE", fg: "#0369A1", border: "#BAE6FD" },
  { bg: "#FCE7F3", fg: "#9D174D", border: "#FBCFE8" }
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getInitials(name?: string | null) {
  const cleaned = (name ?? "")
    .replace(/^(rabbi|rav|r\.|r'|harav|mr\.|mrs\.|ms\.|dr\.)\s+/i, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export const initialsOf = getInitials;

export function Avatar({
  name,
  size = 36,
  highlight = false
}: {
  name?: string | null;
  size?: number;
  highlight?: boolean;
}) {
  const tone = highlight
    ? { bg: palette.accentSoft, fg: palette.brand, border: palette.accentStrong }
    : AVATAR_TONES[hashString(name ?? "mySCP") % AVATAR_TONES.length];
  const fontSize = Math.max(11, Math.round(size * 0.38));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        uiStyles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          backgroundColor: tone.bg,
          borderColor: tone.border
        }
      ]}
    >
      <Text style={[uiStyles.avatarText, { color: tone.fg, fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

export function IconTile({
  icon,
  tone = "brand",
  size = 38
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "brand" | "primary" | "gold" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: number;
}) {
  const normalizedTone = tone === "primary" ? "brand" : tone === "accent" ? "gold" : tone;
  const map = {
    brand: { bg: palette.brandSoft, fg: palette.brand, border: palette.brandBorder },
    gold: { bg: palette.accentSoft, fg: palette.accentDeep, border: palette.accentBorder },
    success: { bg: palette.successSoft, fg: palette.success, border: palette.successBorder },
    warning: { bg: palette.warningSoft, fg: palette.warning, border: palette.warningBorder },
    danger: { bg: palette.dangerSoft, fg: palette.danger, border: palette.dangerBorder },
    info: { bg: palette.infoSoft, fg: palette.info, border: palette.infoBorder },
    neutral: { bg: palette.surfaceMuted, fg: palette.inkSecondary, border: palette.border }
  }[normalizedTone];

  return (
    <View
      style={[
        uiStyles.iconTile,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: map.bg,
          borderColor: map.border
        }
      ]}
    >
      <Ionicons color={map.fg} name={icon} size={Math.round(size * 0.5)} />
    </View>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  onPress
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "brand" | "primary" | "gold" | "accent" | "success" | "info" | "neutral";
  onPress?: () => void;
}) {
  const isGold = tone === "gold" || tone === "accent";
  const content = (
    <View style={[uiStyles.statTile, isGold ? uiStyles.statTileGold : null]}>
      <View style={uiStyles.statHeader}>
        <Text numberOfLines={1} style={uiStyles.statLabel}>
          {label}
        </Text>
        {icon ? <IconTile icon={icon} size={30} tone={tone} /> : null}
      </View>
      <Text numberOfLines={1} style={uiStyles.statValue}>
        {value}
      </Text>
      {hint ? (
        <Text numberOfLines={2} style={uiStyles.statHint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, minWidth: 150 }, pressed ? { opacity: 0.9 } : null]}>
      {content}
    </Pressable>
  );
}

export function EmptyState({
  icon = "sparkles-outline" as keyof typeof Ionicons.glyphMap,
  title,
  message,
  body,
  action,
  children
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  body?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const description = message ?? body;
  return (
    <View style={uiStyles.emptyState}>
      <IconTile icon={icon} size={44} tone="brand" />
      <Text style={uiStyles.emptyTitle}>{title}</Text>
      {description ? <Text style={uiStyles.emptyMessage}>{description}</Text> : null}
      {action ? <View style={{ marginTop: 4 }}>{action}</View> : null}
      {children ? <View style={{ marginTop: 4 }}>{children}</View> : null}
    </View>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: radii.md,
        padding: 16,
        gap: 10
      }}
    >
      <View style={{ backgroundColor: "#E7ECF5", borderRadius: 6, width: "62%", height: 18 }} />
      <View style={{ flexDirection: "row", gap: 6 }}>
        <View style={{ backgroundColor: "#E7ECF5", width: 84, height: 20, borderRadius: 10 }} />
        <View style={{ backgroundColor: "#E7ECF5", width: 56, height: 20, borderRadius: 10 }} />
      </View>
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={index}
          style={{ backgroundColor: "#E7ECF5", borderRadius: 6, width: index === lines - 1 ? "48%" : "100%", height: 12 }}
        />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

export interface TabOption {
  id?: string;
  key?: string;
  label: string;
  icon?: IconName;
  accessibilityLabel?: string;
  hint?: string;
  count?: number;
}

export function SegmentedTabs<T extends string>({
  items,
  options,
  value,
  onChange,
  stacked,
  style
}: {
  items?: Array<{
    key: T;
    label: string;
    count?: number;
    icon?: keyof typeof Ionicons.glyphMap;
    accessibilityLabel?: string;
    hint?: string;
  }>;
  options?: readonly TabOption[];
  value: T;
  onChange: (next: T) => void;
  stacked?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const vertical = stacked ?? (Boolean(options) && width < 600);
  const normalized = (options
    ? options.map((opt) => ({
        key: ((opt as { id?: string; key?: string }).id ?? (opt as { id?: string; key?: string }).key ?? opt.label) as T,
        label: opt.label,
        icon: opt.icon,
        accessibilityLabel: opt.accessibilityLabel,
        hint: opt.hint,
        count: opt.count
      }))
    : items ?? []);

  return (
    <View accessibilityRole="tablist" style={[uiStyles.segmentedTrack, style]}>
      {normalized.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            accessibilityHint={item.hint}
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={({ pressed, focused }: PressState) => [
              uiStyles.segmentedTab,
              vertical ? { flexDirection: "column", gap: 3, minHeight: 56, paddingHorizontal: 4 } : null,
              active ? uiStyles.segmentedTabActive : null,
              pressed ? { opacity: 0.85 } : null,
              focused ? theme.focusRing : null
            ]}
          >
            {item.icon ? (
              <Ionicons
                color={active ? palette.brand : palette.inkMuted}
                name={item.icon}
                size={vertical ? 19 : 16}
              />
            ) : null}
            <Text
              numberOfLines={vertical ? 2 : 1}
              style={[
                uiStyles.segmentedLabel,
                vertical ? { fontSize: 12, lineHeight: 15, textAlign: "center" } : null,
                active ? uiStyles.segmentedLabelActive : null
              ]}
            >
              {item.label}
            </Text>
            {typeof item.count === "number" ? (
              <View style={[uiStyles.segmentedCount, active ? uiStyles.segmentedCountActive : null]}>
                <Text style={[uiStyles.segmentedCountText, active ? uiStyles.segmentedCountTextActive : null]}>
                  {item.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export type OverflowAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: "default" | "danger" | "brand";
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
  onPress: () => void;
};

export type MenuItem = {
  label: string;
  icon: IconName;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
};

export function OverflowMenu({
  actions,
  items,
  label = "More actions",
  caption
}: {
  actions?: OverflowAction[];
  items?: MenuItem[];
  label?: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);
  const { width } = useWindowDimensions();
  const sheet = width < 600;
  const rawList: OverflowAction[] = items
    ? items.filter(Boolean).map((item) => ({
        label: item.label,
        icon: item.icon,
        tone: item.destructive ? "danger" : "brand",
        destructive: item.destructive,
        disabled: item.disabled,
        hint: item.hint,
        onPress: item.onPress
      }))
    : (actions ?? []).filter(Boolean);
  if (rawList.length === 0) return null;

  return (
    <View style={uiStyles.overflowWrap}>
      <Pressable
        accessibilityHint="Opens a list of more actions"
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed, focused }: PressState) => [
          uiStyles.overflowTrigger,
          caption ? { width: undefined, paddingHorizontal: 12, flexDirection: "row", gap: 6 } : null,
          open ? uiStyles.overflowTriggerOpen : null,
          pressed ? { opacity: 0.85 } : null,
          focused ? theme.focusRing : null
        ]}
      >
        <Ionicons color={open ? palette.brand : palette.brand} name="ellipsis-horizontal" size={18} />
        {caption ? <Text style={{ color: palette.brand, fontSize: 13, fontWeight: "700" }}>{caption}</Text> : null}
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={[uiStyles.modalBackdrop, { justifyContent: sheet ? "flex-end" : "center" }]}>
          <Pressable
            accessibilityLabel="Close menu"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={[uiStyles.modalSheet, sheet ? { maxWidth: 480 } : { maxWidth: 320 }]}>
            <View style={uiStyles.modalSheetHeader}>
              <Text style={uiStyles.modalSheetTitle}>{label}</Text>
              <Pressable
                accessibilityLabel="Dismiss menu"
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={uiStyles.modalCloseBtn}
              >
                <Ionicons color={palette.inkMuted} name="close" size={18} />
              </Pressable>
            </View>
            {rawList.map((action) => {
              const danger = action.tone === "danger" || action.destructive;
              const brand = action.tone === "brand";
              return (
                <Pressable
                  accessibilityHint={action.hint}
                  accessibilityLabel={action.label}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!action.disabled }}
                  disabled={action.disabled}
                  key={action.label}
                  onPress={() => {
                    setOpen(false);
                    action.onPress();
                  }}
                  style={({ pressed }) => [
                    uiStyles.menuItem,
                    pressed ? uiStyles.menuItemPressed : null,
                    action.disabled ? { opacity: 0.45 } : null
                  ]}
                >
                  {action.icon ? (
                    <Ionicons
                      color={danger ? palette.danger : brand ? palette.brand : palette.inkSecondary}
                      name={action.icon}
                      size={19}
                    />
                  ) : null}
                  <Text
                    style={[
                      uiStyles.menuItemText,
                      danger ? { color: palette.danger } : null,
                      brand ? { color: palette.brand } : null
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={({ pressed }) => [
                {
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radii.sm,
                  marginTop: 4,
                  borderTopWidth: 1,
                  borderColor: palette.borderSubtle
                },
                pressed ? uiStyles.menuItemPressed : null
              ]}
            >
              <Text style={{ color: palette.inkMuted, fontSize: 14, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function Banner({
  tone = "info",
  icon,
  title,
  children,
  action
}: PropsWithChildren<{
  tone?: "brand" | "gold" | "success" | "warning" | "danger" | "info";
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  action?: ReactNode;
}>) {
  const paletteMap = {
    brand: { bg: palette.brandSoft, border: palette.brandBorder, fg: palette.brand, icon: "information-circle" as const },
    gold: { bg: palette.accentSoft, border: palette.accentBorder, fg: palette.accentDeep, icon: "sparkles" as const },
    success: { bg: palette.successSoft, border: palette.successBorder, fg: palette.success, icon: "checkmark-circle" as const },
    warning: { bg: palette.warningSoft, border: palette.warningBorder, fg: palette.warning, icon: "alert-circle" as const },
    danger: { bg: palette.dangerSoft, border: palette.dangerBorder, fg: palette.danger, icon: "warning" as const },
    info: { bg: palette.infoSoft, border: palette.infoBorder, fg: palette.info, icon: "information-circle" as const }
  }[tone];

  return (
    <View style={[uiStyles.banner, { backgroundColor: paletteMap.bg, borderColor: paletteMap.border }]}>
      <Ionicons color={paletteMap.fg} name={icon ?? paletteMap.icon} size={18} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, minWidth: 180, gap: 2 }}>
        {title ? <Text style={[uiStyles.bannerTitle, { color: paletteMap.fg }]}>{title}</Text> : null}
        {typeof children === "string" ? (
          <Text style={[uiStyles.bannerText, { color: palette.inkSecondary }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
      {action}
    </View>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "brand"
}: {
  value: number;
  max?: number;
  tone?: "brand" | "gold" | "success";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  const fill = tone === "gold" ? palette.accentStrong : tone === "success" ? palette.success : palette.brand;
  return (
    <View style={uiStyles.progressTrack}>
      <View style={[uiStyles.progressFill, { width: `${pct}%`, backgroundColor: fill }]} />
    </View>
  );
}

const uiStyles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    flexShrink: 0
  },
  avatarText: {
    fontWeight: "800",
    letterSpacing: 0
  },
  iconTile: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0
  },
  statTile: {
    flex: 1,
    minWidth: 150,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 6,
    ...shadows.xs
  },
  statTileGold: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accentBorder
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  statLabel: {
    ...typography.caption,
    fontWeight: "700",
    color: palette.inkMuted,
    flex: 1
  },
  statValue: {
    fontFamily: typography.families.serif,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
    color: palette.ink
  },
  statHint: {
    ...typography.caption,
    color: palette.inkMuted
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceSubtle,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.borderStrong,
    gap: 8
  },
  emptyTitle: {
    ...typography.h3,
    textAlign: "center"
  },
  emptyMessage: {
    ...typography.caption,
    textAlign: "center",
    maxWidth: 420
  },
  segmentedTrack: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.border
  },
  segmentedTab: {
    flex: 1,
    minWidth: 110,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md
  },
  segmentedTabActive: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.xs
  },
  segmentedLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.inkMuted
  },
  segmentedLabelActive: {
    color: palette.brand
  },
  segmentedCount: {
    backgroundColor: palette.border,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 1
  },
  segmentedCountActive: {
    backgroundColor: palette.brandSoft
  },
  segmentedCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: palette.inkSecondary
  },
  segmentedCountTextActive: {
    color: palette.brand
  },
  overflowWrap: {
    position: "relative"
  },
  overflowTrigger: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  overflowTriggerOpen: {
    borderColor: palette.brandBorder,
    backgroundColor: palette.brandSoft
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 25, 51, 0.38)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalSheet: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 8,
    gap: 2,
    ...shadows.lg
  },
  modalSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderSubtle,
    marginBottom: 4
  },
  modalSheetTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: radii.xs
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.sm
  },
  menuItemPressed: {
    backgroundColor: palette.surfaceMuted
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "800"
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 19
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
    overflow: "hidden",
    width: "100%"
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill
  }
});
