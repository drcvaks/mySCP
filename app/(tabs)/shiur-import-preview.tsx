import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, MetaText, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { shiurImportPreviewMarkdown, shiurImportPreviewTitle } from "../../src/data/shiurImportPreview";

type MarkdownBlock =
  | { kind: "bullet"; level: number; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "table"; rows: string[][] };

export default function ShiurImportPreviewScreen() {
  const blocks = parseMarkdownPreview(shiurImportPreviewMarkdown);
  const tableCount = blocks.filter((block) => block.kind === "table").length;
  const footnoteCount = blocks.filter((block) => block.kind === "paragraph" && /^\[\^\d+\]:/.test(block.text)).length;

  return (
    <Screen title="Shiur Import Preview" eyebrow="Rabbi Hub">
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 240 }}>
            <SectionTitle>{shiurImportPreviewTitle}</SectionTitle>
            <Text style={styles.muted}>Local preview only. This does not read from or write to Supabase.</Text>
          </View>
          <Pill label={`${blocks.length} blocks`} />
          <Pill label={`${footnoteCount} notes`} tone="accent" />
          <Pill label={`${tableCount} table${tableCount === 1 ? "" : "s"}`} tone="primary" />
        </Row>
      </Card>

      <Card>
        <View style={localStyles.previewShell}>
          <View style={localStyles.documentPage}>
            {blocks.map((block, index) => (
              <MarkdownPreviewBlock key={index} block={block} />
            ))}
          </View>
        </View>
      </Card>
    </Screen>
  );
}

function MarkdownPreviewBlock({ block }: { block: MarkdownBlock }) {
  if (block.kind === "heading") {
    return <Text style={block.level === 1 ? localStyles.title : localStyles.heading}>{block.text}</Text>;
  }
  if (block.kind === "bullet") {
    const lead = splitLead(block.text);
    return (
      <View style={[localStyles.bulletRow, block.level > 0 && localStyles.nestedBulletRow]}>
        <Text style={localStyles.bulletMarker}>{block.level > 0 ? "o" : "-"}</Text>
        <View style={localStyles.bulletContent}>
          {lead.lead ? <Text style={localStyles.bulletLead}>{lead.lead}</Text> : null}
          <Text style={localStyles.paragraph}>{lead.text}</Text>
        </View>
      </View>
    );
  }
  if (block.kind === "table") {
    return <MarkdownTable rows={block.rows} />;
  }
  const footnote = block.text.match(/^\[\^(\d+)\]:\s+([\s\S]+)$/);
  if (footnote) {
    return (
      <View style={localStyles.noteRow}>
        <Text style={localStyles.noteMarker}>[{footnote[1]}]</Text>
        <Text style={localStyles.noteText}>{footnote[2]}</Text>
      </View>
    );
  }
  return <Text style={localStyles.paragraph}>{block.text}</Text>;
}

function MarkdownTable({ rows }: { rows: string[][] }) {
  return (
    <ScrollView horizontal style={localStyles.tableScroll}>
      <View style={localStyles.table}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={[localStyles.tableRow, rowIndex === 0 && localStyles.tableHeaderRow]}>
            {row.map((cell, cellIndex) => (
              <View key={`${rowIndex}-${cellIndex}`} style={[localStyles.tableCell, cellIndex === 0 && localStyles.caseCell]}>
                <Text style={[localStyles.tableText, rowIndex === 0 && localStyles.tableHeaderText]}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function parseMarkdownPreview(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replace(/\r/g, "").split("\n");
  let paragraph: string[] = [];
  let table: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  }

  function flushTable() {
    if (table.length > 0) {
      const rows = table
        .filter((line) => !/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line.trim()))
        .map((line) =>
          line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim())
        );
      if (rows.length > 0) blocks.push({ kind: "table", rows });
      table = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^(\s*)-\s+(.+)$/);

    if (!trimmed) {
      flushParagraph();
      flushTable();
      continue;
    }
    if (trimmed.startsWith("<!--") || trimmed.startsWith("{") || trimmed.startsWith("-->")) {
      flushParagraph();
      flushTable();
      continue;
    }
    if (trimmed.includes("|") && trimmed.startsWith("|")) {
      flushParagraph();
      table.push(trimmed);
      continue;
    }
    flushTable();
    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: "bullet", level: bullet[1].length >= 2 ? 1 : 0, text: bullet[2] });
      continue;
    }
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushTable();
  return blocks;
}

function splitLead(text: string) {
  const match = text.match(/^(.{1,70}?)(?:\s+[–-]\s*|[–-]\s+)([\s\S]+)$/);
  if (!match) return { text };
  return { lead: match[1].trim(), text: match[2].trim() };
}

const localStyles = StyleSheet.create({
  previewShell: {
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
    maxWidth: 900,
    paddingHorizontal: 52,
    paddingVertical: 44,
    width: "100%"
  },
  title: {
    color: theme.colors.ink,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: theme.spacing.md,
    textAlign: "center"
  },
  heading: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    textAlign: "left",
    writingDirection: "ltr"
  },
  paragraph: {
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 25,
    textAlign: "left",
    writingDirection: "ltr"
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    paddingLeft: theme.spacing.md
  },
  nestedBulletRow: {
    paddingLeft: theme.spacing.xl
  },
  bulletMarker: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 24,
    minWidth: 24,
    textAlign: "right"
  },
  bulletContent: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  bulletLead: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "left",
    writingDirection: "ltr"
  },
  tableScroll: {
    marginVertical: theme.spacing.md
  },
  table: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    borderLeftColor: theme.colors.border,
    borderLeftWidth: 1,
    minWidth: 900
  },
  tableRow: {
    flexDirection: "row"
  },
  tableHeaderRow: {
    backgroundColor: "#F1F5F9"
  },
  tableCell: {
    borderRightColor: theme.colors.border,
    borderRightWidth: 1,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: 136
  },
  caseCell: {
    width: 84
  },
  tableText: {
    color: theme.colors.ink,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    writingDirection: "ltr"
  },
  tableHeaderText: {
    fontWeight: "900"
  },
  noteRow: {
    alignItems: "flex-start",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    paddingTop: 6
  },
  noteMarker: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
    minWidth: 32,
    textAlign: "right"
  },
  noteText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    minWidth: 0,
    textAlign: "left",
    writingDirection: "ltr"
  }
});
