import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { ContentChunk, ContentChunkLink, ReviewPacket, ReviewPacketCoverage } from "../../src/shared/types";
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
  const [coverageRows, setCoverageRows] = useState<ReviewPacketCoverage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePacketId, setActivePacketId] = useState<string | null>(null);
  const [activePacketStatus, setActivePacketStatus] = useState<ReviewPacket["status"]>("draft");
  const [previewChunkId, setPreviewChunkId] = useState<string | null>(null);
  const [previewSectionKey, setPreviewSectionKey] = useState<string | null>(null);
  const [packetPreviewChunkId, setPacketPreviewChunkId] = useState<string | null>(null);
  const [previewingPacket, setPreviewingPacket] = useState(false);
  const [title, setTitle] = useState("");
  const [week, setWeek] = useState(fallbackCurrentReviewWeek);
  const [sourceFilter, setSourceFilter] = useState<"all" | "notes" | "qa">("all");
  const [coverageFilter, setCoverageFilter] = useState<"all" | "covered" | "not-covered">("all");
  const [expandedSectionKeys, setExpandedSectionKeys] = useState<string[]>([]);
  const [expandedPacketSectionKeys, setExpandedPacketSectionKeys] = useState<string[]>([]);
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
  const packetPreviewChunk = packetPreviewChunkId ? chunkById.get(packetPreviewChunkId) : undefined;
  const coverageByChunkId = useMemo(() => {
    const coverageMap = new Map<string, ReviewPacketCoverage[]>();
    coverageRows.forEach((coverage) => {
      const rows = coverageMap.get(coverage.chunkId) ?? [];
      rows.push(coverage);
      coverageMap.set(coverage.chunkId, rows.sort((a, b) => a.week - b.week));
    });
    return coverageMap;
  }, [coverageRows]);
  const filteredChunks = chunks.filter((chunk) => {
    const matchesSource = sourceFilter === "all" || chunk.sourceType === sourceFilter;
    const hasCoverage = coverageByChunkId.has(chunk.id);
    const matchesCoverage =
      coverageFilter === "all" ||
      (coverageFilter === "covered" && hasCoverage) ||
      (coverageFilter === "not-covered" && !hasCoverage);
    return matchesSource && matchesCoverage;
  });
  const materialSections = groupChunksBySection(filteredChunks);
  const packetSections = groupSelectedChunksBySection(selectedChunks);
  const previewSection = previewSectionKey ? materialSections.find((section) => section.key === previewSectionKey) : undefined;
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
  const packetPreviewChunkIndex = packetPreviewChunkId ? selectedChunks.findIndex((chunk) => chunk.id === packetPreviewChunkId) : -1;
  const previousPacketPreviewChunk = packetPreviewChunkIndex > 0 ? selectedChunks[packetPreviewChunkIndex - 1] : undefined;
  const nextPacketPreviewChunk =
    packetPreviewChunkIndex >= 0 && packetPreviewChunkIndex < selectedChunks.length - 1 ? selectedChunks[packetPreviewChunkIndex + 1] : undefined;
  const modalPreviewChunks = previewingPacket
    ? selectedChunks
    : previewSection
      ? previewSection.chunks
      : packetPreviewChunk
        ? [packetPreviewChunk]
        : previewChunk
          ? [previewChunk]
          : [];
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
    const [chunksResult, linksResult, packetsResult, coverageResult] = await Promise.all([
      supabase.from("content_chunks").select("*").eq("is_selectable", true).order("sort_order"),
      supabase.from("content_chunk_links").select("*"),
      supabase.from("review_packets").select("*").eq("chaburah_id", managedChaburahId).order("updated_at", { ascending: false }),
      supabase.from("review_packet_content_coverage").select("*").eq("chaburah_id", managedChaburahId)
    ]);
    setLoading(false);

    const firstError = [chunksResult.error, linksResult.error, packetsResult.error, coverageResult.error].find(Boolean);
    if (firstError) {
      setMessage(formatSupabaseError(firstError));
      return;
    }

    setChunks((chunksResult.data ?? []).map(mapContentChunk));
    setLinks((linksResult.data ?? []).map(mapContentChunkLink));
    setCoverageRows((coverageResult.data ?? []).map(mapCoverage));
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

  function normalizePacketIds(ids: string[]) {
    return groupSelectedChunksBySection(ids.map((id) => chunkById.get(id)).filter((chunk): chunk is ContentChunk => Boolean(chunk))).flatMap(
      (section) => section.chunks.map((chunk) => chunk.id)
    );
  }

  function addChunk(chunkId: string) {
    setSelectedIds((current) => (current.includes(chunkId) ? current : normalizePacketIds([...current, chunkId])));
    const chunk = chunkById.get(chunkId);
    if (chunk) expandPacketSection(sectionKeyForChunk(chunk));
  }

  function addSection(sectionChunks: ContentChunk[]) {
    setSelectedIds((current) => {
      const next = [...current];
      sectionChunks.forEach((chunk) => {
        if (!next.includes(chunk.id)) next.push(chunk.id);
      });
      return normalizePacketIds(next);
    });
    const firstChunk = sectionChunks[0];
    if (firstChunk) expandPacketSection(sectionKeyForChunk(firstChunk));
  }

  function toggleSection(sectionKey: string) {
    setExpandedSectionKeys((current) =>
      current.includes(sectionKey) ? current.filter((key) => key !== sectionKey) : [...current, sectionKey]
    );
  }

  function expandPacketSection(sectionKey: string) {
    setExpandedPacketSectionKeys((current) => (current.includes(sectionKey) ? current : [...current, sectionKey]));
  }

  function togglePacketSection(sectionKey: string) {
    setExpandedPacketSectionKeys((current) =>
      current.includes(sectionKey) ? current.filter((key) => key !== sectionKey) : [...current, sectionKey]
    );
  }

  function toggleChunkPreview(chunkId: string) {
    setPacketPreviewChunkId(null);
    setPreviewSectionKey(null);
    setPreviewingPacket(false);
    setPreviewChunkId(chunkId);
  }

  function previewWholeSection(sectionKey: string) {
    setPacketPreviewChunkId(null);
    setPreviewChunkId(null);
    setPreviewingPacket(false);
    setPreviewSectionKey(sectionKey);
  }

  function previewPacketChunk(chunkId: string) {
    setPreviewChunkId(null);
    setPreviewSectionKey(null);
    setPreviewingPacket(false);
    setPacketPreviewChunkId(chunkId);
  }

  function clearPreview() {
    setPreviewChunkId(null);
    setPreviewSectionKey(null);
    setPacketPreviewChunkId(null);
    setPreviewingPacket(false);
  }

  function moveChunkPreview(direction: -1 | 1) {
    const targetChunk = direction === -1 ? previousPreviewChunk : nextPreviewChunk;
    if (targetChunk) setPreviewChunkId(targetChunk.id);
  }

  function removeChunk(chunkId: string) {
    setSelectedIds((current) => current.filter((id) => id !== chunkId));
  }

  function removePacketSection(sectionKey: string) {
    setSelectedIds((current) =>
      current.filter((id) => {
        const chunk = chunkById.get(id);
        return chunk ? sectionKeyForChunk(chunk) !== sectionKey : true;
      })
    );
  }

  function movePacketSection(sectionKey: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const sections = groupSelectedChunksBySection(
        current.map((id) => chunkById.get(id)).filter((chunk): chunk is ContentChunk => Boolean(chunk))
      );
      const index = sections.findIndex((section) => section.key === sectionKey);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sections.length) return current;
      const nextSections = [...sections];
      const [section] = nextSections.splice(index, 1);
      nextSections.splice(nextIndex, 0, section);
      return nextSections.flatMap((nextSection) => nextSection.chunks.map((chunk) => chunk.id));
    });
  }

  function movePacketChunk(chunkId: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const sections = groupSelectedChunksBySection(
        current.map((id) => chunkById.get(id)).filter((chunk): chunk is ContentChunk => Boolean(chunk))
      );
      const section = sections.find((candidate) => candidate.chunks.some((chunk) => chunk.id === chunkId));
      if (!section) return current;
      const chunkIndex = section.chunks.findIndex((chunk) => chunk.id === chunkId);
      const nextChunkIndex = chunkIndex + direction;
      if (chunkIndex < 0 || nextChunkIndex < 0 || nextChunkIndex >= section.chunks.length) return current;
      const nextSections = sections.map((candidate) => {
        if (candidate.key !== section.key) return candidate;
        const nextChunks = [...candidate.chunks];
        const [chunk] = nextChunks.splice(chunkIndex, 1);
        nextChunks.splice(nextChunkIndex, 0, chunk);
        return { ...candidate, chunks: nextChunks };
      });
      return nextSections.flatMap((nextSection) => nextSection.chunks.map((chunk) => chunk.id));
    });
  }

  function movePacketPreview(direction: -1 | 1) {
    const targetChunk = direction === -1 ? previousPacketPreviewChunk : nextPacketPreviewChunk;
    if (targetChunk) setPacketPreviewChunkId(targetChunk.id);
  }

  function removePreviewedPacketChunk() {
    if (!packetPreviewChunkId) return;
    const fallbackChunk = nextPacketPreviewChunk ?? previousPacketPreviewChunk;
    removeChunk(packetPreviewChunkId);
    setPacketPreviewChunkId(fallbackChunk?.id ?? null);
  }

  function startNewDraft() {
    if (selectedIds.length > 0 || title.trim().length > 0) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const confirmed = window.confirm("Start a new draft? This will clear the current packet from the screen. Saved drafts will remain available.");
        if (!confirmed) return;
      } else {
        Alert.alert("Start New Draft?", "This will clear the current packet from the screen. Saved drafts will remain available.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Start New Draft",
            style: "destructive",
            onPress: () => resetDraftState()
          }
        ]);
        return;
      }
    }
    resetDraftState();
  }

  function resetDraftState() {
    setActivePacketId(null);
    setActivePacketStatus("draft");
    setSelectedIds([]);
    setExpandedPacketSectionKeys([]);
    clearPreview();
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
    const loadedIds = (data ?? []).map((item) => item.chunk_id);
    setSelectedIds(loadedIds);
    const loadedSections = groupSelectedChunksBySection(
      loadedIds.map((id) => chunkById.get(id)).filter((chunk): chunk is ContentChunk => Boolean(chunk))
    );
    setExpandedPacketSectionKeys(loadedSections.map((section) => section.key));
    clearPreview();
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
    const packetId = await saveDraft();
    if (!packetId) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const confirmed = window.confirm("Publish this review packet to Files? Participants in this chaburah will be able to open it.");
      if (!confirmed) return;
    } else {
      Alert.alert("Publish Packet?", "Participants in this chaburah will be able to open this packet in Files.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: () => {
            void publishConfirmedPacket(packetId);
          }
        }
      ]);
      return;
    }
    await publishConfirmedPacket(packetId);
  }

  async function publishConfirmedPacket(packetId: string) {
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
        </Row>
        <MetaText>{managedChaburah?.name ?? "Current Chaburah"} - official text is controlled and cannot be edited in this version.</MetaText>
        <View style={localStyles.weekRow}>
          {reviewWeeks.map((reviewWeek) => (
            <FilterChip key={reviewWeek} label={`Week ${reviewWeek}`} onPress={() => setWeek(reviewWeek)} selected={week === reviewWeek} />
          ))}
        </View>
        <MetaText>Current week is Week {currentReviewWeek}.</MetaText>
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 260 }}>
            <SectionTitle>Existing Packets</SectionTitle>
            <Text style={styles.muted}>Load a draft or view a published packet before building.</Text>
          </View>
          <Pill label={`${draftPackets.length} drafts`} tone={draftPackets.length ? "accent" : "neutral"} />
          <Pill label={`${publishedPackets.length} published`} tone={publishedPackets.length ? "success" : "neutral"} />
        </Row>
        <View style={localStyles.existingPacketBands}>
          <PacketGroup title="Drafts" packets={draftPackets} onLoad={loadPacket} compact />
          <PacketGroup title="Published" packets={publishedPackets} onLoad={loadPacket} compact />
        </View>
      </Card>

      <View style={localStyles.workspace}>
        <View style={localStyles.sourceColumn}>
          <Card>
            <SectionTitle>Official SCP Material</SectionTitle>
            <Text style={styles.muted}>Open a folder to choose smaller chunks, or add/view the whole section at once.</Text>
            <View style={localStyles.weekRow}>
              <FilterChip label="All" onPress={() => setSourceFilter("all")} selected={sourceFilter === "all"} />
              <FilterChip label="Notes" onPress={() => setSourceFilter("notes")} selected={sourceFilter === "notes"} />
              <FilterChip label="Q&A" onPress={() => setSourceFilter("qa")} selected={sourceFilter === "qa"} />
            </View>
            <View style={localStyles.weekRow}>
              <FilterChip label="All Coverage" onPress={() => setCoverageFilter("all")} selected={coverageFilter === "all"} />
              <FilterChip label="Covered" onPress={() => setCoverageFilter("covered")} selected={coverageFilter === "covered"} />
              <FilterChip label="Not Covered" onPress={() => setCoverageFilter("not-covered")} selected={coverageFilter === "not-covered"} />
            </View>
            <MetaText>Covered means already published to Files. Draft packets are not counted.</MetaText>
            <ScrollView contentContainerStyle={{ gap: 8 }} style={localStyles.columnScroll}>
              {materialSections.length === 0 ? (
                <Text style={styles.muted}>No official material matches these filters.</Text>
              ) : null}
              {materialSections.map((section) => {
                const expanded = expandedSectionKeys.includes(section.key);
                const addedCount = section.chunks.filter((chunk) => selectedIds.includes(chunk.id)).length;
                const coveredCount = section.chunks.filter((chunk) => coverageByChunkId.has(chunk.id)).length;
                return (
                  <View key={section.key} style={localStyles.folderShell}>
                    <Pressable accessibilityRole="button" onPress={() => toggleSection(section.key)} style={localStyles.folderRow}>
                      <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} color={theme.colors.muted} size={18} />
                      <Ionicons name={expanded ? "folder-open-outline" : "folder-outline"} color={theme.colors.accent} size={23} />
                      <View style={localStyles.folderText}>
                        <Text style={localStyles.folderTitle}>{section.title}</Text>
                      <MetaText>
                          {section.sourceLabel} - {section.chunks.length} chunk{section.chunks.length === 1 ? "" : "s"} - {addedCount} added - {coveredCount} covered
                        </MetaText>
                      </View>
                      <View style={localStyles.folderActions}>
                      <Button label="View" onPress={() => previewWholeSection(section.key)} variant="ghost" />
                      <Button
                          label={addedCount === section.chunks.length ? "Added" : "Add Section ->"}
                          onPress={() => addSection(section.chunks)}
                          disabled={addedCount === section.chunks.length}
                          variant="secondary"
                        />
                      </View>
                    </Pressable>
                    {expanded ? (
                      <View style={localStyles.folderChildren}>
                        {section.chunks.map((chunk) => (
                          <View key={chunk.id} style={[localStyles.fileRow, selectedIds.includes(chunk.id) && localStyles.selectedFileRow]}>
                            <View style={localStyles.treeLine} />
                            <Ionicons name="document-text-outline" color={theme.colors.muted} size={19} />
                            <View style={localStyles.fileText}>
                              <Text style={localStyles.fileTitle}>{chunk.chunkTitle}</Text>
                              <MetaText>{chunk.chunkCode}{chunk.chunkSummary ? ` - ${chunk.chunkSummary}` : ""}</MetaText>
                              <CoverageLine coverage={coverageByChunkId.get(chunk.id) ?? []} />
                            </View>
                            <View style={localStyles.fileActions}>
                              <Button label={previewChunkId === chunk.id ? "Viewing" : "View"} onPress={() => toggleChunkPreview(chunk.id)} variant="ghost" />
                              <Button
                                label={selectedIds.includes(chunk.id) ? "Added" : "Add ->"}
                                onPress={() => addChunk(chunk.id)}
                                disabled={selectedIds.includes(chunk.id)}
                                variant="secondary"
                              />
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </Card>
        </View>

        <View style={localStyles.packetColumn}>
          <Card>
            <SectionTitle>My Review Packet</SectionTitle>
            <View style={localStyles.packetTopAction}>
              <Button label="New Draft" onPress={startNewDraft} variant="secondary" />
            </View>
            <Text style={styles.muted}>Selected sections. Move items up/down to control packet order.</Text>
            <View style={localStyles.titleRow}>
              <Text style={localStyles.titleLabel}>Title:</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <FormInput onChangeText={setTitle} placeholder="Packet title" value={title} />
              </View>
            </View>
            <Text style={styles.muted}>The official packet text below is controlled and cannot be edited here.</Text>
            <ScrollView contentContainerStyle={{ gap: 8 }} style={localStyles.packetScroll}>
              {packetSections.length === 0 ? <Text style={styles.muted}>Add official sections to begin the draft packet.</Text> : null}
              {packetSections.map((section, sectionIndex) => {
                const expanded = expandedPacketSectionKeys.includes(section.key);
                return (
                  <View key={section.key} style={localStyles.folderShell}>
                    <View style={localStyles.packetFolderBody}>
                      <Pressable accessibilityRole="button" onPress={() => togglePacketSection(section.key)} style={localStyles.packetFolderHeader}>
                        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} color={theme.colors.muted} size={18} />
                        <Ionicons name={expanded ? "folder-open-outline" : "folder-outline"} color={theme.colors.accent} size={23} />
                        <View style={localStyles.folderText}>
                          <Text style={localStyles.folderTitle}>{section.title}</Text>
                          <MetaText>
                            {section.sourceLabel} - {section.chunks.length} item{section.chunks.length === 1 ? "" : "s"}
                          </MetaText>
                        </View>
                      </Pressable>
                      <View style={localStyles.packetFolderActions}>
                        <Button
                          label="Up"
                          onPress={() => movePacketSection(section.key, -1)}
                          disabled={sectionIndex === 0 || activePacketStatus !== "draft"}
                          variant="ghost"
                        />
                        <Button
                          label="Down"
                          onPress={() => movePacketSection(section.key, 1)}
                          disabled={sectionIndex === packetSections.length - 1 || activePacketStatus !== "draft"}
                          variant="ghost"
                        />
                        <Button
                          label="Remove Section"
                          onPress={() => removePacketSection(section.key)}
                          disabled={activePacketStatus !== "draft"}
                          variant="ghost"
                        />
                      </View>
                    </View>
                    {expanded ? (
                      <View style={localStyles.folderChildren}>
                        {section.chunks.map((chunk, chunkIndex) => (
                          <View key={chunk.id} style={localStyles.packetFileRow}>
                            <View style={localStyles.packetFileMain}>
                              <View style={localStyles.treeLine} />
                              <Ionicons name="document-text-outline" color={theme.colors.muted} size={19} />
                              <View style={localStyles.fileText}>
                                <Text style={localStyles.fileTitle} numberOfLines={2}>{chunk.chunkTitle}</Text>
                                <MetaText>{chunk.chunkCode}</MetaText>
                              </View>
                            </View>
                            <View style={localStyles.packetFileOrderActions}>
                              <Button label={packetPreviewChunkId === chunk.id ? "Viewing" : "View"} onPress={() => previewPacketChunk(chunk.id)} variant="ghost" />
                              <Button
                                label="Up"
                                onPress={() => movePacketChunk(chunk.id, -1)}
                                disabled={chunkIndex === 0 || activePacketStatus !== "draft"}
                                variant="ghost"
                              />
                              <Button
                                label="Down"
                                onPress={() => movePacketChunk(chunk.id, 1)}
                                disabled={chunkIndex === section.chunks.length - 1 || activePacketStatus !== "draft"}
                                variant="ghost"
                              />
                              <Button label="Remove" onPress={() => removeChunk(chunk.id)} disabled={activePacketStatus !== "draft"} variant="ghost" />
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
            {uniqueSuggestedChunks.length > 0 && activePacketStatus === "draft" ? (
              <View style={localStyles.suggestionBox}>
                <MetaText>Suggested Q&A</MetaText>
                {uniqueSuggestedChunks.map((chunk) => (
                  <Row key={chunk.id}>
                    <Text style={[styles.body, { flex: 1 }]} numberOfLines={2}>{chunk.chunkCode}: {chunk.chunkTitle}</Text>
                    <Button label="Add" onPress={() => addChunk(chunk.id)} variant="secondary" />
                  </Row>
                ))}
              </View>
            ) : null}
            <View style={localStyles.publishActions}>
              <Button
                label="Preview Packet"
                onPress={() => {
                  setPreviewChunkId(null);
                  setPreviewSectionKey(null);
                  setPacketPreviewChunkId(null);
                  setPreviewingPacket(true);
                }}
                disabled={selectedChunks.length === 0}
                variant={selectedChunks.length > 0 ? "primary" : "secondary"}
              />
              <View style={localStyles.savePublishActions}>
                <View style={localStyles.packetActionButton}>
                  <Button
                    label={saving ? "Saving..." : "Save Draft"}
                    onPress={saveDraft}
                    disabled={saving || activePacketStatus !== "draft" || selectedIds.length === 0}
                    variant={selectedIds.length > 0 ? "primary" : "secondary"}
                  />
                </View>
                <View style={localStyles.packetActionButton}>
                  <Button
                    label={saving ? "Publishing..." : "Publish to Files"}
                    onPress={publishPacket}
                    disabled={saving || activePacketStatus !== "draft" || selectedIds.length === 0}
                    variant={selectedIds.length > 0 ? "primary" : "secondary"}
                  />
                </View>
              </View>
            </View>
          </Card>
        </View>

      </View>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Packet Preview</SectionTitle>
            <Text style={styles.muted}>A document-style view of what the Rabbi is preparing.</Text>
          </View>
          {selectedChunks.length > 0 ? <Pill label={`${selectedChunks.length} section${selectedChunks.length === 1 ? "" : "s"}`} /> : null}
        </Row>
        {selectedChunks.length === 0 ? <Text style={styles.muted}>Select sections to preview the packet.</Text> : null}
        {selectedChunks.length > 0 ? (
          <View style={localStyles.documentPreviewShell}>
            <View style={localStyles.documentPage}>
              <Text style={localStyles.documentPacketTitle}>{title || "Untitled Packet"}</Text>
              <Text style={localStyles.documentPacketMeta}>
                {managedChaburah?.name ?? "My Chaburah"} - Week {week}
              </Text>
              {selectedChunks.map((chunk, index) => (
                <DocumentChunk key={chunk.id} chunk={chunk} index={index} />
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(previewChunk || previewSection || packetPreviewChunk || previewingPacket)}
        onRequestClose={clearPreview}
      >
        <Pressable
          style={localStyles.previewBackdrop}
          onPress={clearPreview}
        >
          <Pressable style={localStyles.previewModal}>
            {previewChunk || previewSection || packetPreviewChunk || previewingPacket ? (
              <>
                <Row>
                  <View style={{ flex: 1, minWidth: 260 }}>
                    <MetaText>
                      {previewingPacket
                        ? `Week ${week} Review Packet`
                        : previewSection
                          ? previewSection.sourceLabel
                          : packetPreviewChunk
                            ? "My Review Packet"
                            : `${previewChunk?.chunkCode} - ${previewChunk?.sectionTitle}`}
                    </MetaText>
                    <Text style={localStyles.modalTitle}>
                      {previewingPacket
                        ? title || "Untitled Packet"
                        : previewSection
                          ? previewSection.title
                          : packetPreviewChunk
                            ? packetPreviewChunk.chunkTitle
                            : previewChunk?.chunkTitle}
                    </Text>
                  </View>
                  <Button label="Close" onPress={clearPreview} variant="secondary" />
                </Row>
                <ScrollView contentContainerStyle={localStyles.previewPageContent} style={localStyles.previewPage}>
                  <View style={localStyles.modalDocumentPage}>
                    {previewingPacket ? (
                      <>
                        <Text style={localStyles.documentPacketTitle}>{title || "Untitled Packet"}</Text>
                        <Text style={localStyles.documentPacketMeta}>
                          {managedChaburah?.name ?? "My Chaburah"} - Week {week}
                        </Text>
                      </>
                    ) : null}
                    {modalPreviewChunks.map((chunk, index) => (
                      <DocumentChunk key={chunk.id} chunk={chunk} index={index} showNumber={previewingPacket} />
                    ))}
                  </View>
                </ScrollView>
                {!previewingPacket ? (
                  <Row>
                    {previewSection ? (
                      <Button
                        label={previewSection.chunks.every((chunk) => selectedIds.includes(chunk.id)) ? "Section Added" : "Add Section to Packet ->"}
                        onPress={() => addSection(previewSection.chunks)}
                        disabled={previewSection.chunks.every((chunk) => selectedIds.includes(chunk.id))}
                      />
                    ) : previewChunk ? (
                      <>
                        <Button
                          label={selectedIds.includes(previewChunk.id) ? "Already Added" : "Add to Packet"}
                          onPress={() => addChunk(previewChunk.id)}
                          disabled={selectedIds.includes(previewChunk.id)}
                        />
                        <Button label="Previous" onPress={() => moveChunkPreview(-1)} disabled={!previousPreviewChunk} variant="secondary" />
                        <Button label="Next" onPress={() => moveChunkPreview(1)} disabled={!nextPreviewChunk} variant="secondary" />
                      </>
                    ) : packetPreviewChunk ? (
                      <>
                        <Button label="Remove from Packet" onPress={removePreviewedPacketChunk} disabled={activePacketStatus !== "draft"} variant="secondary" />
                        <Button label="Previous" onPress={() => movePacketPreview(-1)} disabled={!previousPacketPreviewChunk} variant="secondary" />
                        <Button label="Next" onPress={() => movePacketPreview(1)} disabled={!nextPacketPreviewChunk} variant="secondary" />
                      </>
                    ) : null}
                  </Row>
                ) : null}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function DocumentChunk({ chunk, index, showNumber = true }: { chunk: ContentChunk; index: number; showNumber?: boolean }) {
  const blocks = buildDocumentBlocks(chunk);
  const isQa = chunk.sourceType === "qa" || /^95-Q\d+/i.test(chunk.chunkCode);

  return (
    <View style={[localStyles.documentChunk, index === 0 && localStyles.documentChunkFirst]}>
      <MetaText>{showNumber ? `${index + 1}. ` : ""}{chunk.chunkCode}</MetaText>
      <Text style={isQa ? localStyles.documentQaTitle : localStyles.documentSectionTitle}>{chunk.chunkTitle}</Text>
      {blocks.map((block, blockIndex) => {
        if (block.kind === "question") {
          return (
            <View key={`${chunk.id}-${blockIndex}`} style={localStyles.documentQuestionBlock}>
              <Text style={localStyles.documentQuestionLabel}>{block.label}</Text>
              <Text style={localStyles.documentQuestionText}>{block.text}</Text>
            </View>
          );
        }
        if (block.kind === "answer") {
          return (
            <View key={`${chunk.id}-${blockIndex}`} style={localStyles.documentAnswerBlock}>
              <Text style={localStyles.documentAnswerLabel}>{block.label}</Text>
              <Text style={localStyles.documentAnswerText}>{block.text}</Text>
            </View>
          );
        }
        if (block.kind === "numbered" || block.kind === "bullet") {
          return (
            <View key={`${chunk.id}-${blockIndex}`} style={[localStyles.documentListRow, block.level > 0 && localStyles.documentNestedListRow]}>
              <Text style={block.kind === "numbered" ? localStyles.documentNumberMarker : localStyles.documentBulletMarker}>{block.marker}</Text>
              <View style={localStyles.documentListContent}>
                {block.lead ? <Text style={localStyles.documentListLead}>{block.lead}</Text> : null}
                <Text style={localStyles.documentListText}>{block.text}</Text>
              </View>
            </View>
          );
        }
        return (
          <Text key={`${chunk.id}-${blockIndex}`} style={localStyles.documentParagraph}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

type DocumentBlock =
  | { kind: "answer" | "question"; label: string; text: string }
  | { kind: "bullet" | "numbered"; lead?: string; level: number; marker: string; text: string }
  | { kind: "paragraph"; text: string };

function buildDocumentBlocks(chunk: ContentChunk): DocumentBlock[] {
  const paragraphs = chunk.contentMarkdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\r/g, "").trimEnd())
    .filter((paragraph) => paragraph.trim().length > 0);
  let autoNumber = 0;

  return paragraphs.map((paragraph, index) => {
    const trimmedParagraph = paragraph.trim();
    const questionMatch = trimmedParagraph.match(/^(95-Q\d+:\s*)(.*)$/i);
    const answerMatch = trimmedParagraph.match(/^(A:\s*)(.*)$/i);
    const numberedMatch = paragraph.match(/^(\s*)(\d+)[.)]\s+([\s\S]+)$/);
    const bulletMatch = paragraph.match(/^(\s*)([-*]|o)\s+([\s\S]+)$/);

    if (questionMatch) return { kind: "question", label: questionMatch[1].trim(), text: questionMatch[2].trim() };
    if (answerMatch) return { kind: "answer", label: answerMatch[1].trim(), text: answerMatch[2].trim() };
    if (numberedMatch) {
      const listText = splitListLead(normalizeB6ListText(numberedMatch[3].trim()));
      return { kind: "numbered", level: listLevel(numberedMatch[1]), marker: `${numberedMatch[2]}.`, ...listText };
    }
    if (bulletMatch) {
      const listText = splitListLead(bulletMatch[3].trim());
      return { kind: "bullet", level: listLevel(bulletMatch[1]), marker: bulletMatch[2] === "o" ? "o" : "-", ...listText };
    }

    if (chunk.chunkCode === "95-B6" && index > 0) {
      autoNumber += 1;
      const listText = splitListLead(normalizeB6ListText(trimmedParagraph));
      return { kind: "numbered", level: 0, marker: `${autoNumber}.`, ...listText };
    }
    if (chunk.chunkCode === "95-B9" && index > 0) {
      const isNested = /^Gra\s|^חכ״א\s/.test(trimmedParagraph);
      const listText = splitListLead(trimmedParagraph);
      return { kind: "bullet", level: isNested ? 1 : 0, marker: isNested ? "o" : "-", ...listText };
    }

    return { kind: "paragraph", text: trimmedParagraph };
  });
}

function listLevel(indent: string) {
  return indent.replace(/\t/g, "  ").length >= 2 ? 1 : 0;
}

function normalizeB6ListText(text: string) {
  return text
    .replace(/^ריב״ןquoting/, "ריב״ן - quoting")
    .replace(/^ספר התרומה, רא״ש וטור–/, "ספר התרומה, רא״ש וטור - ")
    .replace(/^רמב״ם –/, "רמב״ם - ")
    .replace(/^איסור והיתר\(quoted by the דרכי משה\) –/, "איסור והיתר (quoted by the דרכי משה) - ");
}

function splitListLead(text: string) {
  const match = text.match(/^(.{1,70}?)(?:\s+[–-]\s*|[–-]\s+)([\s\S]+)$/);
  if (!match) return { text };
  return {
    lead: match[1].trim(),
    text: match[2].trim()
  };
}

function PacketGroup({
  compact = false,
  title,
  packets,
  onLoad
}: {
  compact?: boolean;
  title: string;
  packets: PacketListItem[];
  onLoad: (packet: PacketListItem) => void;
}) {
  return (
    <View style={[{ gap: 8 }, compact && localStyles.existingPacketGroup]}>
      <Row>
        <Text style={localStyles.groupTitle}>{title}</Text>
        <Pill label={`${packets.length}`} />
      </Row>
      {packets.length === 0 ? <Text style={styles.muted}>No {title.toLowerCase()} for this week.</Text> : null}
      <View style={compact ? localStyles.existingPacketList : { gap: 10 }}>
        {packets.map((packet) => (
          <View key={packet.id} style={[localStyles.packetListRow, compact && localStyles.compactPacketListRow]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.body} numberOfLines={2}>{packet.title}</Text>
              <MetaText>{packet.itemCount} sections</MetaText>
            </View>
            <Button label="Open" onPress={() => onLoad(packet)} variant="secondary" />
          </View>
        ))}
      </View>
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

function CoverageLine({ coverage }: { coverage: ReviewPacketCoverage[] }) {
  if (coverage.length === 0) return null;
  return (
    <View style={localStyles.coveragePills}>
      {coverage.map((item) => (
        <Pill key={`${item.packetId}-${item.chunkId}`} label={`Covered Week ${item.week}`} tone="success" />
      ))}
    </View>
  );
}

function groupChunksBySection(chunks: ContentChunk[]) {
  const sectionMap = new Map<
    string,
    {
      chunks: ContentChunk[];
      key: string;
      sourceLabel: string;
      title: string;
    }
  >();

  chunks.forEach((chunk) => {
    const sectionCodeMatch = chunk.chunkCode.match(/^95-([A-Z])/);
    const sectionCode = chunk.sourceType === "qa" ? "Q&A" : sectionCodeMatch?.[1] ?? chunk.sectionKey.toUpperCase();
    const key = `${chunk.sourceType}-${sectionCode}`;
    const existing = sectionMap.get(key);
    if (existing) {
      existing.chunks.push(chunk);
      return;
    }
    sectionMap.set(key, {
      chunks: [chunk],
      key,
      sourceLabel: chunk.sourceType === "qa" ? "Q&A folder" : "Notes folder",
      title: chunk.sourceType === "qa" ? "Q&A - Siman 95" : `Section ${sectionCode} - ${chunk.sectionTitle}`
    });
  });

  return Array.from(sectionMap.values()).map((section) => ({
    ...section,
    chunks: section.chunks.sort((a, b) => a.sortOrder - b.sortOrder)
  }));
}

function groupSelectedChunksBySection(chunks: ContentChunk[]) {
  const sectionMap = new Map<
    string,
    {
      chunks: ContentChunk[];
      key: string;
      sourceLabel: string;
      title: string;
    }
  >();

  chunks.forEach((chunk) => {
    const key = sectionKeyForChunk(chunk);
    const existing = sectionMap.get(key);
    if (existing) {
      existing.chunks.push(chunk);
      return;
    }
    sectionMap.set(key, {
      chunks: [chunk],
      key,
      sourceLabel: chunk.sourceType === "qa" ? "Q&A folder" : "Notes folder",
      title: sectionTitleForChunk(chunk)
    });
  });

  return Array.from(sectionMap.values());
}

function sectionKeyForChunk(chunk: ContentChunk) {
  const sectionCodeMatch = chunk.chunkCode.match(/^95-([A-Z])/);
  const sectionCode = chunk.sourceType === "qa" ? "Q&A" : sectionCodeMatch?.[1] ?? chunk.sectionKey.toUpperCase();
  return `${chunk.sourceType}-${sectionCode}`;
}

function sectionTitleForChunk(chunk: ContentChunk) {
  const sectionCodeMatch = chunk.chunkCode.match(/^95-([A-Z])/);
  const sectionCode = chunk.sourceType === "qa" ? "Q&A" : sectionCodeMatch?.[1] ?? chunk.sectionKey.toUpperCase();
  return chunk.sourceType === "qa" ? "Q&A - Siman 95" : `Section ${sectionCode} - ${chunk.sectionTitle}`;
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

function mapCoverage(row: any): ReviewPacketCoverage {
  return {
    chaburahId: row.chaburah_id,
    week: row.week,
    packetId: row.packet_id,
    packetTitle: row.packet_title,
    chunkId: row.chunk_id,
    chunkCode: row.chunk_code,
    sectionKey: row.section_key,
    sectionTitle: row.section_title,
    sourceType: row.source_type,
    publishedAt: row.published_at ?? undefined
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
    gap: theme.spacing.sm,
    width: "100%"
  },
  sourceColumn: {
    flex: 1.15,
    minWidth: 0
  },
  packetColumn: {
    flex: 1,
    minWidth: 0
  },
  columnScroll: {
    maxHeight: 560
  },
  packetScroll: {
    maxHeight: 430
  },
  packetTopAction: {
    alignSelf: "flex-start",
    minWidth: 130
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  titleLabel: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23
  },
  weekRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  folderShell: {
    backgroundColor: "#FBFDFF",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    overflow: "hidden"
  },
  folderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm
  },
  folderText: {
    flex: 1,
    minWidth: 0
  },
  folderTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19
  },
  folderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    minWidth: 154
  },
  packetFolderBody: {
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm
  },
  packetFolderHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 38
  },
  packetFolderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start"
  },
  folderChildren: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: 2,
    paddingBottom: 6,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    paddingTop: 6
  },
  fileRow: {
    alignItems: "center",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: 8,
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  fileText: {
    flex: 1,
    minWidth: 0
  },
  selectedFileRow: {
    backgroundColor: theme.colors.primarySoft
  },
  treeLine: {
    alignSelf: "stretch",
    borderLeftColor: theme.colors.border,
    borderLeftWidth: 2,
    width: 10
  },
  fileTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  fileActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    minWidth: 136
  },
  packetFileRow: {
    borderRadius: theme.radius.sm,
    gap: 6,
    minHeight: 70,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  packetFileMain: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
    width: "100%"
  },
  packetFileActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    justifyContent: "flex-end"
  },
  packetFileOrderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
    paddingLeft: 36
  },
  coveragePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 4
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
  chunkTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19
  },
  packetItem: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm
  },
  packetTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18
  },
  itemActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
    minWidth: 126
  },
  publishActions: {
    alignItems: "stretch",
    gap: 8
  },
  savePublishActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  packetActionButton: {
    flex: 1,
    minWidth: 150
  },
  suggestionBox: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: "#F2D37A",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 8,
    padding: theme.spacing.sm
  },
  existingPacketBands: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  },
  existingPacketGroup: {
    flexBasis: 360,
    flexGrow: 1
  },
  existingPacketList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
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
  compactPacketListRow: {
    flexBasis: 260,
    flexGrow: 1
  },
  documentPreviewShell: {
    alignItems: "center",
    backgroundColor: "#EEF2F7",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg
  },
  documentPage: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8DEE8",
    borderRadius: 3,
    borderWidth: 1,
    maxWidth: 820,
    paddingHorizontal: 52,
    paddingVertical: 44,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: "100%"
  },
  documentPacketTitle: {
    color: theme.colors.ink,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 32,
    textAlign: "center"
  },
  documentPacketMeta: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    textAlign: "center"
  },
  documentChunk: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: 8,
    paddingTop: theme.spacing.lg,
    marginTop: theme.spacing.lg
  },
  documentChunkFirst: {
    borderTopWidth: 0,
    marginTop: 0,
    paddingTop: 0
  },
  documentSectionTitle: {
    color: theme.colors.ink,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25,
    textAlign: "left",
    writingDirection: "ltr"
  },
  documentQaTitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    textAlign: "left",
    writingDirection: "ltr"
  },
  documentParagraph: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 25,
    textAlign: "left",
    writingDirection: "ltr"
  },
  documentListRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm
  },
  documentNestedListRow: {
    paddingLeft: theme.spacing.xl
  },
  documentNumberMarker: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 25,
    minWidth: 28,
    textAlign: "right"
  },
  documentBulletMarker: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    minWidth: 28,
    textAlign: "right"
  },
  documentListContent: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  documentListLead: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "left",
    writingDirection: "ltr"
  },
  documentListText: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 25,
    textAlign: "left",
    writingDirection: "ltr"
  },
  documentQuestionBlock: {
    backgroundColor: "#F8FAFC",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: 4,
    padding: theme.spacing.sm
  },
  documentQuestionLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    textTransform: "uppercase"
  },
  documentQuestionText: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 23,
    textAlign: "left",
    writingDirection: "ltr"
  },
  documentAnswerBlock: {
    borderLeftColor: theme.colors.accent,
    borderLeftWidth: 3,
    gap: 3,
    paddingLeft: theme.spacing.sm
  },
  documentAnswerLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    textTransform: "uppercase"
  },
  documentAnswerText: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "left",
    writingDirection: "ltr"
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
  modalChunkBlock: {
    gap: theme.spacing.sm
  },
  modalChunkTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  previewPage: {
    backgroundColor: "#EEF2F7",
    borderColor: theme.colors.border,
    borderRadius: 4,
    borderWidth: 1,
    maxHeight: 560
  },
  previewPageContent: {
    alignItems: "center",
    paddingHorizontal: 34,
    paddingVertical: 34
  },
  modalDocumentPage: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8DEE8",
    borderRadius: 3,
    borderWidth: 1,
    maxWidth: 760,
    paddingHorizontal: 48,
    paddingVertical: 42,
    width: "100%"
  },
  previewParagraph: {
    color: theme.colors.ink,
    fontSize: 16,
    lineHeight: 27
  }
});
