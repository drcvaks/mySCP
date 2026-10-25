import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { bmCategories, bmIsRtl, bmStatuses, BmThread } from "./beisMidrash";
import { MetaText, Pill, Row, styles } from "./components";
import { chunkDisplayCode } from "./chunkLabels";

export function BmDiscussionCard({ thread, programLabel, activityLabel, onOpen }: {
  thread: BmThread; programLabel: string; activityLabel: string; onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open discussion: ${thread.title}`}
    accessibilityHint="Open the full discussion and its replies." onPress={onOpen}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.card, s.card, (hovered || focused || pressed) && s.active]}>
    <Text style={[s.title, { textAlign: bmIsRtl(thread.title) ? "right" : "left", writingDirection: bmIsRtl(thread.title) ? "rtl" : "ltr" }]}>{thread.title}</Text>
    <Row><Pill label={bmCategories[thread.category]} /><Pill label={bmStatuses[thread.status]} />
      {thread.unread ? <Pill label="Unread" tone="primary" /> : null}
      {thread.is_hidden ? <Pill label="Hidden" tone="danger" /> : null}{thread.deleted_at ? <Pill label="Removed" tone="danger" /> : null}</Row>
    <Text numberOfLines={3} style={[styles.body, { textAlign: bmIsRtl(thread.excerpt ?? "") ? "right" : "left", writingDirection: bmIsRtl(thread.excerpt ?? "") ? "rtl" : "ltr" }]}>{thread.excerpt}</Text>
    <MetaText>{thread.author_name} - {programLabel}</MetaText>
    <View style={s.footer}>
      <MetaText>{thread.reply_count ?? 0} replies - {activityLabel}</MetaText>
      <View style={s.open}><Text style={s.openText}>Open Discussion</Text><Ionicons name="arrow-forward-circle" size={23} color="#2563EB" /></View>
    </View>
    {thread.chunks?.length ? <View style={s.chunks}>{thread.chunks.map(chunk => <Pill key={chunk.id} label={chunkDisplayCode(chunk.code)} />)}</View> : null}
  </Pressable>;
}
const s = StyleSheet.create({
  card: { borderWidth: 2, borderColor: "#DEE6F1" },
  active: { borderColor: "#7C9FEA", backgroundColor: "#F2F6FF" },
  title: { fontSize: 18, lineHeight: 26, fontWeight: "700", color: "#172033" },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  open: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32 },
  openText: { fontSize: 13, fontWeight: "700", color: "#2359B5" },
  chunks: { flexDirection: "row", flexWrap: "wrap", gap: 6 }
});
