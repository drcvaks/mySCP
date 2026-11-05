import { Ionicons } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";
import { Button, Card, FormInput, MetaText, Pill, Row, Screen, SectionTitle, StatusBanner } from "../../src/shared/components";
import { Avatar, EmptyState, IconTile, Inline, OverflowMenu, SkeletonList, MenuItem } from "../../src/shared/ui";
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
import { openBmResourceLink } from "../../src/shared/beisMidrashLinks";
import { BmActionButton as Icon } from "../../src/shared/BmActionButton";
import { BmDiscussionCard } from "../../src/shared/BmDiscussionCard";
import { BmAreaPicker } from "../../src/shared/BmAreaPicker";

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
  const lastFetchKey = useRef("");
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
    if (!access) { lastFetchKey.current = ""; setDetail(null); setList({ items: [], total: 0 }); return; }
    // Only clear what is on screen when the view itself changed (another thread, page or filter).
    // A refetch after follow / bookmark / status keeps the current content visible instead of blanking the page.
    const fetchKey = `${profile?.id}/${selectedProgramId}/` + (threadId ? `thread:${threadId}:${replyPage}` : `list:${filters}`);
    const viewChanged = lastFetchKey.current !== fetchKey; lastFetchKey.current = fetchKey;
    let cancelled = false; setLoading(true); setError("");
    if (viewChanged) { setDetail(null); setList({ items: [], total: 0 }); }
    (threadId ? getBmThread(threadId, replyPage * 50).then(value => { if (!cancelled) setDetail(value); })
      : listBmThreads(JSON.parse(filters)).then(value => { if (!cancelled) setList(value); }))
      .catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [access, profile?.id, selectedProgramId, threadId, replyPage, threadId ? null : filters, revision]);

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
    <View style={s.intro}>
      <IconTile icon="people-circle" size={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.introTitle}>Worldwide Beis Midrash</Text>
        <MetaText>Private discussion for Rabbonim. Community replies are not official SCP rulings.</MetaText>
      </View>
    </View>
    <StatusBanner message={error} tone="error" />
    {editor ? <BeisMidrashEditor key={`${editor.kind}/${editor.id ?? "new"}/${editor.parent ?? ""}`} target={editor} detail={detail}
      initialProgram={program === "all" ? selectedProgramId : program}
      initialCategory={category === "all" ? area === "all" ? "notes" : bmAreas[area].categories[0] : category as BmCategory}
      close={() => setEditor(null)} saved={(id, destination) => {
        setEditor(null); setRevision(v => v + 1);
        if (destination) { setArea(bmAreaForCategory(destination)); setCategory(destination); setFilterChunks([]); setPage(0); }
        if (id) openThread(id);
      }} /> : <>
      {threadId || reports ? <View style={s.actionBar}><Icon label="Back to Discussions" caption="Back to Discussions" icon="arrow-back" solid
        description="Return to the discussion list with your current filters." onPress={back} /></View> : null}
      {loading && (threadId ? !detail : !list.items.length) ? <><MetaText>Loading discussions...</MetaText><SkeletonList count={threadId ? 1 : 3} /></> : null}
      {reports ? <>
        <SectionTitle>Reported Content</SectionTitle>
        {!reports.length ? <EmptyState icon="checkmark-circle" title="No open reports." message="Nothing is waiting for moderator review." /> : null}
        {reports.map(report => <Card key={report.id}><SectionTitle>{report.title}</SectionTitle><BmBody text={report.reason} />
          <MetaText>{report.reply_id ? "Reply report" : "Discussion report"} - {date(report.created_at)}</MetaText>
          <Row><Button label="Open Discussion" onPress={() => openThread(report.thread_id)} />
            <Button label="Mark Reviewed" variant="secondary" disabled={busy} onPress={async () => {
              if (await action("review_report", report.id)) await showReports();
            }} /></Row></Card>)}
      </> : !threadId ? <>
        <BmAreaPicker value={area} onChange={value => { setArea(value); setCategory("all"); setFilterChunks([]); setPage(0); }} />
        {area !== "resources" ? <BmChoices label={area === "message" ? "Message Board" : area === "teaching" ? "Teaching & Chaburah" : "Topics"} value={category}
          options={[{ id: "all", label: "All Topics" }, ...(area === "all" ? Object.keys(bmCategories) as BmCategory[] : bmAreas[area].categories).map(id => ({ id, label: bmCategories[id] }))]}
          onChange={value => { setCategory(value); setFilterChunks([]); setPage(0); }} /> : null}
        <FormInput placeholder="Search discussions and replies" value={search} onChangeText={setSearch} />
        <View style={s.actionBar}>
          <View style={{ flex: 1, minWidth: 160 }}><Button label="Start Discussion" icon="add-circle" onPress={() => setEditor({ kind: "thread" })} /></View>
          <Icon label="Discussion filters" caption="Filters" description={showFilters ? "Hide filters for zeman, status, section, author, and official material." : "Show filters for zeman, status, section, author, and official material."}
            icon="options" selected={showFilters} onPress={() => setShowFilters(v => !v)} />
          {moderator ? <Icon label="Review reports" description="Review content flagged for Global Admin attention." icon="flag" tone="red" onPress={showReports} /> : null}
        </View>
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
        {!loading && !error && !list.items.length ? <EmptyState icon="chatbubbles-outline" title="No discussions match these filters."
          message="Try another topic or clear the search, or use Start Discussion above to begin one." /> : null}
        {list.items.map(thread => <BmDiscussionCard key={thread.id} thread={thread} onOpen={() => openThread(thread.id)}
          programLabel={thread.program_id ? programName(thread.program_id, programs) : "General SCP"} activityLabel={date(thread.last_activity_at)} />)}
        <Row><Button label="Previous" disabled={page === 0 || loading} variant="secondary" onPress={() => setPage(p => p - 1)} />
          <MetaText>Page {page + 1} - {list.total} discussions</MetaText><Button label="Next" disabled={(page + 1) * 25 >= list.total || loading} onPress={() => setPage(p => p + 1)} /></Row>
      </> : detail ? <>
        <Card>
          <View style={s.threadHead}>
            <Avatar name={detail.thread.author_name || "?"} size={42} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[s.threadTitle, { writingDirection: bmIsRtl(detail.thread.title) ? "rtl" : "ltr", textAlign: bmIsRtl(detail.thread.title) ? "right" : "left" }]}>{detail.thread.title}</Text>
              <MetaText>{detail.thread.author_name} - {date(detail.thread.created_at)} - {detail.thread.program_id ? programName(detail.thread.program_id, programs) : "General SCP"}</MetaText>
            </View>
          </View>
          <Inline><Pill label={bmCategories[detail.thread.category]} tone="primary" /><Pill label={bmStatuses[detail.thread.status]} tone={detail.thread.status === "answered" ? "success" : "neutral"} />
            {detail.thread.is_hidden ? <Pill label="Hidden" tone="danger" /> : null}{detail.thread.deleted_at ? <Pill label="Removed" tone="danger" /> : null}</Inline>
          <BmBody text={detail.thread.body ?? ""} />
          {detail.thread.category === "resources" && detail.thread.resource_url ? <View style={s.resourceBox}>
            <IconTile icon="link" tone="info" size={36} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {detail.thread.resource_label ? <Text style={s.resourceTitle}>{detail.thread.resource_label}</Text> : null}
              <MetaText>{resourceHost(detail.thread.resource_url)}</MetaText>
            </View>
            <Button label="Open Resource" variant="secondary" compact onPress={() => {
              void openBmResourceLink(detail.thread.resource_url!).catch(e => setError(e instanceof Error ? e.message : "Unable to open resource."));
            }} />
          </View> : null}
          {detail.thread.category === "resources" && detail.resources?.length ? <View style={{ gap: 8 }}>
            <SectionTitle>Resources</SectionTitle>
            {detail.resources.map(resource => <Button key={resource.id} label={`Download ${resource.file_name}`} variant="secondary" icon="download-outline"
              onPress={() => { void openBmResource(resource).catch(e => setError(e instanceof Error ? e.message : "Unable to open attachment.")); }} />)}
          </View> : null}
          {detail.chunks.length ? <Inline>{detail.chunks.map(chunk => <Button key={chunk.id} label={`View ${chunk.source_type === "qa" ? "Question" : "Notes"} ${chunkDisplayCode(chunk.code)}`}
            icon="document-text-outline" compact onPress={() => setPreview(chunk)} variant="secondary" />)}</Inline> : null}
          <View style={s.actionBar}>
            <Icon label={detail.following ? "Unfollow discussion" : "Follow discussion"} caption={detail.following ? "Following" : "Follow"} minWidth={128}
              description={detail.following ? "Stop tracking new replies in Following and Unread." : "Track this discussion and its new replies in Following and Unread."}
              icon={detail.following ? "notifications" : "notifications-outline"} selected={detail.following} disabled={busy}
              onPress={() => action("follow", threadId, { enabled: !detail.following })} />
            <Icon label={detail.bookmarked ? "Remove bookmark" : "Bookmark discussion"} caption={detail.bookmarked ? "Saved" : "Save"} tone="amber" minWidth={100}
              description={detail.bookmarked ? "Remove this discussion from Bookmarked." : "Save this discussion in Bookmarked for later."}
              icon={detail.bookmarked ? "bookmark" : "bookmark-outline"} selected={detail.bookmarked} disabled={busy}
              onPress={() => action("bookmark", threadId, { enabled: !detail.bookmarked })} />
            <Icon label="Share discussion link" caption="Share" description="Share a private discussion link. Rabbi sign-in is still required." icon="share" tone="teal" onPress={share} />
            {author && !closed ? <Icon label="Edit discussion" caption="Edit" description="Update the title, message, links, or attachments of your discussion." icon="create" onPress={() => setEditor({ kind: "thread", id: threadId })} /> : null}
            <OverflowMenu label="More actions" caption={undefined} items={[
              { label: "Report discussion", icon: "flag", destructive: true, hint: "Flag this discussion for Global Admin review.", onPress: () => setEditor({ kind: "report" }) },
              ...(author && !detail.thread.deleted_at ? [{ label: "Remove discussion", icon: "trash", destructive: true, hint: "Remove your discussion from view for other Rabbonim. You will be asked to confirm.", onPress: () => { void remove("delete_thread", threadId); } } as MenuItem] : []),
              ...(moderator ? [{ label: detail.thread.is_hidden ? "Restore discussion" : "Hide discussion", icon: detail.thread.is_hidden ? "eye" : "eye-off", destructive: true, disabled: busy,
                hint: detail.thread.is_hidden ? "Make this moderated discussion visible again." : "Hide this discussion from other Rabbonim for moderation.",
                onPress: () => { void action(detail.thread.is_hidden ? "restore_thread" : "hide_thread", threadId); } } as MenuItem] : [])
            ]} />
          </View>
          {shareUrl ? <Text selectable style={s.shareUrl}>{shareUrl}</Text> : null}
          {author || moderator ? <BmChoices label="Discussion Status" value={detail.thread.status}
            options={Object.entries(bmStatuses).map(([id, label]) => ({ id, label }))} onChange={value => action("status", threadId, { status: value })} /> : null}
        </Card>
        <View style={s.repliesHead}>
          <SectionTitle>Replies ({detail.reply_total})</SectionTitle>
          {!closed ? <Button label="Reply" icon="return-down-forward" onPress={() => setEditor({ kind: "reply" })} /> : <Pill label="Discussion closed" icon="lock-closed" />}
        </View>
        {detail.replies.map(reply => {
          const live = !reply.is_hidden && !reply.deleted_at;
          const mine = reply.author_id === profile?.id;
          const menu: MenuItem[] = [
            ...(mine && live ? [
              { label: "Edit reply", icon: "create", hint: "Update the text of your reply.", onPress: () => setEditor({ kind: "reply", id: reply.id, initialBody: reply.body }) } as MenuItem,
              { label: "Remove reply", icon: "trash", destructive: true, hint: "Remove your reply from view. You will be asked to confirm.", onPress: () => { void remove("delete_reply", reply.id); } } as MenuItem] : []),
            { label: "Report reply", icon: "flag", destructive: true, hint: "Flag this reply for Global Admin review.", onPress: () => setEditor({ kind: "report", id: reply.id }) }
          ];
          return <View key={reply.id} style={[s.reply, reply.parent_reply_id && s.nestedReply, mine && s.mineReply]}>
            <View style={s.replyHead}>
              <Avatar name={reply.author_name || "?"} size={30} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.replyAuthor}>{reply.author_name}{reply.parent_reply_id ? <Text style={s.replyTo}>{` - replying to ${reply.parent_author_name ?? "a response"}`}</Text> : null}</Text>
              </View>
              {!live ? <Pill label={reply.deleted_at ? "Removed" : "Hidden"} tone="danger" /> : null}
            </View>
            <BmBody text={reply.body} />
            <View style={s.actionBar}>
              <MetaText>{date(reply.created_at)}{reply.updated_at !== reply.created_at ? " - edited" : ""}</MetaText>
              <View style={{ flex: 1 }} />
              {!closed && live ? <Icon label={`Reply to ${reply.author_name}`} icon="return-down-forward-outline"
                description="Write a response linked to this reply."
                onPress={() => setEditor({ kind: "reply", parent: reply.parent_reply_id ?? reply.id })} /> : null}
              {live ? <Icon label="Quote reply" description="Include this reply's text in your response." icon="chatbox" tone="teal" onPress={() => setEditor({ kind: "reply", parent: reply.parent_reply_id ?? reply.id, initialBody: `${reply.author_name}:\n${reply.body}\n\n` })} disabled={closed} /> : null}
              {moderator && reply.is_hidden && !reply.deleted_at ? <Icon label="Restore reply" caption="Restore"
                description="Make this moderated reply visible again." icon="eye" tone="red" disabled={busy}
                onPress={() => action("restore_reply", reply.id)} /> : null}
              <OverflowMenu label="More actions" items={[
                ...menu,
                ...(moderator && live ? [{ label: "Hide reply", icon: "eye-off", destructive: true, disabled: busy, hint: "Hide this reply from other Rabbonim for moderation.",
                  onPress: () => { void action("hide_reply", reply.id); } } as MenuItem] : [])
              ]} />
            </View>
          </View>;
        })}
        {!detail.replies.length ? <EmptyState icon="chatbubble-outline" title="No replies yet." message={closed ? "This discussion is closed." : "Be the first to add a sourced response."} /> : null}
        {detail.reply_total > 50 ? <Row><Button label="Previous Replies" disabled={replyPage === 0 || loading} variant="secondary" onPress={() => setReplyPage(p => p - 1)} />
          <Button label="Next Replies" disabled={(replyPage + 1) * 50 >= detail.reply_total || loading} onPress={() => setReplyPage(p => p + 1)} /></Row> : null}
      </> : null}
    </>}
    {preview ? <BmChunkPreview chunk={preview} close={() => setPreview(null)} /> : null}
  </Screen>;
}
function date(value: string) { return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function resourceHost(value: string) { try { return new URL(value).host; } catch { return "External resource"; } }
const s = StyleSheet.create({
  intro: { flexDirection: "row", alignItems: "center", gap: 12 },
  introTitle: { color: theme.colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  filters: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 14, gap: 12 },
  threadHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  threadTitle: { fontSize: 20, lineHeight: 28, fontWeight: "800", color: theme.colors.ink },
  resourceBox: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, backgroundColor: theme.colors.infoSoft, borderRadius: theme.radius.md, padding: 12 },
  resourceTitle: { color: theme.colors.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  shareUrl: { color: theme.colors.info, fontSize: 13, lineHeight: 18 },
  repliesHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 },
  reply: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: 14, gap: 10 },
  nestedReply: { marginLeft: 18, borderLeftWidth: 3, borderLeftColor: theme.colors.primaryBorder },
  mineReply: { backgroundColor: "#FAFBFE", borderColor: theme.colors.primaryBorder },
  replyHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  replyAuthor: { color: theme.colors.ink, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  replyTo: { color: theme.colors.muted, fontWeight: "500" },
  actionBar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }
});
