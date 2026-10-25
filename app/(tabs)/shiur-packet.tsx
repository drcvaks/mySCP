import { useEffect, useRef, useState } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Card, MetaText, Pill, Row, Screen, SectionTitle, StatusBanner, styles } from "../../src/shared/components";
import { supabase } from "../../src/lib/supabase";
import { formatSupabaseError } from "../../src/lib/errors";
import { theme } from "../../src/shared/theme";
import { ContentChunk, ReviewPacket } from "../../src/shared/types";
import { printPacket } from "../../src/shared/packetPrint";
import { includesChunkHeading } from "../../src/shared/packetHeadings";
import { useAppState } from "../../src/state/AppState";
import { programName, SUMMER_PROGRAM } from "../../src/shared/learningPrograms";
import { readRichContent } from "../../src/shared/documentContent";
import { ImportDocument } from "../../src/shared/ImportDocument";
import { chunkDisplayCode } from "../../src/shared/chunkLabels";
import { PacketDocumentHeader } from "../../src/shared/PacketDocumentHeader";
import { loadMaterialLanguage, materialLanguageName, materialTextStyle } from "../../src/shared/materialLanguages";

export default function ShiurPacketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const packetId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [packet, setPacket] = useState<ReviewPacket | null>(null);
  const { programs } = useAppState();
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const loadSequence = useRef(0);

  useEffect(() => {
    void loadPacket();
    return () => { loadSequence.current++; };
  }, [packetId]);

  async function loadPacket() {
    const sequence = ++loadSequence.current;
    setPacket(null); setChunks([]);
    if (!packetId) {
      setMessage("Packet not found.");
      return;
    }
    setLoading(true);
    setMessage("");
    const packetResult = await supabase.from("review_packets").select("*").eq("id", packetId).single();
    if (sequence !== loadSequence.current) return;
    if (packetResult.error || !packetResult.data) {
      setLoading(false);
      setMessage(formatSupabaseError(packetResult.error ?? new Error("Packet not found.")));
      return;
    }

    const itemsResult = await supabase
      .from("review_packet_items")
      .select("sort_order, content_chunks(*)")
      .eq("packet_id", packetId)
      .order("sort_order");
    if (sequence !== loadSequence.current) return;
    if (itemsResult.error) {
      setLoading(false);
      setMessage(formatSupabaseError(itemsResult.error));
      return;
    }

    const savedPacket = mapPacket(packetResult.data);
    try {
      const localized = await loadMaterialLanguage((itemsResult.data ?? []).map((item: any) => item.content_chunks).filter(Boolean).map(mapContentChunk), savedPacket.language ?? "en", true);
      if (sequence !== loadSequence.current) return;
      setPacket(savedPacket); setChunks(localized);
    } catch (error) { if (sequence === loadSequence.current) setMessage(error instanceof Error ? error.message : "Unable to load packet language."); }
    if (sequence === loadSequence.current) setLoading(false);
  }

  async function printCurrentPacket() {
    if (!packet || chunks.length === 0) return;
    const printError = await printPacket({
      language: packet.language,
      chunkHeadingOptions: packet.chunkHeadingOptions,
      chunks,
      meta: `${programName(packet.programId, programs)} - ${packet.siman} - Week ${packet.week}`,
      title: packet.title
    });
    if (printError) setMessage(printError);
  }

  return (
    <Screen title="Review Packet" eyebrow="Shiur Builder" onRefresh={loadPacket} refreshing={loading}>
      <StatusBanner message={message} tone={message ? "error" : "info"} />
      <View style={localStyles.navigationRow}>
        <Button label="< Back to Files" onPress={() => router.push("/(tabs)/files")} variant="ghost" />
      </View>
      {packet ? (
        <Card>
          <PacketDocumentHeader language={packet.language} title={packet.title} meta={packet.siman} />
          <Row>
            <Pill label={`Week ${packet.week}`} tone="primary" />
            <Pill label={programName(packet.programId, programs)} />
            <Pill label={materialLanguageName(packet.language)} />
            <Pill label={packet.status === "published" ? "Published" : "Draft"} tone={packet.status === "published" ? "success" : "accent"} />
            <Button label="Print" onPress={printCurrentPacket} disabled={chunks.length === 0} />
          </Row>
        </Card>
      ) : null}

      {chunks.length === 0 && !message ? (
        <Card>
          <SectionTitle>No Packet Items</SectionTitle>
          <Text style={styles.muted}>This packet does not have any official material attached yet.</Text>
        </Card>
      ) : null}

      {chunks.map((chunk, index) => (
        <Card key={chunk.id}>
          <MetaText>{index + 1}. {chunkDisplayCode(chunk.chunkCode)}</MetaText>
          {includesChunkHeading(chunk, packet?.chunkHeadingOptions) ? <Text style={[localStyles.chunkTitle, materialTextStyle(chunk.language)]}>{chunk.chunkTitle}</Text> : null}
          <PacketChunkContent chunk={chunk} />
        </Card>
      ))}
    </Screen>
  );
}

function PacketChunkContent({ chunk }: { chunk: ContentChunk }) {
  if (chunk.contentDocument) return <ImportDocument language={chunk.language} blocks={chunk.contentDocument.blocks} footnotes={chunk.contentDocument.footnotes} compactSources={chunk.sourceType === "source"} />;
  const blocks = chunk.contentMarkdown
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\r/g, "").trim())
    .filter(Boolean);

  return (
    <View style={{ gap: 12 }}>
      {blocks.map((block, index) => {
        const imageMatch = block.match(/^!\[(.*?)\]\((data:image\/[^)]+)\)$/);
        if (imageMatch) {
          if (chunk.sourceType === "source" && Platform.OS === "web") return <ImportDocument key={`${chunk.id}-${index}`} compactSources blocks={[{ kind: "image", paragraph: index, uri: imageMatch[2], alt: imageMatch[1] }]} />;
          return <PacketImage key={`${chunk.id}-${index}`} alt={imageMatch[1]} uri={imageMatch[2]} />;
        }
        return (
          <Text key={`${chunk.id}-${index}`} style={localStyles.chunkBody}>
            {block}
          </Text>
        );
      })}
    </View>
  );
}

function PacketImage({ alt, uri }: { alt: string; uri: string }) {
  return (
    <ScrollView horizontal style={localStyles.imageScroll}>
      <Image accessibilityLabel={alt} resizeMode="contain" source={{ uri }} style={localStyles.packetImage} />
    </ScrollView>
  );
}

function mapPacket(row: any): ReviewPacket {
  return {
    language: row.language ?? "en",
    chunkHeadingOptions: row.chunk_heading_options ?? {},
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
    language: row.language ?? "en",
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

const localStyles = StyleSheet.create({
  navigationRow: {
    alignItems: "flex-start"
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
