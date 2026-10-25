import { Ionicons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";
import { Button, Card, FormInput, MetaText, Pill, Row, Screen, SectionTitle, StatusBanner, styles } from "../../src/shared/components";
import { canAccessBeisMidrash, chaburahToolAccess } from "../../src/shared/permissions";
import { RabbiTool, RabbiToolSwitcher } from "../../src/shared/RabbiToolSwitcher";
import { RabbiToolCards, useExpandedRabbiTools } from "../../src/shared/RabbiToolCards";
import { bmAreas, bmAreaForCategory, bmCategories, bmMaterialType, bmStatuses, bmIsRtl, BmArea, BmCategory, BmChunk, BmDetail, BmReport, BmThread, getBmThread, listBmReports, listBmThreads, mutateBm } from "../../src/shared/beisMidrash";
import { BmBody, BmChoices, BmChunkPicker, BmChunkPreview } from "../../src/shared/BeisMidrashControls";
import { BeisMidrashEditor, BmEditorTarget, confirmBmDiscard } from "../../src/shared/BeisMidrashEditor";
import { programName } from "../../src/shared/learningPrograms";
import { theme } from "../../src/shared/theme";
import { ProgramSelector } from "../../src/shared/ProgramSelector";
import { chunkDisplayCode } from "../../src/shared/chunkLabels";
import { openBmResource } from "../../src/shared/beisMidrashResources";

export default function BeisMidrashScreen() {
  const router = useRouter(); const params = useLocalSearchParams<{ thread?: string }>();
  const expandedTools = useExpandedRabbiTools();
  const threadId = typeof params.thread === "string" && /^[0-9a-f-]{36}$/i.test(params.thread) ? params.thread : "";
  const { profile } = useAuthState();
  const { programs, selectedProgramId, selectedChaburahId, memberships, chaburos } = useAppState();
  const access = canAccessBeisMidrash(profile, memberships);
  const localTools = chaburahToolAccess(profile, memberships, selectedChaburahId).rabbiHub;
  const askEnabled = chaburos.find(c => c.id === selectedChaburahId)?.askRavEnabled ?? true;
  const [search, setSearch] = useState(""); const [query, setQuery] = useState("");
  const [program, setProgram] = useState(selectedProgramId); const [category, setCategory] = useState("all");
  const [area, setArea] = useState<BmArea | "all">("message");
  const [status, setStatus] = useState("all"); const [section, setSection] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [filterChunks, setFilterChunks] = useState<BmChunk[]>([]);
  const [savedFilter, setSavedFilter] = useState("all"); const [sort, setSort] = useState("activity");
  const [showFilters, setShowFilters] = useState(false); const [unanswered, setUnanswered] = useState(false);
  const [page, setPage] = useState(0); const [replyPage, setReplyPage] = useState(0); const [revision, setRevision] = useState(0);
  const [list, setList] = useState<{ items: BmThread[]; total: number }>({ items: [], total: 0 });
  const [detail, setDetail] = useState<BmDetail | null>(null); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<BmEditorTarget | null>(null); const [preview, setPreview] = useState<BmChunk | null>(null);
  const [reports, setReports] = useState<BmReport[] | null>(null); const [shareUrl, setShareUrl] = useState("");
  const mutationLock = useRef(false);
  const previousProgram = useRef(selectedProgramId);
  useEffect(() => {
    if (previousProgram.current === selectedProgramId) return;
    previousProgram.current = selectedProgramId;
    setProgram(selectedProgramId); setPage(0); setReplyPage(0); setFilterChunks([]);
    setEditor(null); setReports(null); setPreview(null); setShareUrl("");
    router.setParams({ thread: "" });
  }, [selectedProgramId, router]);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(timer); }, [search]);
  const filters = JSON.stringify({ search: query, program, area, category, status, section, author: authorFilter, chunk: filterChunks[0]?.id ?? "", saved: savedFilter, sort, unanswered, offset: page * 25 });
  useEffect(() => {
    if (!access) return;
    let cancelled = false; setLoading(true); setError(""); setDetail(null); setList({ items: [], total: 0 });
    (threadId ? getBmThread(threadId, replyPage * 50).then(value => { if (!cancelled) setDetail(value); })
      : listBmThreads(JSON.parse(filters)).then(value => { if (!cancelled) setList(value); }))
      .catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [access, threadId, replyPage, threadId ? null : filters, revision]);

  function openThread(id: string) { setReplyPage(0); setReports(null); setShareUrl(""); router.setParams({ thread: id }); }
  function back() { setEditor(null); setReports(null); setShareUrl(""); router.setParams({ thread: "" }); if (!threadId) setRevision(v => v + 1); }
  function selectTool(tool: RabbiTool) {
    if (tool === "beis-midrash") return;
    router.navigate(tool === "shiur-builder" ? "/(tabs)/shiur-builder" : { pathname: "/(tabs)/rabbi-hub", params: { tool } });
  }
  async function action(name: string, id: string, payload = {}) {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setError("");
    try { await mutateBm(name, id, payload); setRevision(v => v + 1); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save this change."); return false; }
    finally { setBusy(false); mutationLock.current = false; }
  }
  async function remove(name: string, id: string) {
    if (await confirmBmDiscard("Remove your contribution? It will no longer be visible to other Rabbonim.")) {
      const success = await action(name, id); if (success && name === "delete_thread") back();
    }
  }
  async function share() {
    const url = `${Platform.OS === "web" ? window.location.origin : "https://scplearning.com"}/beis-midrash?thread=${threadId}`;
    try {
      if (Platform.OS !== "web") await Share.share({ message: url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setShareUrl("Discussion link copied."); }
      else setShareUrl(url);
    } catch { setShareUrl(url); }
  }
  async function showReports() {
    setError(""); try { setReports(await listBmReports()); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load reports."); }
  }
  if (!access) return <Redirect href="/(tabs)/dashboard" />;
  const moderator = profile?.role === "global_admin";
  const author = detail?.thread.author_id === profile?.id;
  const closed = !!detail && (detail.thread.status === "archived" || detail.thread.is_hidden || !!detail.thread.deleted_at);
  return <Screen title="Beis Midrash" eyebrow="Worldwide Rabbonim" onRefresh={() => setRevision(v => v + 1)} refreshing={loading}
    programSelector={<ProgramSelector />}
    toolbar={!expandedTools ? <RabbiToolSwitcher active="beis-midrash" beisMidrashEnabled localTools={localTools} askRavEnabled={askEnabled} onSelect={selectTool} /> : undefined}>
    {expandedTools ? <RabbiToolCards active="beis-midrash" beisMidrashEnabled localTools={localTools} askRavEnabled={askEnabled} onSelect={selectTool} /> : null}
    <MetaText>Private discussion for Rabbonim. Community replies are not official SCP rulings.</MetaText>
    <StatusBanner message={error} tone="error" />
    {editor ? <BeisMidrashEditor key={`${editor.kind}/${editor.id ?? "new"}/${editor.parent ?? ""}`} target={editor} detail={detail}
      initialProgram={program === "all" ? selectedProgramId : program}
      initialCategory={category === "all" ? area === "all" ? "notes" : bmAreas[area].categories[0] : category as BmCategory}
      close={() => setEditor(null)} saved={(id, destination) => {
        setEditor(null); setRevision(v => v + 1);
        if (destination) { setArea(bmAreaForCategory(destination)); setCategory(destination); setFilterChunks([]); setPage(0); }
        if (id) openThread(id);
      }} /> : <>
      {threadId || reports ? <Button label="Back to Discussions" onPress={back} variant="ghost" /> : null}
      {loading ? <MetaText>Loading discussions...</MetaText> : null}
      {reports ? <>
        <SectionTitle>Reported Content</SectionTitle>
        {!reports.length ? <MetaText>No open reports.</MetaText> : null}
        {reports.map(report => <Card key={report.id}><SectionTitle>{report.title}</SectionTitle><BmBody text={report.reason} />
          <MetaText>{report.reply_id ? "Reply report" : "Discussion report"} - {date(report.created_at)}</MetaText>
          <Row><Button label="Open Discussion" onPress={() => openThread(report.thread_id)} />
            <Button label="Mark Reviewed" variant="secondary" disabled={busy} onPress={async () => {
              if (await action("review_report", report.id)) await showReports();
            }} /></Row></Card>)}
      </> : !threadId ? <>
        <BmChoices label="Beis Midrash" value={area} options={[...Object.entries(bmAreas).map(([id, item]) => ({ id, label: item.label })), { id: "all", label: "All Areas" }]}
          onChange={value => { setArea(value as BmArea | "all"); setCategory("all"); setFilterChunks([]); setPage(0); }} />
        {area !== "resources" ? <BmChoices label={area === "message" ? "Message Board" : area === "teaching" ? "Teaching & Chaburah" : "Topics"} value={category}
          options={[{ id: "all", label: "All Topics" }, ...(area === "all" ? Object.keys(bmCategories) as BmCategory[] : bmAreas[area].categories).map(id => ({ id, label: bmCategories[id] }))]}
          onChange={value => { setCategory(value); setFilterChunks([]); setPage(0); }} /> : null}
        <Row><View style={{ flex: 1, minWidth: 180 }}><FormInput placeholder="Search discussions and replies" value={search} onChangeText={setSearch} /></View>
          <Button label="Start Discussion" onPress={() => setEditor({ kind: "thread" })} />
          <Icon label="Discussion filters" icon="options-outline" selected={showFilters} onPress={() => setShowFilters(v => !v)} />
          {moderator ? <Icon label="Review reports" icon="flag-outline" onPress={showReports} /> : null}</Row>
        <BmChoices label="Discussions" value={savedFilter} options={[{ id: "all", label: "All" }, { id: "following", label: "Following" }, { id: "unread", label: "Unread" }, { id: "bookmarked", label: "Bookmarked" }]}
          onChange={value => { setSavedFilter(value); setPage(0); if (value !== "all") { setArea("all"); setCategory("all"); setFilterChunks([]); } }} />
        {showFilters ? <View style={s.filters}>
          <BmChoices label="Search scope" value={program} options={[{ id: selectedProgramId, label: "Selected Zeman" }, { id: "all", label: "All Available Zemanim" }, { id: "general", label: "General SCP" }]}
            onChange={value => { setProgram(value); setFilterChunks([]); setPage(0); }} />
          <BmChoices label="Status" value={status} options={[{ id: "all", label: "All Statuses" }, ...Object.entries(bmStatuses).map(([id, label]) => ({ id, label }))]}
            onChange={value => { setStatus(value); setPage(0); }} />
          <FormInput placeholder="Section (optional, e.g. B)" value={section} onChangeText={value => { setSection(value); setPage(0); }} />
          <FormInput placeholder="Author name (optional)" value={authorFilter} onChangeText={value => { setAuthorFilter(value); setPage(0); }} />
          <BmChunkPicker label="Filter by official material" materialType={bmMaterialType(category)} program={["all", "general"].includes(program) ? null : program} selected={filterChunks}
            onChange={value => { setFilterChunks(value.slice(-1)); setPage(0); }} />
          <Row><Pressable accessibilityRole="checkbox" accessibilityLabel="Unanswered only" aria-checked={unanswered}
            onPress={() => { setUnanswered(v => !v); setPage(0); }} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
            <Ionicons name={unanswered ? "checkbox" : "square-outline"} size={22} color={theme.colors.info} /><Text>Unanswered only</Text></Pressable>
            <BmChoices label="Sort" value={sort} options={[{ id: "activity", label: "Recent Activity" }, { id: "newest", label: "Newest" }]}
              onChange={value => { setSort(value); setPage(0); }} /></Row>
        </View> : null}
        {!loading && !error && !list.items.length ? <MetaText>No discussions match these filters.</MetaText> : null}
        {list.items.map(thread => <Card key={thread.id}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open discussion: ${thread.title}`} onPress={() => openThread(thread.id)}>
            <Text style={[s.threadTitle, { writingDirection: bmIsRtl(thread.title) ? "rtl" : "ltr", textAlign: bmIsRtl(thread.title) ? "right" : "left" }]}>{thread.title}</Text>
          </Pressable>
          <Row><Pill label={bmCategories[thread.category]} /><Pill label={bmStatuses[thread.status]} />{thread.unread ? <Pill label="Unread" tone="primary" /> : null}
            {thread.is_hidden ? <Pill label="Hidden" tone="danger" /> : null}{thread.deleted_at ? <Pill label="Removed" tone="danger" /> : null}</Row>
          <Text numberOfLines={3} style={[styles.body, { textAlign: bmIsRtl(thread.excerpt ?? "") ? "right" : "left", writingDirection: bmIsRtl(thread.excerpt ?? "") ? "rtl" : "ltr" }]}>{thread.excerpt}</Text>
          <MetaText>{thread.author_name} - {thread.program_id ? programName(thread.program_id, programs) : "General SCP"}</MetaText>
          <Row><MetaText>{thread.reply_count} replies - {date(thread.last_activity_at)}</MetaText>
            {(thread.chunks ?? []).map(chunk => <Pill key={chunk.id} label={chunkDisplayCode(chunk.code)} />)}</Row>
        </Card>)}
        <Row><Button label="Previous" disabled={page === 0 || loading} variant="secondary" onPress={() => setPage(p => p - 1)} />
          <MetaText>Page {page + 1} - {list.total} discussions</MetaText><Button label="Next" disabled={(page + 1) * 25 >= list.total || loading} onPress={() => setPage(p => p + 1)} /></Row>
      </> : detail ? <>
        <Card>
          <Text style={[s.threadTitle, { writingDirection: bmIsRtl(detail.thread.title) ? "rtl" : "ltr", textAlign: bmIsRtl(detail.thread.title) ? "right" : "left" }]}>{detail.thread.title}</Text>
          <MetaText>{detail.thread.author_name} - {date(detail.thread.created_at)} - {detail.thread.program_id ? programName(detail.thread.program_id, programs) : "General SCP"}</MetaText>
          <Row><Pill label={bmCategories[detail.thread.category]} /><Pill label={bmStatuses[detail.thread.status]} />
            {detail.thread.is_hidden ? <Pill label="Hidden" tone="danger" /> : null}{detail.thread.deleted_at ? <Pill label="Removed" tone="danger" /> : null}</Row>
          <BmBody text={detail.thread.body ?? ""} />
          {detail.thread.category === "resources" && detail.resources?.length ? <View style={{ gap: 8 }}>
            <SectionTitle>Resources</SectionTitle>
            {detail.resources.map(resource => <Button key={resource.id} label={`Download ${resource.file_name}`} variant="secondary"
              onPress={() => { void openBmResource(resource).catch(e => setError(e instanceof Error ? e.message : "Unable to open attachment.")); }} />)}
          </View> : null}
          <Row>{detail.chunks.map(chunk => <Button key={chunk.id} label={`View ${chunk.source_type === "qa" ? "Question" : "Notes"} ${chunkDisplayCode(chunk.code)}`} onPress={() => setPreview(chunk)} variant="secondary" />)}</Row>
          <Row>
            <Icon label={detail.following ? "Unfollow discussion" : "Follow discussion"} icon={detail.following ? "notifications" : "notifications-outline"} selected={detail.following} disabled={busy}
              onPress={() => action("follow", threadId, { enabled: !detail.following })} />
            <Icon label={detail.bookmarked ? "Remove bookmark" : "Bookmark discussion"} icon={detail.bookmarked ? "bookmark" : "bookmark-outline"} selected={detail.bookmarked} disabled={busy}
              onPress={() => action("bookmark", threadId, { enabled: !detail.bookmarked })} />
            <Icon label="Share discussion link" icon="share-outline" onPress={share} />
            <Icon label="Report discussion" icon="flag-outline" onPress={() => setEditor({ kind: "report" })} />
            {author && !closed ? <Icon label="Edit discussion" icon="create-outline" onPress={() => setEditor({ kind: "thread", id: threadId })} /> : null}
            {author && !detail.thread.deleted_at ? <Icon label="Remove discussion" icon="trash-outline" onPress={() => remove("delete_thread", threadId)} /> : null}
            {moderator ? <Icon label={detail.thread.is_hidden ? "Restore discussion" : "Hide discussion"} icon="eye-off-outline" disabled={busy}
              onPress={() => action(detail.thread.is_hidden ? "restore_thread" : "hide_thread", threadId)} /> : null}
          </Row>
          {shareUrl ? <Text selectable>{shareUrl}</Text> : null}
          {author || moderator ? <BmChoices label="Discussion Status" value={detail.thread.status}
            options={Object.entries(bmStatuses).map(([id, label]) => ({ id, label }))} onChange={value => action("status", threadId, { status: value })} /> : null}
        </Card>
        <Row><SectionTitle>Replies ({detail.reply_total})</SectionTitle>{!closed ? <Button label="Reply" onPress={() => setEditor({ kind: "reply" })} /> : <Pill label="Discussion closed" />}</Row>
        {detail.replies.map(reply => <View key={reply.id} style={[s.reply, reply.parent_reply_id && s.nestedReply]}>
          <MetaText>{reply.author_name}{reply.parent_reply_id ? ` - replying to ${reply.parent_author_name ?? "a response"}` : ""}</MetaText>
          {reply.is_hidden || reply.deleted_at ? <Pill label={reply.deleted_at ? "Removed" : "Hidden"} tone="danger" /> : null}
          <BmBody text={reply.body} />
          <Row><MetaText>{date(reply.created_at)}{reply.updated_at !== reply.created_at ? " - edited" : ""}</MetaText>
            {!closed && !reply.is_hidden && !reply.deleted_at ? <Icon label={`Reply to ${reply.author_name}`} icon="return-down-forward-outline"
              onPress={() => setEditor({ kind: "reply", parent: reply.parent_reply_id ?? reply.id })} /> : null}
            {!reply.is_hidden && !reply.deleted_at ? <Icon label="Quote reply" icon="chatbox-outline" onPress={() => setEditor({ kind: "reply", parent: reply.parent_reply_id ?? reply.id, initialBody: `${reply.author_name}:\n${reply.body}\n\n` })} disabled={closed} /> : null}
            {reply.author_id === profile?.id && !reply.is_hidden && !reply.deleted_at ? <>
              <Icon label="Edit reply" icon="create-outline" onPress={() => setEditor({ kind: "reply", id: reply.id, initialBody: reply.body })} />
              <Icon label="Remove reply" icon="trash-outline" onPress={() => remove("delete_reply", reply.id)} /></> : null}
            <Icon label="Report reply" icon="flag-outline" onPress={() => setEditor({ kind: "report", id: reply.id })} />
            {moderator ? <Icon label={reply.is_hidden ? "Restore reply" : "Hide reply"} icon="eye-off-outline" disabled={busy}
              onPress={() => action(reply.is_hidden ? "restore_reply" : "hide_reply", reply.id)} /> : null}
          </Row>
        </View>)}
        {!detail.replies.length ? <MetaText>No replies yet.</MetaText> : null}
        <Row><Button label="Previous Replies" disabled={replyPage === 0 || loading} variant="secondary" onPress={() => setReplyPage(p => p - 1)} />
          <Button label="Next Replies" disabled={(replyPage + 1) * 50 >= detail.reply_total || loading} onPress={() => setReplyPage(p => p + 1)} /></Row>
      </> : null}
    </>}
    {preview ? <BmChunkPreview chunk={preview} close={() => setPreview(null)} /> : null}
  </Screen>;
}
function Icon({ label, icon, onPress, selected = false, disabled = false }: { label: string; icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void; selected?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} aria-pressed={selected} disabled={disabled} onPress={onPress}
    {...(Platform.OS === "web" ? { title: label } : {})} style={({ pressed }) => [s.icon, (selected || pressed) && { backgroundColor: "#EAF1FF" }, disabled && { opacity: 0.4 }]}>
    <Ionicons name={icon} size={21} color={/Remove|Report|Hide/.test(label) ? "#A33030" : "#235789"} />
  </Pressable>;
}
function date(value: string) { return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
const s = StyleSheet.create({
  filters: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 12, gap: 12 },
  threadTitle: { fontSize: 19, lineHeight: 27, fontWeight: "700", color: theme.colors.ink },
  reply: { borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 14, gap: 10 },
  nestedReply: { marginLeft: 20, borderLeftWidth: 2, paddingLeft: 12, borderLeftColor: "#C9D9F8" },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }
});
