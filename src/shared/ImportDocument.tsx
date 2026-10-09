import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Platform, StyleSheet, Text, View } from "react-native";
import { isolateImportSpans, paragraphLayout, paragraphSpans, RichContentDocument, safeImageUri, safeLinkUri } from "./documentContent";
import { resolveDocumentAssets } from "./documentAssets";
import { renderRichDocument } from "./richDocumentHtml";
import { compactSourceDocument } from "./sourceSheetLayout";

export interface ImportSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  footnote?: number;
  href?: string;
}

export interface ImportBlock {
  kind: string;
  paragraph: number;
  text?: string;
  spans?: ImportSpan[];
  marker?: string;
  level?: number;
  indent?: number;
  firstLine?: number;
  hanging?: number;
  rightIndent?: number;
  defaultTabWidth?: number;
  tabStops?: { position: number; alignment: string; leader?: string }[];
  leadingTabs?: number;
  alignment?: "left" | "right" | "center";
  rtl?: boolean;
  uri?: string;
  storagePath?: string;
  alt?: string;
  width?: number;
  height?: number;
  displayWidth?: number;
}

export interface ImportChunk {
  code: string;
  title: string;
  summary: string;
  section: string;
  sectionTitle: string;
  sourceType: string;
  paragraphStart: number;
  paragraphEnd: number;
  officialShiur?: number;
  estimatedMinutes?: number;
  sourceFile: string;
  sourceNumbers: number[];
  relatedQa?: string[];
  relatedNotes?: string[];
  relatedSources?: string[];
  sourceNumber?: number;
  pdfPage?: number;
  blocks: ImportBlock[];
  footnotes: { id: number; blocks: ImportBlock[] }[];
}

export { isolateImportSpans } from "./documentContent";

const emptyFootnotes: ImportChunk["footnotes"] = [];

export function ImportDocument({ blocks, footnotes = emptyFootnotes, compactSources = false }: { blocks: ImportBlock[]; footnotes?: ImportChunk["footnotes"]; compactSources?: boolean }) {
  const document = useMemo<RichContentDocument>(() => ({ version: 1, blocks, footnotes }), [blocks, footnotes]);
  const [resolved, setResolved] = useState<RichContentDocument | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setResolved(null);
    setError("");
    void resolveDocumentAssets([document]).then(async ([doc]) => {
      const displayed = compactSources ? await compactSourceDocument(doc) : doc;
      if (active) setResolved(displayed);
    })
      .catch(() => { if (active) setError("Unable to load official images. Please refresh and try again."); });
    return () => { active = false; };
  }, [document, compactSources]);
  if (error) return <Text>{error}</Text>;
  if (!resolved) return <Text>Loading material...</Text>;
  if (Platform.OS === "web") {
    return <View style={[s.page, compactSources && { padding: 0 }]}><div style={{ width: "100%", minWidth: 0, fontSize: 16 }}
      dangerouslySetInnerHTML={{ __html: renderRichDocument(resolved) }} /></View>;
  }
  return (
    <View style={s.page}>
      {resolved.blocks.map((block, index) => <DocumentBlock key={index} block={block} />)}
      {resolved.footnotes.length ? (
        <View style={s.footnotes}>
          <Text style={s.noteHeading}>Source Notes</Text>
          {resolved.footnotes.map((note) => (
            <View key={note.id} style={s.noteRow}>
              <Text style={s.noteMarker}>[{note.id}]</Text>
              <View style={s.grow}>{note.blocks.map((block, index) => <DocumentBlock key={index} block={block} small />)}</View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DocumentBlock({ block, small = false }: { block: ImportBlock; small?: boolean }) {
  if (block.kind === "image" && safeImageUri(block.uri)) {
    return (
      <View style={s.imageWrap}>
        <Image accessibilityLabel={block.alt} source={{ uri: block.uri }} resizeMode="contain"
          style={{ width: "100%", maxWidth: block.displayWidth ?? block.width ?? 600,
            aspectRatio: (block.width ?? 1) / (block.height ?? 1) }} />
      </View>
    );
  }
  const list = block.kind === "list" || block.kind === "question";
  const heading = block.kind === "heading";
  const layout = paragraphLayout(block);
  // A separate marker keeps initial Hebrew text from reordering the list number.
  const text = (
    <Text style={[s.paragraph, small && s.small, heading && s.heading, block.kind === "question" && s.question,
      { textAlign: block.alignment ?? "left", writingDirection: block.rtl ? "rtl" : "ltr" }]}>
      {heading && block.marker ? `${block.marker} ` : ""}
      {layout.firstLine > 0 && !list ? "\u2003".repeat(Math.round(layout.firstLine / 12)) : ""}
      {isolateImportSpans(paragraphSpans(block)).map((span, index) => (
        <Text key={index} onPress={safeLinkUri(span.href) ? () => { void Linking.openURL(span.href!); } : undefined} style={{ fontWeight: span.bold ? "700" : span.bold === false ? "400" : undefined,
          fontStyle: span.italic ? "italic" : span.italic === false ? "normal" : undefined,
          textDecorationLine: span.underline ? "underline" : span.underline === false ? "none" : undefined,
          color: /^#[A-Fa-f0-9]{6}$/.test(span.color ?? "") ? span.color : undefined, fontSize: span.footnote ? (small ? 10 : 11) : undefined }}>
          {span.text}
        </Text>
      ))}
    </Text>
  );
  if (list) {
    return (
      <View style={[s.list, { marginLeft: block.indent ? Math.max(0, block.indent - (block.hanging ?? 18)) * 4 / 3 : 16 + (block.level ?? 0) * 22 }]}>
        <Text style={[s.marker, small && s.small]}>{block.marker}</Text>
        <View style={s.grow}>{text}</View>
      </View>
    );
  }
  return <View style={{ marginLeft: layout.indent * 4 / 3, marginRight: (block.rightIndent ?? 0) * 4 / 3 }}>{text}</View>;
}

const s = StyleSheet.create({
  page: { width: "100%", maxWidth: 880, alignSelf: "center", backgroundColor: "#FFFFFF", padding: 24, gap: 14 },
  paragraph: { color: "#172033", fontSize: 16, lineHeight: 27, textAlign: "left", writingDirection: "ltr" },
  small: { fontSize: 12, lineHeight: 20 },
  heading: { fontSize: 18, lineHeight: 28, fontWeight: "700", marginTop: 8 },
  question: { fontWeight: "600" },
  list: { flexDirection: "row", gap: 10, alignItems: "flex-start", minWidth: 0 },
  marker: { width: 26, fontSize: 15, lineHeight: 27, color: "#172033", textAlign: "right", writingDirection: "ltr" },
  grow: { flex: 1, minWidth: 0, gap: 6 },
  imageWrap: { width: "100%", alignItems: "center", marginVertical: 8 },
  footnotes: { borderTopWidth: 1, borderTopColor: "#CBD5E1", paddingTop: 14, gap: 12 },
  noteHeading: { fontSize: 13, fontWeight: "700", color: "#475569" },
  noteRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  noteMarker: { fontSize: 12, lineHeight: 20, color: "#475569", width: 30, writingDirection: "ltr" }
});
