import { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatSupabaseError } from "../lib/errors";
import { supabase } from "../lib/supabase";
import { ContentChunk, ReviewPacket } from "./types";
import { printPacket } from "./packetPrint";
import { Button, MetaText, Pill, Row, SectionTitle, StatusBanner, styles } from "./components";
import { theme } from "./theme";
import { useAppState } from "../state/AppState";
import { programName, SUMMER_PROGRAM } from "./learningPrograms";
import { readRichContent } from "./documentContent";
import { ImportDocument } from "./ImportDocument";

export function PacketPreviewModal({
  packetId,
  visible,
  onClose
}: {
  packetId?: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [packet, setPacket] = useState<ReviewPacket | null>(null);
  const { programs } = useAppState();
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !packetId) return;
    void loadPacket(packetId);
  }, [packetId, visible]);

  async function loadPacket(targetPacketId: string) {
    setLoading(true);
    setMessage("");
    const packetResult = await supabase.from("review_packets").select("*").eq("id", targetPacketId).single();
    if (packetResult.error || !packetResult.data) {
      setLoading(false);
      setMessage(formatSupabaseError(packetResult.error ?? new Error("Packet not found.")));
      return;
    }

    const itemsResult = await supabase
      .from("review_packet_items")
      .select("sort_order, content_chunks(*)")
      .eq("packet_id", targetPacketId)
      .order("sort_order");
    setLoading(false);
    if (itemsResult.error) {
      setMessage(formatSupabaseError(itemsResult.error));
      return;
    }

    setPacket(mapPacket(packetResult.data));
    setChunks(
      (itemsResult.data ?? [])
        .map((item: any) => item.content_chunks)
        .filter(Boolean)
        .map(mapContentChunk)
    );
  }

  function closePreview() {
    setPacket(null);
    setChunks([]);
    setMessage("");
    onClose();
  }

  async function printCurrentPacket() {
    if (!packet || chunks.length === 0) return;
    const printError = await printPacket({
      chunks,
      meta: `${programName(packet.programId, programs)} - ${packet.siman} - Week ${packet.week}`,
      title: packet.title
    });
    if (printError) setMessage(printError);
  }

  return (
    <Modal animationType="fade" onRequestClose={closePreview} transparent visible={visible}>
      <Pressable onPress={closePreview} style={modalStyles.backdrop}>
        <Pressable style={modalStyles.modal}>
          <Row>
            <View style={{ flex: 1, minWidth: 240 }}>
              <MetaText>Packet Preview</MetaText>
              <SectionTitle>{packet?.title ?? (loading ? "Loading packet..." : "Review Packet")}</SectionTitle>
              {packet ? <Text style={styles.muted}>{packet.siman}</Text> : null}
            </View>
            {packet ? <Pill label={`Week ${packet.week}`} tone="primary" /> : null}
            {packet ? <Pill label={programName(packet.programId, programs)} /> : null}
            {packet ? (
              <Pill label={packet.status === "published" ? "Published" : "Draft"} tone={packet.status === "published" ? "success" : "accent"} />
            ) : null}
            <Button label="Print" onPress={printCurrentPacket} disabled={!packet || chunks.length === 0} />
            <Button label="Close" onPress={closePreview} variant="secondary" />
          </Row>
          <StatusBanner message={message} tone="error" />
          {chunks.length === 0 && !loading && !message ? (
            <Text style={styles.muted}>This packet does not have any official material attached yet.</Text>
          ) : null}
          <ScrollView contentContainerStyle={modalStyles.pageContent} style={modalStyles.pageShell}>
            {chunks.map((chunk, index) => (
              <View key={chunk.id} style={modalStyles.chunk}>
                <MetaText>{index + 1}. {chunk.chunkCode}</MetaText>
                <Text style={modalStyles.chunkTitle}>{chunk.chunkTitle}</Text>
                <PacketChunkContent chunk={chunk} />
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PacketChunkContent({ chunk }: { chunk: ContentChunk }) {
  if (chunk.contentDocument) return <ImportDocument blocks={chunk.contentDocument.blocks} footnotes={chunk.contentDocument.footnotes} />;
  const blocks = chunk.contentMarkdown
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\r/g, "").trim())
    .filter(Boolean);

  return (
    <View style={{ gap: 12 }}>
      {blocks.map((block, index) => {
        const imageMatch = block.match(/^!\[(.*?)\]\((data:image\/[^)]+)\)$/);
        if (imageMatch) {
          return <PacketImage key={`${chunk.id}-${index}`} alt={imageMatch[1]} uri={imageMatch[2]} />;
        }
        return (
          <Text key={`${chunk.id}-${index}`} style={modalStyles.chunkBody}>
            {block}
          </Text>
        );
      })}
    </View>
  );
}

function PacketImage({ alt, uri }: { alt: string; uri: string }) {
  return (
    <ScrollView horizontal style={modalStyles.imageScroll}>
      <Image accessibilityLabel={alt} resizeMode="contain" source={{ uri }} style={modalStyles.packetImage} />
    </ScrollView>
  );
}

function mapPacket(row: any): ReviewPacket {
  return {
    programId: row.program_id ?? SUMMER_PROGRAM,
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

function mapContentChunk(row: any): ContentChunk {
  return {
    contentDocument: readRichContent(row.content_document),
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

const modalStyles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.md
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.md,
    maxHeight: "92%",
    maxWidth: 1120,
    padding: theme.spacing.lg,
    width: "100%"
  },
  pageShell: {
    backgroundColor: "#EEF2F7",
    borderColor: theme.colors.border,
    borderRadius: 4,
    borderWidth: 1,
    maxHeight: 640
  },
  pageContent: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  chunk: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8DEE8",
    borderRadius: 3,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 34,
    paddingVertical: 28
  },
  chunkTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26
  },
  chunkBody: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 24
  },
  imageScroll: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1
  },
  packetImage: {
    backgroundColor: theme.colors.surface,
    height: 420,
    width: 720
  }
});
