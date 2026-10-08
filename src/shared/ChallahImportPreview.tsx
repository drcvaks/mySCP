import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import fixture from "../data/challahImportPreview.json";
import { Button, Card, MetaText, Pill, Row, SectionTitle, styles } from "./components";
import { ImportBlock, ImportChunk, ImportDocument } from "./ImportDocument";
import { theme } from "./theme";
import { printPacket } from "./packetPrint";
import { ContentChunk, ContentSourceType } from "./types";

const originalChunks = fixture.chunks as ImportChunk[];
const chunks = originalChunks.map((c) => {
  if (c.sourceType !== "qa") return c;
  const note = originalChunks.find((n) => n.code === c.relatedNotes?.[0]);
  return { ...c, section: note?.section ?? "QA", sectionTitle: note?.sectionTitle ?? "Questions & Answers" };
});
const pace = fixture.pace as ImportBlock[];
type Category = "notes" | "qa" | "sources" | "pace";

export function ChallahImportPreview() {
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<Category>("notes");
  const [section, setSection] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState("HC1-A1");
  const [wholeDocument, setWholeDocument] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [printError, setPrintError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [chosenSources, setChosenSources] = useState<string[]>([]);
  const [selectedSourcesPreview, setSelectedSourcesPreview] = useState(false);
  const documentScroll = useRef<ScrollView>(null);
  const query = search.trim().toLowerCase();
  const visible = chunks.filter((c) => c.sourceType === category && (section === "All" || c.section === section)
    && (!query || `${c.code} ${c.title} ${c.summary}`.toLowerCase().includes(query)));
  const selected = visible.find((c) => c.code === selectedCode) ?? visible[0];
  const index = selected ? visible.indexOf(selected) : -1;
  const sourceGroups = [...new Set(visible.map((c) => c.section))];
  const selectedSources = chunks.filter((c) => c.sourceType === "sources" && chosenSources.includes(c.code));
  const previewChunks = selectedSourcesPreview ? selectedSources : wholeDocument
    ? visible
    : selected ? [selected] : [];
  const linkGroups = category === "notes"
    ? [{ title: "Suggested Q&A", codes: selected?.relatedQa ?? [] },
       { title: "Suggested Source Sheets", codes: selected?.relatedSources ?? [] }]
    : [{ title: "Related Review Notes", codes: selected?.relatedNotes ?? [] }];

  useEffect(() => { documentScroll.current?.scrollTo({ y: 0, animated: false }); }, [selected?.code, category, wholeDocument, selectedSourcesPreview, section]);

  function changeCategory(next: Category) {
    setCategory(next);
    setSection("All");
    setSearch("");
    setWholeDocument(false);
    setSelectedSourcesPreview(false);
  }

  function openChunk(c: ImportChunk) {
    changeCategory(c.sourceType as Category);
    selectChunk(c);
  }

  function selectChunk(c: ImportChunk) {
    setSelectedCode(c.code);
    setWholeDocument(false);
    setSelectedSourcesPreview(false);
    setExpanded((value) => ({ ...value, [`${c.sourceType}:${c.section}`]: true }));
  }

  function toggleSources(codes: string[]) {
    setChosenSources((current) => codes.every((code) => current.includes(code))
      ? current.filter((code) => !codes.includes(code)) : [...new Set([...current, ...codes])]);
  }

  async function printPreview() {
    setPrinting(true);
    setPrintError("");
    const items: ContentChunk[] = previewChunks.map((c) => ({
      id: c.code, chunkCode: c.code, programId: "winter-5787",
      sourceType: (c.sourceType === "sources" ? "source" : c.sourceType) as ContentSourceType,
      siman: "Hafrashas Challah Part 1", workbookTitle: "Hafrashas Challah Part 1",
      sectionKey: c.section, sectionTitle: c.sectionTitle, chunkTitle: c.title, chunkSummary: c.summary,
      contentMarkdown: "", contentDocument: { version: 1, blocks: c.blocks, footnotes: c.footnotes },
      sortOrder: 0, difficulty: "core", tags: [], isSelectable: true
    }));
    const result = await printPacket({ chunks: items, title: fixture.title, meta: "Local review only" });
    setPrintError(result ?? "");
    setPrinting(false);
  }

  function chunkButton(c: ImportChunk) {
    return (
      <View key={c.code} style={s.chunkRow}>
        {category === "sources" ? <Pressable accessibilityRole="checkbox"
          accessibilityLabel={`Select ${c.title}`} accessibilityState={{ checked: chosenSources.includes(c.code) }}
          onPress={() => toggleSources([c.code])} style={s.checkbox}>
          <Ionicons name={chosenSources.includes(c.code) ? "checkbox" : "square-outline"} size={20} color={theme.colors.primary} />
        </Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: c.code === selected?.code }}
          onPress={() => selectChunk(c)}
          style={[s.chunk, c.code === selected?.code && s.selected]}>
          <MetaText>{c.code}{c.officialShiur ? ` - Shiur ${c.officialShiur}` : ""}</MetaText>
          <Text style={s.chunkTitle}>{c.title}</Text>
          <MetaText>{category === "sources" ? `${c.relatedNotes?.length ?? 0} linked notes`
            : `${c.footnotes.length} footnotes${c.relatedQa?.length ? ` - ${c.relatedQa.length} Q&A` : ""}`}</MetaText>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Card>
        <SectionTitle>{fixture.title}</SectionTitle>
        <Row>
          <Pill label="Local review only" tone="accent" />
          <Pill label="45 notes chunks" />
          <Pill label="21 Q&A" />
          <Pill label="45 footnotes" tone="success" />
          <Pill label="4 pictures" />
          <Pill label="57 sources" />
        </Row>
        <Row>
          {([['notes', 'Review Notes'], ['qa', 'Q&A'], ['sources', 'Source Sheets'], ['pace', 'Pace']] as const).map(([key, label]) => (
            <Button key={key} label={label} variant={category === key ? "primary" : "secondary"} onPress={() => changeCategory(key)} />
          ))}
          <Button label={showIssues ? "Hide Import Notes" : "Import Notes"} variant="secondary" onPress={() => setShowIssues(!showIssues)} />
        </Row>
        {showIssues ? (
          <View style={s.issues}>
            {[...fixture.corrections, ...fixture.warnings].map((issue) => <Text key={issue} style={styles.muted}>{issue}</Text>)}
          </View>
        ) : null}
      </Card>
      {category === "pace" ? <ImportDocument blocks={pace} /> : (
        <View style={[s.workspace, width < 900 && s.stacked]}>
          <View style={[s.browser, width < 900 && s.mobileBrowser]}>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search chunks" style={s.input} accessibilityLabel="Search chunks" />
            {category === "notes" ? (
              <Row>{["All", "A", "B", "C", "D", "E", "F", "G"].map((key) => (
                <Pressable key={key} onPress={() => setSection(key)} accessibilityRole="button"
                  accessibilityState={{ selected: section === key }} style={[s.section, section === key && s.activeSection]}>
                  <Text style={[s.sectionText, section === key && s.activeSectionText]}>{key}</Text>
                </Pressable>
              ))}</Row>
            ) : null}
            <ScrollView style={s.chunkList} contentContainerStyle={{ gap: 4 }}>
              {sourceGroups.map((key) => {
                const group = visible.filter((c) => c.section === key);
                const allChosen = group.every((c) => chosenSources.includes(c.code));
                const folderKey = `${category}:${key}`;
                const title = group[0].sectionTitle.replace(/^[A-G]\.\s*/, "");
                const noun = category === "sources" ? "source" : category === "qa" ? "question" : "chunk";
                return <View key={key} style={s.folder}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${expanded[folderKey] ? "Collapse" : "Expand"} ${title}`}
                    accessibilityState={{ expanded: !!expanded[folderKey] }} style={s.folderHeading}
                    onPress={() => setExpanded((value) => ({ ...value, [folderKey]: !value[folderKey] }))}>
                    <Ionicons name={expanded[folderKey] ? "chevron-down" : "chevron-forward"} size={16} color={theme.colors.ink} />
                    <Ionicons name="folder-outline" size={20} color="#B78315" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.chunkTitle}>{key === "P2" ? "Part 2 - Unlinked" : key === "QA" ? title : `Section ${key} - ${title}`}</Text>
                      <MetaText>{group.length} {noun}{group.length === 1 ? "" : "s"}{category === "sources" ? ` - ${group.filter((c) => chosenSources.includes(c.code)).length} selected` : ""}</MetaText>
                    </View>
                  </Pressable>
                  <Row>
                    <Button label="View Section" variant="secondary" onPress={() => {
                      setSection(key); setWholeDocument(true); setSelectedSourcesPreview(false);
                    }} />
                    {category === "sources" ? <Button label={allChosen ? "Deselect Section" : "Select Section"} variant="secondary"
                      onPress={() => toggleSources(group.map((c) => c.code))} /> : null}
                  </Row>
                  {expanded[folderKey] ? group.map(chunkButton) : null}
                </View>;
              })}
              {!visible.length ? <Text style={styles.muted}>No matching chunks.</Text> : null}
            </ScrollView>
          </View>
          <View style={s.preview}>
            <Row>
              <Button label="Previous" disabled={index <= 0 || wholeDocument || selectedSourcesPreview} onPress={() => selectChunk(visible[index - 1])} />
              <MetaText>{visible.length ? `${index + 1} of ${visible.length}` : "0 chunks"}</MetaText>
              <Button label="Next" disabled={index < 0 || index === visible.length - 1 || wholeDocument || selectedSourcesPreview} onPress={() => selectChunk(visible[index + 1])} />
              <Button label={wholeDocument || selectedSourcesPreview ? "Single Chunk" : "Full Document"} variant="secondary"
                onPress={() => { setWholeDocument(!wholeDocument && !selectedSourcesPreview); setSelectedSourcesPreview(false); }} />
              <Button label={printing ? "Preparing Print..." : "Print"} disabled={printing || !previewChunks.length}
                onPress={() => { void printPreview(); }} />
              {section !== "All" ? <Button label="All Sections" variant="secondary" onPress={() => { setSection("All"); setWholeDocument(false); }} /> : null}
            </Row>
            {printError ? <Text style={styles.muted}>{printError}</Text> : null}
            {category === "sources" ? <Row>
              <Pill label={`${chosenSources.length} selected`} tone="success" />
              <Button label="Preview Selected Sources" disabled={!chosenSources.length}
                onPress={() => { setSelectedSourcesPreview(true); setWholeDocument(false); }} />
              <Button label="Clear Selection" variant="secondary" disabled={!chosenSources.length}
                onPress={() => { setChosenSources([]); setSelectedSourcesPreview(false); }} />
            </Row> : null}
            <ScrollView ref={documentScroll} style={s.document} contentContainerStyle={{ paddingVertical: 12 }}>
              {wholeDocument && category !== "sources" && section === "All" ? <ImportDocument blocks={[(category === "notes" ? fixture.notesDocumentTitle : fixture.qaDocumentTitle) as ImportBlock]} /> : null}
              {previewChunks.map((c) => (
                <View key={c.code} style={s.chunkDocument}>
                  <View style={s.documentHeading}>
                    <MetaText>{c.code} - {c.sourceType === "sources" ? `PDF page ${c.pdfPage}` : `Paragraphs ${c.paragraphStart}-${c.paragraphEnd}`}</MetaText>
                    <SectionTitle>{c.title}</SectionTitle>
                  </View>
                  <ImportDocument blocks={c.blocks} footnotes={c.footnotes} />
                </View>
              ))}
            </ScrollView>
            {selected && !wholeDocument && !selectedSourcesPreview ? (
              <View style={s.links}>
                {linkGroups.map((group) => <View key={group.title}>
                  <Text style={s.chunkTitle}>{group.title}</Text>
                  {group.codes.map((code) => chunks.find((c) => c.code === code)).filter((c): c is ImportChunk => !!c).map((c) =>
                    <Pressable key={c.code} onPress={() => openChunk(c)} accessibilityRole="button" style={s.link}>
                      <Text style={s.linkText}>{c.code} - {c.title}</Text>
                    </Pressable>)}
                  {!group.codes.length ? <MetaText>{selected.code === "HC1-S57" ? "Part 2 source - intentionally unlinked." : "No linked material."}</MetaText> : null}
                </View>)}
                {selected.sourceNumbers.length ? <MetaText>Source references: {selected.sourceNumbers.join(", ")}</MetaText> : null}
              </View>
            ) : null}
          </View>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  workspace: { flexDirection: "row", gap: 16, alignItems: "flex-start", width: "100%", minWidth: 0 },
  stacked: { flexDirection: "column" },
  browser: { width: 300, flexShrink: 0, gap: 12 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 10, fontSize: 14, color: theme.colors.ink, backgroundColor: "white" },
  mobileBrowser: { width: "100%" },
  chunkList: { maxHeight: 580 },
  preview: { flex: 1, minWidth: 0, width: "100%", gap: 12 },
  document: { height: 620, backgroundColor: "#E9EEF1", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4 },
  chunkDocument: { marginBottom: 20, backgroundColor: "white" },
  documentHeading: { paddingHorizontal: 24, paddingTop: 24, gap: 6 },
  chunk: { flex: 1, minWidth: 0, padding: 10, gap: 4, borderLeftWidth: 3, borderLeftColor: "transparent" },
  chunkRow: { flexDirection: "row", alignItems: "center", minWidth: 0 },
  checkbox: { width: 32, height: 36, alignItems: "center", justifyContent: "center" },
  folder: { padding: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  folderHeading: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  selected: { backgroundColor: "#EAF4EF", borderLeftColor: "#15803D" },
  chunkTitle: { fontSize: 14, lineHeight: 21, color: theme.colors.ink, fontWeight: "700" },
  section: { minWidth: 28, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 4, backgroundColor: "#EEF2F7" },
  activeSection: { backgroundColor: theme.colors.primary },
  sectionText: { fontSize: 13, color: theme.colors.ink },
  activeSectionText: { color: "white" },
  issues: { gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 },
  links: { gap: 6, padding: 12, backgroundColor: "#EDF6F0", borderRadius: 4 },
  link: { paddingVertical: 6 },
  linkText: { color: "#235789", fontSize: 13, lineHeight: 20, textDecorationLine: "underline" }
});
