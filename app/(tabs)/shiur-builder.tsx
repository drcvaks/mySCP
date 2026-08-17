import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  FilterChip,
  FormInput,
  MetaText,
  Pill,
  Row,
  Screen,
  SectionTitle,
  StatusBanner,
  styles
} from "../../src/shared/components";
import { supabase } from "../../src/lib/supabase";
import { formatSupabaseError } from "../../src/lib/errors";
import { theme } from "../../src/shared/theme";
import { buildReviewWeeks, fallbackCurrentReviewWeek } from "../../src/shared/reviewWeeks";
import { ContentChunk, ContentChunkLink, ReviewPacket } from "../../src/shared/types";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";

type PacketListItem = ReviewPacket & { itemCount: number };

export default function ShiurBuilderScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { askRavQuestions, chaburos, currentReviewWeek, refresh, reviewQuestions, selectedChaburahId } = useAppState();
  const { profile } = useAuthState();
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [links, setLinks] = useState<ContentChunkLink[]>([]);
  const [packets, setPackets] = useState<PacketListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePacketId, setActivePacketId] = useState<string | null>(null);
  const [activePacketStatus, setActivePacketStatus] = useState<ReviewPacket["status"]>("draft");
  const [previewChunkId, setPreviewChunkId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [week, setWeek] = useState(fallbackCurrentReviewWeek);
  const [sourceFilter, setSourceFilter] = useState<"all" | "notes" | "qa">("all");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const isWebPilot = Platform.OS === "web" && width >= 980;
  const canUseBuilder = profile?.role === "local_rabbi" || profile?.role === "global_admin";
  const managedChaburahId = profile?.role === "global_admin" ? selectedChaburahId : profile?.chaburahId;
  const managedChaburah = chaburos.find((chaburah) => chaburah.id === managedChaburahId);
  const reviewWeeks = buildReviewWeeks(currentReviewWeek, Math.max(currentReviewWeek, week));
  const chunkById = useMemo(() => new Map(chunks.map((chunk) => [chunk.id, chunk])), [chunks]);
  const selectedChunks = selectedIds.map((id) => chunkById.get(id)).filter((chunk): chunk is ContentChunk => Boolean(chunk));
  const previewChunk = previewChunkId ? chunkById.get(previewChunkId) : undefined;
  const filteredChunks = chunks.filter((chunk) => sourceFilter === "all" || chunk.sourceType === sourceFilter);
  const openAskRavCount = askRavQuestions.filter((question) => question.chaburahId === managedChaburahId && question.status === "submitted").length;
  const quickReviewDraftCount = reviewQuestions.filter(
    (question) =>
      question.chaburahId === managedChaburahId &&
      question.week === currentReviewWeek &&
      question.publicationStatus === "draft" &&
      !question.isLibraryQuestion
  ).length;
  const previewChunkIndex = previewChunkId ? filteredChunks.findIndex((chunk) => chunk.id === previewChunkId) : -1;
  const previousPreviewChunk = previewChunkIndex > 0 ? filteredChunks[previewChunkIndex - 1] : undefined;
  const nextPreviewChunk =
    previewChunkIndex >= 0 && previewChunkIndex < filteredChunks.length - 1 ? filteredChunks[previewChunkIndex + 1] : undefined;
  const draftPackets = packets.filter((packet) => packet.status === "draft" && packet.week === week);
  const publishedPackets = packets.filter((packet) => packet.status === "published" && packet.week === week);
  const suggestedChunks = links
    .filter((link) => selectedIds.includes(link.parentChunkId) && !selectedIds.includes(link.relatedChunkId))
    .map((link) => chunkById.get(link.relatedChunkId))
    .filter((chunk): chunk is ContentChunk => Boolean(chunk));
  const uniqueSuggestedChunks = Array.from(new Map(suggestedChunks.map((chunk) => [chunk.id, chunk])).values());

  useEffect(() => {
    setWeek((current) => (current === fallbackCurrentReviewWeek ? currentReviewWeek : current));
  }, [currentReviewWeek]);

  useEffect(() => {
    void loadBuilderData();
  }, [managedChaburahId]);

  useEffect(() => {
    if (!title && managedChaburah?.name) {
      setTitle(`${managedChaburah.name} Week ${week} Review Packet`);
    }
  }, [managedChaburah?.name, title, week]);

  async function loadBuilderData() {
    if (!managedChaburahId) return;
    setLoading(true);
    setMessage("");
    const [chunksResult, linksResult, packetsResult] = await Promise.all([
      supabase.from("content_chunks").select("*").eq("is_selectable", true).order("sort_order"),
      supabase.from("content_chunk_links").select("*"),
      supabase.from("review_packets").select("*").eq("chaburah_id", managedChaburahId).order("updated_at", { ascending: false })
    ]);
    setLoading(false);

    const firstError = [chunksResult.error, linksResult.error, packetsResult.error].find(Boolean);
    if (firstError) {
      setMessage(formatSupabaseError(firstError));
      return;
    }

    setChunks((chunksResult.data ?? []).map(mapContentChunk));
    setLinks((linksResult.data ?? []).map(mapContentChunkLink));
    const packetRows = (packetsResult.data ?? []).map(mapPacket);
    const packetCounts = await countPacketItems(packetRows.map((packet) => packet.id));
    setPackets(packetRows.map((packet) => ({ ...packet, itemCount: packetCounts.get(packet.id) ?? 0 })));
  }

  async function countPacketItems(packetIds: string[]) {
    const counts = new Map<string, number>();
    if (packetIds.length === 0) return counts;
    const { data } = await supabase.from("review_packet_items").select("packet_id").in("packet_id", packetIds);
    (data ?? []).forEach((row) => counts.set(row.packet_id, (counts.get(row.packet_id) ?? 0) + 1));
    return counts;
  }

  function addChunk(chunkId: string) {
    setSelectedIds((current) => (current.includes(chunkId) ? current : [...current, chunkId]));
  }

  function toggleChunkPreview(chunkId: string) {
    setPreviewChunkId((current) => (current === chunkId ? null : chunkId));
  }

  function moveChunkPreview(direction: -1 | 1) {
    const targetChunk = direction === -1 ? previousPreviewChunk : nextPreviewChunk;
    if (targetChunk) setPreviewChunkId(targetChunk.id);
  }

  function removeChunk(chunkId: string) {
    setSelectedIds((current) => current.filter((id) => id !== chunkId));
  }

  function moveChunk(chunkId: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(chunkId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function startNewDraft() {
    setActivePacketId(null);
    setActivePacketStatus("draft");
    setSelectedIds([]);
    setTitle(`${managedChaburah?.name ?? "My Chaburah"} Week ${week} Review Packet`);
    setMessage("Started a new draft packet.");
  }

  async function loadPacket(packet: PacketListItem) {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("review_packet_items")
      .select("chunk_id")
      .eq("packet_id", packet.id)
      .order("sort_order");
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setActivePacketId(packet.id);
    setActivePacketStatus(packet.status);
    setTitle(packet.title);
    setWeek(packet.week);
    setSelectedIds((data ?? []).map((item) => item.chunk_id));
    setMessage(packet.status === "draft" ? "Draft loaded." : "Published packet loaded for preview.");
  }

  async function saveDraft() {
    if (!profile?.id || !managedChaburahId) {
      setMessage("Choose or join a chaburah before saving a packet.");
      return null;
    }
    if (activePacketStatus !== "draft") {
      setMessage("Published packets are locked. Start a new draft to make changes.");
      return null;
    }
    if (!title.trim()) {
      setMessage("Add a packet title.");
      return null;
    }
    if (selectedIds.length === 0) {
      setMessage("Add at least one official section before saving.");
      return null;
    }

    setSaving(true);
    setMessage("");
    const packetPayload = {
      chaburah_id: managedChaburahId,
      title: title.trim(),
      week,
      siman: "Siman 95 Part 1",
      status: "draft" as const,
      created_by: profile.id
    };
    const packetResult = activePacketId
      ? await supabase.from("review_packets").update({ title: packetPayload.title, week: packetPayload.week }).eq("id", activePacketId).select("id").single()
      : await supabase.from("review_packets").insert(packetPayload).select("id").single();

    if (packetResult.error || !packetResult.data) {
      setSaving(false);
      setMessage(packetResult.error?.message ?? "Unable to save the packet.");
      return null;
    }

    const packetId = packetResult.data.id;
    const deleteResult = await supabase.from("review_packet_items").delete().eq("packet_id", packetId);
    if (deleteResult.error) {
      setSaving(false);
      setMessage(deleteResult.error.message);
      return null;
    }
    const insertResult = await supabase.from("review_packet_items").insert(
      selectedIds.map((chunkId, index) => ({
        packet_id: packetId,
        chunk_id: chunkId,
        sort_order: index + 1
      }))
    );
    setSaving(false);
    if (insertResult.error) {
      setMessage(insertResult.error.message);
      return null;
    }
    setActivePacketId(packetId);
    setActivePacketStatus("draft");
    setMessage("Draft packet saved.");
    await loadBuilderData();
    return packetId;
  }

  async function publishPacket() {
    const packetId = activePacketId ?? (await saveDraft());
    if (!packetId) return;
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase.rpc("publish_review_packet", { target_packet_id: packetId });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data?.id) {
      await supabase.rpc("notify_learning_file", { target_file_id: data.id });
    }
    setActivePacketStatus("published");
    setMessage("Packet published to Files.");
    await Promise.all([loadBuilderData(), refresh()]);
  }

  if (!canUseBuilder) {
    return (
      <Screen title="Shiur Builder" eyebrow="Rabbi Hub">
        <Card>
          <SectionTitle>Rabbi Access Required</SectionTitle>
          <Text style={styles.muted}>Shiur Builder is available to rabbonim and global admins.</Text>
        </Card>
      </Screen>
    );
  }

  if (!isWebPilot) {
    return (
      <Screen title="Shiur Builder" eyebrow="Web pilot" onRefresh={loadBuilderData} refreshing={loading}>
        <Card>
          <SectionTitle>Use the Web Version</SectionTitle>
          <Text style={styles.muted}>
            This first Shiur Builder pilot is optimized for the web layout, where the official material and packet draft can sit side by side.
          </Text>
          <Button label="Back to Rabbi Hub" onPress={() => router.push("/(tabs)/rabbi-hub")} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Shiur Builder" eyebrow="Rabbi Hub" onRefresh={loadBuilderData} refreshing={loading}>
      <StatusBanner message={message} tone={message.toLowerCase().includes("error") || message.toLowerCase().includes("unable") ? "error" : "info"} />
      <Card>
        <SectionTitle>Rabbi Tools</SectionTitle>
        <Text style={styles.muted}>Choose the workflow you want to work on.</Text>
        <View style={localStyles.toolCards}>
          <BuilderToolCard
            count={openAskRavCount}
            label="Ask Rav Inbox"
            meta="Participant questions waiting for a Rav response."
            onPress={() => router.push({ pathname: "/(tabs)/rabbi-hub", params: { tool: "ask-rav" } })}
          />
          <BuilderToolCard
            active
            label="Shiur Builder"
            meta="Prepare for shiur and publish longer packets from official SCP material."
            onPress={() => undefined}
          />
          <BuilderToolCard
            count={quickReviewDraftCount}
            label="Quick Review Questions"
            meta="Short weekly quiz questions for participants to answer in Review."
            onPress={() => router.push({ pathname: "/(tabs)/rabbi-hub", params: { tool: "quick-review" } })}
          />
        </View>
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 320 }}>
            <SectionTitle>Shiur Builder</SectionTitle>
            <Text style={styles.muted}>
              Use official SCP notes and Q&A to prepare for shiur, track the sections covered, and publish a polished after-shiur review packet for your chaburah.
            </Text>
          </View>
          <Pill label={`Week ${week}`} tone="primary" />
          <Button label="New Draft" onPress={startNewDraft} variant="secondary" />
        </Row>
        <MetaText>{managedChaburah?.name ?? "Current Chaburah"} - official text is controlled and cannot be edited in this version.</MetaText>
        <View style={localStyles.weekRow}>
          {reviewWeeks.map((reviewWeek) => (
            <FilterChip key={reviewWeek} label={`Week ${reviewWeek}`} onPress={() => setWeek(reviewWeek)} selected={week === reviewWeek} />
          ))}
        </View>
        <MetaText>Current week is Week {currentReviewWeek}.</MetaText>
      </Card>

      <View style={localStyles.workspace}>
        <Card>
          <SectionTitle>Official SCP Material</SectionTitle>
          <Text style={styles.muted}>Preview a section before adding it. Suggested Q&A appears after adding related notes.</Text>
          <View style={localStyles.weekRow}>
            <FilterChip label="All" onPress={() => setSourceFilter("all")} selected={sourceFilter === "all"} />
            <FilterChip label="Notes" onPress={() => setSourceFilter("notes")} selected={sourceFilter === "notes"} />
            <FilterChip label="Q&A" onPress={() => setSourceFilter("qa")} selected={sourceFilter === "qa"} />
          </View>
          <ScrollView contentContainerStyle={{ gap: 10 }} style={localStyles.columnScroll}>
            {filteredChunks.map((chunk) => {
              const isPreviewing = previewChunkId === chunk.id;
              return (
                <View key={chunk.id} style={[localStyles.chunkShell, selectedIds.includes(chunk.id) && localStyles.selectedChunk]}>
                  <View style={localStyles.chunkRow}>
                    <View style={{ flex: 1 }}>
                      <MetaText>{chunk.chunkCode} - {chunk.sectionTitle}</MetaText>
                      <Text style={localStyles.chunkTitle}>{chunk.chunkTitle}</Text>
                      {chunk.chunkSummary ? <Text style={styles.muted}>{chunk.chunkSummary}</Text> : null}
                    </View>
                    <View style={localStyles.chunkActions}>
                      <Button label={isPreviewing ? "Viewing" : "Preview"} onPress={() => toggleChunkPreview(chunk.id)} variant="ghost" />
                      <Button
                        label={selectedIds.includes(chunk.id) ? "Added" : "Add"}
                        onPress={() => addChunk(chunk.id)}
                        disabled={selectedIds.includes(chunk.id)}
                        variant="secondary"
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Card>

        <Card>
          <SectionTitle>My Review Packet</SectionTitle>
          <Text style={styles.muted}>Only the title is editable. The packet body uses the official text exactly as stored.</Text>
          <FormInput onChangeText={setTitle} placeholder="Packet title" value={title} />
          <ScrollView contentContainerStyle={{ gap: 10 }} style={localStyles.columnScroll}>
            {selectedChunks.length === 0 ? <Text style={styles.muted}>Add official sections to begin the draft packet.</Text> : null}
            {selectedChunks.map((chunk, index) => (
              <View key={chunk.id} style={localStyles.packetItem}>
                <View style={{ flex: 1 }}>
                  <MetaText>{index + 1}. {chunk.chunkCode}</MetaText>
                  <Text style={localStyles.chunkTitle}>{chunk.chunkTitle}</Text>
                </View>
                <View style={localStyles.itemActions}>
                  <Button label="Up" onPress={() => moveChunk(chunk.id, -1)} disabled={index === 0 || activePacketStatus !== "draft"} variant="ghost" />
                  <Button label="Down" onPress={() => moveChunk(chunk.id, 1)} disabled={index === selectedChunks.length - 1 || activePacketStatus !== "draft"} variant="ghost" />
                  <Button label="Remove" onPress={() => removeChunk(chunk.id)} disabled={activePacketStatus !== "draft"} variant="ghost" />
                </View>
              </View>
            ))}
          </ScrollView>
          {uniqueSuggestedChunks.length > 0 && activePacketStatus === "draft" ? (
            <View style={localStyles.suggestionBox}>
              <MetaText>Suggested Q&A</MetaText>
              {uniqueSuggestedChunks.map((chunk) => (
                <Row key={chunk.id}>
                  <Text style={[styles.body, { flex: 1 }]}>{chunk.chunkCode}: {chunk.chunkTitle}</Text>
                  <Button label="Add" onPress={() => addChunk(chunk.id)} variant="secondary" />
                </Row>
              ))}
            </View>
          ) : null}
          <Row>
            <Button label={saving ? "Saving..." : "Save Draft"} onPress={saveDraft} disabled={saving || activePacketStatus !== "draft"} />
            <Button
              label={saving ? "Publishing..." : "Publish to Files"}
              onPress={publishPacket}
              disabled={saving || activePacketStatus !== "draft" || selectedIds.length === 0}
              variant={selectedIds.length > 0 ? "primary" : "secondary"}
            />
          </Row>
        </Card>

        <Card>
          <SectionTitle>Existing Packets</SectionTitle>
          <Text style={styles.muted}>Load a draft to keep working or open a published packet for review.</Text>
          <ScrollView contentContainerStyle={{ gap: 10 }} style={localStyles.columnScroll}>
            <PacketGroup title="Drafts" packets={draftPackets} onLoad={loadPacket} />
            <PacketGroup title="Published" packets={publishedPackets} onLoad={loadPacket} />
          </ScrollView>
        </Card>
      </View>

      <Card>
        <SectionTitle>Packet Preview</SectionTitle>
        {selectedChunks.length === 0 ? <Text style={styles.muted}>Select sections to preview the packet.</Text> : null}
        {selectedChunks.map((chunk, index) => (
          <View key={chunk.id} style={localStyles.previewChunk}>
            <MetaText>{index + 1}. {chunk.chunkCode}</MetaText>
            <Text style={localStyles.previewTitle}>{chunk.chunkTitle}</Text>
            <Text style={localStyles.previewBody}>{chunk.contentMarkdown}</Text>
          </View>
        ))}
      </Card>

      <Modal animationType="fade" transparent visible={Boolean(previewChunk)} onRequestClose={() => setPreviewChunkId(null)}>
        <Pressable style={localStyles.previewBackdrop} onPress={() => setPreviewChunkId(null)}>
          <Pressable style={localStyles.previewModal}>
            {previewChunk ? (
              <>
                <Row>
                  <View style={{ flex: 1, minWidth: 260 }}>
                    <MetaText>{previewChunk.chunkCode} - {previewChunk.sectionTitle}</MetaText>
                    <Text style={localStyles.modalTitle}>{previewChunk.chunkTitle}</Text>
                  </View>
                  <Button label="Close" onPress={() => setPreviewChunkId(null)} variant="secondary" />
                </Row>
                <ScrollView contentContainerStyle={localStyles.previewPageContent} style={localStyles.previewPage}>
                  {previewChunk.contentMarkdown.split(/\n\s*\n/).map((paragraph, index) => (
                    <Text key={`${previewChunk.id}-${index}`} style={localStyles.previewParagraph}>
                      {paragraph.trim()}
                    </Text>
                  ))}
                </ScrollView>
                <Row>
                  <Button
                    label={selectedIds.includes(previewChunk.id) ? "Already Added" : "Add to Packet"}
                    onPress={() => addChunk(previewChunk.id)}
                    disabled={selectedIds.includes(previewChunk.id)}
                  />
                  <Button label="Previous" onPress={() => moveChunkPreview(-1)} disabled={!previousPreviewChunk} variant="secondary" />
                  <Button label="Next" onPress={() => moveChunkPreview(1)} disabled={!nextPreviewChunk} variant="secondary" />
                </Row>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function PacketGroup({
  title,
  packets,
  onLoad
}: {
  title: string;
  packets: PacketListItem[];
  onLoad: (packet: PacketListItem) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Row>
        <Text style={localStyles.groupTitle}>{title}</Text>
        <Pill label={`${packets.length}`} />
      </Row>
      {packets.length === 0 ? <Text style={styles.muted}>No {title.toLowerCase()} for this week.</Text> : null}
      {packets.map((packet) => (
        <View key={packet.id} style={localStyles.packetListRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.body}>{packet.title}</Text>
            <MetaText>{packet.itemCount} sections</MetaText>
          </View>
          <Button label="Open" onPress={() => onLoad(packet)} variant="secondary" />
        </View>
      ))}
    </View>
  );
}

function BuilderToolCard({
  active = false,
  count,
  label,
  meta,
  onPress
}: {
  active?: boolean;
  count?: number;
  label: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <View style={[localStyles.toolCard, active && localStyles.toolCardActive]}>
      <Row>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={[localStyles.toolCardTitle, active && localStyles.toolCardTitleActive]}>{label}</Text>
          <Text style={[styles.muted, active && localStyles.toolCardMetaActive]}>{meta}</Text>
        </View>
        {count !== undefined ? <Pill label={`${count}`} tone={count > 0 ? "accent" : "neutral"} /> : null}
      </Row>
      <Button label={active ? "Selected" : "Open"} onPress={onPress} variant={active ? "primary" : "secondary"} />
    </View>
  );
}

function mapContentChunk(row: any): ContentChunk {
  return {
    id: row.id,
    chunkCode: row.chunk_code,
    sourceType: row.source_type,
    siman: row.siman,
    workbookTitle: row.workbook_title,
    sectionKey: row.section_key,
    sectionTitle: row.section_title,
    chunkTitle: row.chunk_title,
    chunkSummary: row.chunk_summary ?? undefined,
    contentMarkdown: row.content_markdown,
    sortOrder: row.sort_order,
    officialShiurNumber: row.official_shiur_number ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    difficulty: row.difficulty,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sourceFileName: row.source_file_name ?? undefined,
    sourceStartPage: row.source_start_page ?? undefined,
    sourceEndPage: row.source_end_page ?? undefined,
    isSelectable: row.is_selectable
  };
}

function mapContentChunkLink(row: any): ContentChunkLink {
  return {
    id: row.id,
    parentChunkId: row.parent_chunk_id,
    relatedChunkId: row.related_chunk_id,
    relationType: row.relation_type
  };
}

function mapPacket(row: any): ReviewPacket {
  return {
    id: row.id,
    chaburahId: row.chaburah_id,
    title: row.title,
    week: row.week,
    siman: row.siman,
    status: row.status,
    createdBy: row.created_by,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const localStyles = StyleSheet.create({
  toolCards: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  toolCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexBasis: 260,
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md
  },
  toolCardActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary
  },
  toolCardTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21
  },
  toolCardTitleActive: {
    color: theme.colors.primary
  },
  toolCardMetaActive: {
    color: theme.colors.ink
  },
  workspace: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: theme.spacing.md
  },
  columnScroll: {
    maxHeight: 560
  },
  weekRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chunkShell: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm
  },
  chunkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  chunkActions: {
    gap: 8,
    minWidth: 96
  },
  selectedChunk: {
    backgroundColor: theme.colors.primarySoft
  },
  chunkTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19
  },
  packetItem: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: theme.spacing.sm
  },
  itemActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  suggestionBox: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: "#F2D37A",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: theme.spacing.sm
  },
  groupTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  packetListRow: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm
  },
  previewChunk: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: 6,
    paddingTop: theme.spacing.md
  },
  previewTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  previewBody: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 23
  },
  previewBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  previewModal: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.md,
    maxHeight: "92%",
    maxWidth: 900,
    padding: theme.spacing.lg,
    width: "100%"
  },
  modalTitle: {
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28
  },
  previewPage: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 4,
    borderWidth: 1,
    maxHeight: 560
  },
  previewPageContent: {
    gap: theme.spacing.md,
    paddingHorizontal: 48,
    paddingVertical: 40
  },
  previewParagraph: {
    color: theme.colors.ink,
    fontSize: 16,
    lineHeight: 27
  }
});
