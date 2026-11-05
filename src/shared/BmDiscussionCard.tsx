import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { bmCategories, bmIsRtl, bmStatuses, BmThread } from "./beisMidrash";
import { Pill } from "./components";
import { chunkDisplayCode } from "./chunkLabels";
import { theme } from "./theme";
import { Avatar, Inline } from "./ui";

type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

const statusTone = { answered: "success", resolved: "success" } as const;

/** One discussion in the list. Whole card is the button; unread discussions get a gold edge. */
export function BmDiscussionCard({ thread, programLabel, activityLabel, onOpen }: {
  thread: BmThread; programLabel: string; activityLabel: string; onOpen: () => void;
}) {
  const rtlTitle = bmIsRtl(thread.title);
  const rtlExcerpt = bmIsRtl(thread.excerpt ?? "");
  const statusKey = String(thread.status);
  const tone = (statusTone as Record<string, "success">)[statusKey] ?? "neutral";
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open discussion: ${thread.title}`}
    accessibilityHint="Open the full discussion and its replies." onPress={onOpen}
    style={({ pressed, hovered, focused }: PressState) => [s.card, !!thread.unread && s.unread, (hovered || pressed) && s.hover, focused && theme.focusRing]}>
    <View style={s.head}>
      <Avatar name={thread.author_name || "?"} size={38} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={2} style={[s.title, { textAlign: rtlTitle ? "right" : "left", writingDirection: rtlTitle ? "rtl" : "ltr" }]}>{thread.title}</Text>
        <Text numberOfLines={1} style={s.meta}>{thread.author_name} - {programLabel}</Text>
      </View>
      {thread.unread ? <View style={s.dot} accessibilityElementsHidden /> : null}
    </View>
    <Inline>
      <Pill label={bmCategories[thread.category]} tone="primary" />
      <Pill label={bmStatuses[thread.status]} tone={tone} />
      {thread.unread ? <Pill label="Unread" tone="accent" /> : null}
      {thread.is_hidden ? <Pill label="Hidden" tone="danger" /> : null}
      {thread.deleted_at ? <Pill label="Removed" tone="danger" /> : null}
    </Inline>
    {thread.excerpt ? <Text numberOfLines={3} style={[s.excerpt, rtlExcerpt && theme.type.bodyHebrew,
      { textAlign: rtlExcerpt ? "right" : "left", writingDirection: rtlExcerpt ? "rtl" : "ltr" }]}>{thread.excerpt}</Text> : null}
    {thread.chunks?.length ? <Inline>{thread.chunks.map(chunk => <Pill key={chunk.id} label={chunkDisplayCode(chunk.code)} icon="document-text-outline" />)}</Inline> : null}
    <View style={s.footer}>
      <Ionicons name="chatbubble-ellipses-outline" size={15} color={theme.colors.muted} />
      <Text style={s.meta}>{thread.reply_count ?? 0} replies - {activityLabel}</Text>
      <View style={{ flex: 1 }} />
      <Text style={s.open}>Open Discussion</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
    </View>
  </Pressable>;
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 14, gap: 10, ...theme.shadow.card },
  unread: { borderLeftWidth: 4, borderLeftColor: theme.colors.accent },
  hover: { borderColor: theme.colors.primaryBorder, backgroundColor: "#FAFBFE" },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: "700", color: theme.colors.ink },
  meta: { fontSize: 12.5, lineHeight: 17, color: theme.colors.muted },
  excerpt: { fontSize: 14.5, lineHeight: 21, color: theme.colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent, marginTop: 6 },
  footer: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 },
  open: { fontSize: 13, fontWeight: "700", color: theme.colors.primary }
});
