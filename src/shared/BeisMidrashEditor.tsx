import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useAppState } from "../state/AppState";
import { Button, MetaText, Row, SectionTitle, StatusBanner } from "./components";
import { BmChoices, BmChunkPicker, BmInput } from "./BeisMidrashControls";
import { bmAreas, bmAreaForCategory, bmCategories, bmMaterialType, BmCategory, BmChunk, BmDetail, BmResource, mutateBm } from "./beisMidrash";
import { discardBmResource, pickBmResource } from "./beisMidrashResources";
import { bmResourceLinkError, normalizeBmResourceUrl } from "./beisMidrashLinks";
import { rolloutPrograms } from "./learningPrograms";
import { BmAreaPicker } from "./BmAreaPicker";

export interface BmEditorTarget { kind: "thread" | "reply" | "report"; id?: string; parent?: string; initialBody?: string }
export async function confirmBmDiscard(message: string) {
  if (Platform.OS === "web") return window.confirm(message);
  return new Promise<boolean>(resolve => Alert.alert("Please confirm", message, [
    { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
    { text: "Continue", onPress: () => resolve(true) }
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
export function BeisMidrashEditor({ target, detail, close, saved, initialCategory = "notes", initialProgram }: {
  target: BmEditorTarget; detail: BmDetail | null; close: () => void; saved: (id?: string, category?: BmCategory) => void;
  initialCategory?: BmCategory; initialProgram?: string;
}) {
  const { programs, selectedProgramId, registerProgramEdits } = useAppState();
  const editing = target.kind === "thread" && !!target.id ? detail : null;
  const [title, setTitle] = useState(editing?.thread.title ?? "");
  const [body, setBody] = useState(editing?.thread.body ?? target.initialBody ?? "");
  const [category, setCategory] = useState<BmCategory>(editing?.thread.category ?? initialCategory);
  const [program, setProgram] = useState(editing ? editing.thread.program_id ?? "general" : initialProgram ?? selectedProgramId);
  const [language, setLanguage] = useState(editing?.thread.language ?? "mixed");
  const [chunks, setChunks] = useState<BmChunk[]>(editing?.chunks ?? []);
  const [optionalLinks, setOptionalLinks] = useState(!!editing?.chunks.length);
  const [resources, setResources] = useState<BmResource[]>(editing?.resources ?? []);
  const [resourceUrl, setResourceUrl] = useState(editing?.thread.resource_url ?? "");
  const [resourceLabel, setResourceLabel] = useState(editing?.thread.resource_label ?? "");
  const pending = useRef(new Set<string>());
  const uploadLock = useRef(false);
  const materialType = bmMaterialType(category);
  function changeCategory(next: BmCategory) {
    if (busy) return;
    if ((resources.length || resourceUrl.trim() || resourceLabel.trim()) && next !== "resources") { setError("Remove attachments and the resource link before changing the discussion area."); return; }
    setCategory(next);
    const type = bmMaterialType(next);
    if (type === "all" && chunks.length) setOptionalLinks(true);
    if (type !== "all") setChunks(items => items.filter(item => (item.source_type ?? "notes") === type));
  }
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [baseline] = useState(() => JSON.stringify({ title, body, category, program, language, resourceUrl, resourceLabel, chunks: chunks.map(c => c.id), resources: resources.map(r => r.id) }));
  const dirty = busy || JSON.stringify({ title, body, category, program, language, resourceUrl, resourceLabel, chunks: chunks.map(c => c.id), resources: resources.map(r => r.id) }) !== baseline;
  useEffect(() => { registerProgramEdits("bm-editor", dirty); return () => registerProgramEdits("bm-editor", false); }, [dirty, registerProgramEdits]);
  async function cancel() {
    if (busy || (dirty && !await confirmBmDiscard("Discard your unsaved discussion and attachments?"))) return;
    setBusy(true);
    await Promise.all(resources.filter(r => pending.current.has(r.id)).map(r => discardBmResource(r).catch(() => undefined)));
    close();
  }
  async function attach() {
    if (busy || uploadLock.current || resources.length >= 5) return;
    uploadLock.current = true; setBusy(true); setError("");
    try {
      const resource = await pickBmResource();
      if (resource) { pending.current.add(resource.id); setResources(items => [...items, resource]); }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to attach this file."); }
    finally { uploadLock.current = false; setBusy(false); }
  }
  async function removeResource(resource: BmResource) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (pending.current.has(resource.id)) { await discardBmResource(resource); pending.current.delete(resource.id); }
      setResources(items => items.filter(item => item.id !== resource.id));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to remove this attachment."); }
    finally { setBusy(false); }
  }
  const missingOfficialLink = target.kind === "thread" && materialType !== "all" && !chunks.length;
  const linkError = target.kind === "thread" && category === "resources" ? bmResourceLinkError(resourceUrl, resourceLabel) : "";
  async function save() {
    if (busy || !body.trim() || (target.kind === "thread" && !title.trim())) return;
    if (missingOfficialLink) { setError("Select at least one official section or question."); return; }
    if (linkError) { setError(linkError); return; }
    setBusy(true); setError("");
    try {
      const result = target.kind === "thread"
        ? await mutateBm(target.id ? "edit_thread" : "create_thread", target.id ?? null, {
          title: title.trim(), body: body.trim(), category, program_id: program === "general" ? null : program,
          language, chunk_ids: chunks.map(c => c.id), resource_ids: resources.map(r => r.id),
          resource_url: category === "resources" ? normalizeBmResourceUrl(resourceUrl) : null,
          resource_label: category === "resources" ? resourceLabel.trim() || null : null
        }) : target.kind === "reply"
          ? await mutateBm(target.id ? "edit_reply" : "reply", target.id ?? detail!.thread.id, { body: body.trim(), parent_reply_id: target.parent ?? null })
          : await mutateBm("report", detail!.thread.id, { reason: body.trim(), reply_id: target.id ?? null });
      if (target.kind === "thread") {
        await Promise.all((editing?.resources ?? []).filter(r => !resources.some(item => item.id === r.id)).map(r => discardBmResource(r).catch(() => undefined)));
        pending.current.clear();
      }
      saved(target.kind === "thread" ? result.id : undefined, target.kind === "thread" ? category : undefined);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save. Your text is still here."); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 16 }}>
    <SectionTitle>{target.kind === "thread" ? target.id ? "Edit Discussion" : "Start Discussion" : target.kind === "report" ? "Report Content" : target.id ? "Edit Reply" : "Write a Reply"}</SectionTitle>
    {target.kind === "thread" ? <>
      <BmInput label="Title" value={title} onChange={setTitle} maxLength={160} />
      <MetaText>Post in</MetaText>
      <BmAreaPicker value={bmAreaForCategory(category)} includeAll={false}
        onChange={value => { if (value !== "all") changeCategory(bmAreas[value].categories[0]); }} />
      {bmAreas[bmAreaForCategory(category)].categories.length > 1 ? <BmChoices label="Topic" value={category}
        options={bmAreas[bmAreaForCategory(category)].categories.map(id => ({ id, label: bmCategories[id] }))} onChange={value => changeCategory(value as BmCategory)} /> : null}
      <BmChoices label="Discussion Zeman" value={program} options={[...rolloutPrograms(programs).map(p => ({ id: p.id, label: p.name })), { id: "general", label: "General / Cross-Zeman" }]}
        onChange={value => { if (!busy && value !== program) { setProgram(value); setChunks([]); } }} />
      <BmChoices label="Language" value={language} options={[{ id: "mixed", label: "Mixed" }, { id: "en", label: "English" }, { id: "he", label: "Hebrew" }]}
        onChange={value => setLanguage(value as typeof language)} />
    </> : null}
    <BmInput label={target.kind === "report" ? "Reason for report" : target.kind === "thread" ? "Question, sources, or discussion" : "Reply"}
      value={body} onChange={setBody} multiline maxLength={target.kind === "report" ? 2000 : 20000} />
    {target.parent ? <MetaText>Replying to a response in this discussion.</MetaText> : null}
    {target.kind === "thread" ? <>
      {materialType === "all" ? <Pressable accessibilityRole="checkbox" accessibilityLabel="Link official material (optional)" aria-checked={optionalLinks}
        onPress={() => { if (optionalLinks) setChunks([]); setOptionalLinks(value => !value); }} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={optionalLinks ? "checkbox" : "square-outline"} size={22} color="#2563EB" /><Text>Link official material (optional)</Text>
      </Pressable> : null}
      {materialType !== "all" || optionalLinks ? <BmChunkPicker program={program === "general" ? null : program} selected={chunks} onChange={setChunks}
        materialType={materialType} label={materialType === "notes" ? "Official Notes (required)" : materialType === "qa" ? "Official Questions (required)" : "Official material (optional)"} /> : null}
      {missingOfficialLink ? <MetaText>{category === "notes" ? "Select at least one official Notes section." : "Select at least one official Question."}</MetaText> : null}
      {category === "resources" ? <View style={{ gap: 8 }}>
        <BmInput label="Resource Link (optional)" value={resourceUrl} onChange={setResourceUrl} maxLength={2048} url />
        <BmInput label="Link Display Name (optional)" value={resourceLabel} onChange={setResourceLabel} maxLength={160} />
        <StatusBanner message={linkError} tone="error" />
        {resourceUrl || resourceLabel ? <Pressable accessibilityRole="button" accessibilityLabel="Remove Resource Link" disabled={busy}
          onPress={() => { setResourceUrl(""); setResourceLabel(""); setError(""); }} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="trash-outline" size={21} color="#A33030" /><Text>Remove Resource Link</Text>
        </Pressable> : null}
        <SectionTitle>Attachments</SectionTitle>
        <MetaText>Rabbonim only - up to 5 files, 10 MB each. PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, WebP.</MetaText>
        {resources.map(resource => <View key={resource.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="document-attach-outline" size={22} color="#235789" />
          <Text style={{ flex: 1, minWidth: 0 }}>{resource.file_name} ({Math.ceil(resource.byte_size / 1024)} KB)</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove attachment ${resource.file_name}`} disabled={busy} onPress={() => removeResource(resource)}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close-circle-outline" size={23} color="#A33030" />
          </Pressable>
        </View>)}
        <Button label={busy ? "Please wait..." : "Attach File"} onPress={attach} disabled={busy || resources.length >= 5} variant="primary" />
      </View> : null}
    </> : null}
    <StatusBanner message={error} tone="error" />
    <Row><Button label={busy ? "Saving..." : target.kind === "report" ? "Submit Report" : target.id ? "Save Changes" : "Post"}
      onPress={save} disabled={busy || missingOfficialLink || !!linkError || !body.trim() || (target.kind === "thread" && !title.trim())} />
      <Button label="Cancel" onPress={cancel} disabled={busy} variant="secondary" /></Row>
    {target.kind === "report" ? <Text>Reports are visible only to you and authorized moderators.</Text> : null}
  </View>;
}
