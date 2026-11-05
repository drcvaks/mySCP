import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, FilterChip, MetaText, Row, SectionTitle, StatusBanner } from "./components";
import { bmIsRtl, BmChunk, BmMaterialType, findBmChunks, groupBmWorkbooks } from "./beisMidrash";
import { supabase } from "../lib/supabase";
import { ImportDocument } from "./ImportDocument";
import { readRichContent, RichContentDocument } from "./documentContent";
import { theme } from "./theme";
import { chunkDisplayCode } from "./chunkLabels";
import { programName } from "./learningPrograms";

export function BmChoices({ label, value, options, onChange }: {
  label: string; value: string; options: readonly { id: string; label: string }[]; onChange: (id: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const revealSelected = useCallback(() => scrollRef.current?.scrollTo({ x: Math.max(0, (positions.current[value] ?? 0) - 6), animated: false }), [value]);
  useEffect(() => { revealSelected(); }, [revealSelected]);
  return <View style={{ gap: 6 }}><Text style={s.fieldLabel}>{label}</Text>
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} onContentSizeChange={revealSelected}>
      {options.map(option => <View key={option.id} onLayout={event => {
        positions.current[option.id] = event.nativeEvent.layout.x;
        if (option.id === value) revealSelected();
      }}><FilterChip label={option.label} selected={value === option.id} onPress={() => onChange(option.id)} /></View>)}
    </ScrollView></View>;
}
export function BmInput({ label, value, onChange, multiline = false, maxLength, url = false }: {
  label: string; value: string; onChange: (text: string) => void; multiline?: boolean; maxLength: number; url?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 6 }}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholder={label}
    placeholderTextColor="#8A97AE" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    value={value} onChangeText={onChange} multiline={multiline} maxLength={maxLength}
    {...(url ? { keyboardType: "url" as const, autoCapitalize: "none" as const, autoCorrect: false } : {})}
    style={[s.input, focused && s.inputFocused, multiline && { minHeight: 150, textAlignVertical: "top" }, bmIsRtl(value) && theme.type.bodyHebrew, {
      writingDirection: bmIsRtl(value) ? "rtl" : "ltr", textAlign: bmIsRtl(value) ? "right" : "left"
    }]} /></View>;
}
export function BmBody({ text }: { text: string }) {
  return <View style={{ gap: 10 }}>{text.split(/\n\s*\n/).map((paragraph, index) => <Text key={index} selectable
    style={{ ...(bmIsRtl(paragraph) ? theme.type.bodyHebrew : { fontSize: 15, lineHeight: 24 }), color: theme.colors.ink,
      writingDirection: bmIsRtl(paragraph) ? "rtl" : "ltr", textAlign: bmIsRtl(paragraph) ? "right" : "left" }}>{paragraph}</Text>)}</View>;
}
export function BmDialog({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <Modal transparent visible onRequestClose={close} animationType="fade">
    <View style={s.backdrop}><View style={s.dialog} accessibilityViewIsModal>
      <View style={s.dialogHead}><View style={{ flex: 1, minWidth: 140 }}><SectionTitle>{title}</SectionTitle></View><Button label="Close" onPress={close} variant="secondary" compact /></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>{children}</ScrollView>
    </View></View>
  </Modal>;
}
export function BmChunkPreview({ chunk, close, onToggle, selected = false }: {
  chunk: BmChunk; close: () => void; onToggle?: () => void; selected?: boolean;
}) {
  const [document, setDocument] = useState<RichContentDocument>();
  const [markdown, setMarkdown] = useState("");
  const [message, setMessage] = useState("Loading material...");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from("content_chunks").select("content_document,content_markdown").eq("id", chunk.id).single();
      if (cancelled) return;
      if (error) { setMessage("Unable to load this material."); return; }
      setDocument(readRichContent(data.content_document)); setMarkdown(data.content_markdown); setMessage("");
    })().catch(() => { if (!cancelled) setMessage("Unable to load this material."); });
    return () => { cancelled = true; };
  }, [chunk.id]);
  return <BmDialog title={chunk.title} close={close}><MetaText>{chunkDisplayCode(chunk.code)}</MetaText>
    {message ? <MetaText>{message}</MetaText> : document ? <ImportDocument blocks={document.blocks} footnotes={document.footnotes} /> : <BmBody text={markdown} />}
    {onToggle ? <Button label={selected ? "Remove Link" : "Link to Discussion"} onPress={onToggle} variant={selected ? "secondary" : "primary"} /> : null}
  </BmDialog>;
}
export function BmChunkPicker({ program, selected, onChange, label = "Link Notes (optional)", materialType = "notes" }: {
  program: string | null; selected: BmChunk[]; onChange: (chunks: BmChunk[]) => void; label?: string; materialType?: BmMaterialType;
}) {
  const [options, setOptions] = useState<BmChunk[]>([]);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsedBooks, setCollapsedBooks] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<BmChunk | null>(null);
  const workbooks = groupBmWorkbooks(options);
  function toggle(chunk: BmChunk) {
    onChange(selected.some(item => item.id === chunk.id) ? selected.filter(item => item.id !== chunk.id) : [...selected, chunk]);
  }
  useEffect(() => { setExpanded({}); setCollapsedBooks({}); setPreview(null); }, [program, materialType]);
  useEffect(() => {
    let cancelled = false;
    setOptions([]); setLoading(true); setError("");
    findBmChunks("", program, materialType).then(data => {
      if (cancelled) return;
      setOptions(data);
    })
      .catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [program, materialType]);
  return <View style={{ gap: 8 }}>
    <MetaText>{label}</MetaText>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{selected.map(chunk => <FilterChip key={chunk.id}
      label={`${chunkDisplayCode(chunk.code)} - Remove`} selected onPress={() => toggle(chunk)} />)}</View>
    <StatusBanner message={error} tone="error" />
    {loading ? <MetaText>Loading material...</MetaText> : null}
    <ScrollView nestedScrollEnabled style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
      {workbooks.map(workbook => <View key={workbook.key}>
        <Pressable accessibilityRole="button" accessibilityLabel={[!program ? programName(workbook.program) : "", workbook.title].filter(Boolean).join(" - ")}
          accessibilityState={{ expanded: !collapsedBooks[workbook.key] }} aria-expanded={!collapsedBooks[workbook.key]}
          onPress={() => setCollapsedBooks(current => ({ ...current, [workbook.key]: !current[workbook.key] }))} style={s.workbook}>
          <Ionicons name={collapsedBooks[workbook.key] ? "chevron-forward" : "chevron-down"} size={16} color={theme.colors.muted} />
          <Ionicons name="book-outline" size={22} color={theme.colors.info} />
          <Text style={{ flex: 1, minWidth: 0, color: theme.colors.ink, fontWeight: "700" }}>{[!program ? programName(workbook.program) : "", workbook.title].filter(Boolean).join(" - ")}</Text>
        </Pressable>
        {!collapsedBooks[workbook.key] ? <View style={{ paddingLeft: 12 }}>{workbook.sections.map(group => {
        const title = [materialType === "all" ? group.type === "qa" ? "Official Questions" : "Official Notes" : "", group.section ? `Section ${group.section}` : "Material", group.title].filter(Boolean).join(" - ");
        const linked = group.chunks.filter(chunk => selected.some(item => item.id === chunk.id)).length;
        return <View key={group.key}>
          <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: !!expanded[group.key] }} aria-expanded={!!expanded[group.key]}
            onPress={() => setExpanded(current => ({ ...current, [group.key]: !current[group.key] }))} style={s.folder}>
            <Ionicons name={expanded[group.key] ? "chevron-down" : "chevron-forward"} size={16} color={theme.colors.muted} />
            <Ionicons name={expanded[group.key] ? "folder-open-outline" : "folder-outline"} size={22} color={theme.colors.accentText} />
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: theme.colors.ink, fontWeight: "700" }}>{title}</Text>
              <MetaText>{group.chunks.length} items{linked ? ` - ${linked} linked` : ""}</MetaText></View>
          </Pressable>
          {expanded[group.key] ? group.chunks.map(chunk => <View key={chunk.id} style={s.chunkOption}>
            <Pressable accessibilityRole="checkbox" accessibilityLabel={`Link ${chunkDisplayCode(chunk.code)}`}
              aria-checked={selected.some(item => item.id === chunk.id)} accessibilityState={{ checked: selected.some(item => item.id === chunk.id) }}
              onPress={() => toggle(chunk)} style={s.linkCheck}>
              <Ionicons name={selected.some(item => item.id === chunk.id) ? "checkbox" : "square-outline"} size={22} color={theme.colors.info} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${chunk.source_type === "qa" ? "Question" : "Notes"} ${chunkDisplayCode(chunk.code)}`}
              onPress={() => setPreview(chunk)} style={s.chunkView}>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={{ color: theme.colors.info, fontWeight: "700", writingDirection: "ltr" }}>{chunkDisplayCode(chunk.code)}</Text>
                <Text style={{ color: theme.colors.ink, textAlign: bmIsRtl(chunk.title) ? "right" : "left" }}>{chunk.title}</Text>
              </View>
              <Ionicons name="eye-outline" size={20} color={theme.colors.info} />
            </Pressable>
          </View>) : null}
        </View>;
      })}</View> : null}
      </View>)}
      {!loading && !error && !options.length ? <MetaText>No matching material.</MetaText> : null}
    </ScrollView>
    {preview ? <BmChunkPreview key={preview.id} chunk={preview} close={() => setPreview(null)}
      selected={selected.some(item => item.id === preview.id)} onToggle={() => toggle(preview)} /> : null}
  </View>;
}
const s = StyleSheet.create({
  fieldLabel: { color: theme.colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  input: { borderWidth: 1.5, borderColor: theme.colors.borderStrong, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, padding: 12, fontSize: 15, lineHeight: 22, color: theme.colors.ink },
  inputFocused: { borderColor: theme.colors.primary },
  backdrop: { flex: 1, backgroundColor: "rgba(6, 26, 74, 0.5)", alignItems: "center", justifyContent: "center", padding: 16 },
  dialog: { width: "100%", maxWidth: 850, maxHeight: "90%", backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, gap: 12, ...theme.shadow.raised },
  dialogHead: { flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 10 },
  folder: { minHeight: 52, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderColor: theme.colors.border },
  workbook: { minHeight: 48, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted },
  chunkOption: { minHeight: 52, marginLeft: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: theme.colors.border },
  linkCheck: { width: 44, minHeight: 48, alignItems: "center", justifyContent: "center" },
  chunkView: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10 }
});
