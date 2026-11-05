import { ProgramSelector } from "../../src/shared/ProgramSelector";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  FormInput,
  IconTile,
  MetaText,
  Pill,
  Row,
  Screen,
  SectionTitle,
  SegmentedTabs,
  StatusBanner,
  TextArea,
  styles
} from "../../src/shared/components";
import { fileCoverageDetailLabel, learningFileTypeLabel } from "../../src/shared/format";
import { openLearningFile } from "../../src/shared/openLearningFile";
import { PacketPreviewModal } from "../../src/shared/PacketPreviewModal";
import { materialTextStyle } from "../../src/shared/materialLanguages";
import { supabase } from "../../src/lib/supabase";
import { theme } from "../../src/shared/theme";
import { useRefreshOnFocus } from "../../src/shared/useRefreshOnFocus";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";
import { Announcement, DiscussionMessage } from "../../src/shared/types";
import { Ionicons } from "@expo/vector-icons";

type MyChaburahSection = "announcements" | "discussion" | "members" | "files" | "askRav";
type MessagePostMode = "announcement" | "discussion";
type ChaburahMessageEntry =
  | { announcement: Announcement; createdAt: string; id: string; kind: "announcement" }
  | { createdAt: string; id: string; kind: "discussion"; message: DiscussionMessage };

export default function MyChaburahScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView | null>(null);
  const markedDiscussionReadRef = useRef("");
  const scrolledToTargetRef = useRef("");
  const { profile } = useAuthState();
  const {
    announcements,
    chaburahMemberDirectory,
    chaburos,
    deleteDiscussionMessage,
    discussionMessages,
    discussionUnreadCount,
    editDiscussionMessage,
    hideDiscussionMessage,
    learningFiles,
    loading,
    markDiscussionRead,
    refresh,
    selectedChaburahId,
    submitDiscussionMessage
  } = useAppState();
  useRefreshOnFocus(refresh);
  const [messagePostMode, setMessagePostMode] = useState<MessagePostMode>("discussion");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [discussionBody, setDiscussionBody] = useState("");
  const [discussionMessage, setDiscussionMessage] = useState("");
  const [postingDiscussion, setPostingDiscussion] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingAnnouncementTitle, setEditingAnnouncementTitle] = useState("");
  const [editingAnnouncementBody, setEditingAnnouncementBody] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageBody, setEditingMessageBody] = useState("");
  const [previewPacketId, setPreviewPacketId] = useState<string | null>(null);
  const [sectionOffsets, setSectionOffsets] = useState<Partial<Record<MyChaburahSection, number>>>({});
  const requestedSection = Array.isArray(params.section) ? params.section[0] : params.section;
  const targetSection = isMyChaburahSection(requestedSection) ? requestedSection : undefined;
  const chaburah = chaburos.find((item) => item.id === selectedChaburahId);
  const activeMembers = chaburahMemberDirectory.filter((member) => member.chaburahId === selectedChaburahId);
  const currentMembership = activeMembers.find((member) => member.userId === profile?.id);
  const canModerateDiscussion =
    profile?.role === "global_admin" || currentMembership?.memberRole === "rabbi" || currentMembership?.memberRole === "admin";
  const localAnnouncements = announcements.filter((item) => item.chaburahId === selectedChaburahId);
  const localDiscussionMessages = discussionMessages.filter((item) => item.chaburahId === selectedChaburahId);
  const chaburahMessages = buildChaburahMessages(localAnnouncements, localDiscussionMessages);
  const canPostDiscussion = chaburah?.discussionEnabled ?? false;
  const canPostAnnouncement = canModerateDiscussion;
  const effectivePostMode = canPostAnnouncement && (!canPostDiscussion || messagePostMode === "announcement") ? "announcement" : "discussion";
  const localFiles = learningFiles.filter((item) => item.visibility === "chaburah" && item.chaburahId === selectedChaburahId);
  const indexItems: { key: MyChaburahSection; label: string; show: boolean; count?: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "discussion", label: "Messages", show: true, count: discussionUnreadCount > 0 ? discussionUnreadCount : chaburahMessages.length, icon: "chatbubbles-outline" },
    { key: "files", label: "Files", show: true, count: localFiles.length, icon: "folder-open-outline" },
    { key: "members", label: "Members", show: true, count: activeMembers.length, icon: "people-outline" },
    { key: "askRav", label: "Ask Rav", show: chaburah?.askRavEnabled ?? false, icon: "help-buoy-outline" }
  ];

  function trackSection(section: MyChaburahSection, y: number) {
    setSectionOffsets((current) => (current[section] === y ? current : { ...current, [section]: y }));
  }

  async function markCurrentDiscussionRead() {
    if (!selectedChaburahId || markedDiscussionReadRef.current === selectedChaburahId) return;
    markedDiscussionReadRef.current = selectedChaburahId;
    await markDiscussionRead();
  }

  function handleContentScroll(event: { nativeEvent: { contentOffset: { y: number }; layoutMeasurement: { height: number } } }) {
    const discussionOffset = sectionOffsets.discussion;
    if (discussionOffset === undefined) return;
    const visibleBottom = event.nativeEvent.contentOffset.y + event.nativeEvent.layoutMeasurement.height;
    if (visibleBottom >= discussionOffset + 40) {
      void markCurrentDiscussionRead();
    }
  }

  async function jumpToSection(section: MyChaburahSection) {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.getElementById(sectionDomId(section))?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (section === "discussion") await markDiscussionRead();
      return;
    }

    const offset = sectionOffsets[section];
    if (offset === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(offset - 12, 0), animated: true });
    if (section === "discussion") await markDiscussionRead();
  }

  async function openChaburahFile(file: (typeof learningFiles)[number]) {
    if (file.fileType === "custom_review_packet" && file.reviewPacketId) {
      setPreviewPacketId(file.reviewPacketId);
      return;
    }
    await openLearningFile(file);
  }

  useEffect(() => {
    if (!targetSection || scrolledToTargetRef.current === targetSection) return;
    const offset = sectionOffsets[targetSection];
    if (Platform.OS === "web" && typeof document !== "undefined") {
      scrolledToTargetRef.current = targetSection;
      requestAnimationFrame(() => {
        document.getElementById(sectionDomId(targetSection))?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (targetSection === "discussion") void markCurrentDiscussionRead();
      });
      return;
    }
    if (offset === undefined) return;
    scrolledToTargetRef.current = targetSection;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(offset - 12, 0), animated: true });
      if (targetSection === "discussion") void markCurrentDiscussionRead();
    });
  }, [sectionOffsets, targetSection]);

  async function postDiscussionMessage() {
    setPostingDiscussion(true);
    setDiscussionMessage("");
    const result = await submitDiscussionMessage(discussionBody);
    setPostingDiscussion(false);
    if (result) {
      setDiscussionMessage(result);
      return;
    }
    setDiscussionBody("");
    setDiscussionMessage("Message posted.");
  }

  async function postAnnouncement() {
    if (!profile?.id || !selectedChaburahId) {
      setDiscussionMessage("Join a chaburah before posting an announcement.");
      return;
    }
    if (!announcementBody.trim()) {
      setDiscussionMessage("Add an announcement message.");
      return;
    }
    setPostingDiscussion(true);
    setDiscussionMessage("");
    const { error } = await supabase.from("announcements").insert({
      chaburah_id: selectedChaburahId,
      title: announcementTitle.trim() || "Announcement",
      body: announcementBody.trim(),
      visibility: "chaburah",
      posted_by: profile.id
    });
    setPostingDiscussion(false);
    if (error) {
      setDiscussionMessage(error.message);
      return;
    }
    setAnnouncementTitle("");
    setAnnouncementBody("");
    setDiscussionMessage("Announcement posted.");
    await refresh();
  }

  function startEditingAnnouncement(announcement: Announcement) {
    setEditingAnnouncementId(announcement.id);
    setEditingAnnouncementTitle(announcement.title === "Announcement" ? "" : announcement.title);
    setEditingAnnouncementBody(announcement.body);
    setEditingMessageId(null);
    setEditingMessageBody("");
    setDiscussionMessage("");
  }

  async function saveEditedAnnouncement() {
    if (!editingAnnouncementId) return;
    if (!editingAnnouncementBody.trim()) {
      setDiscussionMessage("Add an announcement message.");
      return;
    }
    setPostingDiscussion(true);
    setDiscussionMessage("");
    const { error } = await supabase
      .from("announcements")
      .update({
        title: editingAnnouncementTitle.trim() || "Announcement",
        body: editingAnnouncementBody.trim()
      })
      .eq("id", editingAnnouncementId);
    setPostingDiscussion(false);
    if (error) {
      setDiscussionMessage(error.message);
      return;
    }
    setEditingAnnouncementId(null);
    setEditingAnnouncementTitle("");
    setEditingAnnouncementBody("");
    setDiscussionMessage("Announcement updated.");
    await refresh();
  }

  function cancelAnnouncementEdit() {
    setEditingAnnouncementId(null);
    setEditingAnnouncementTitle("");
    setEditingAnnouncementBody("");
  }

  function confirmDeleteAnnouncement(announcementId: string) {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this announcement? Participants will no longer see it.")) {
        deleteAnnouncement(announcementId);
      }
      return;
    }

    Alert.alert("Delete announcement?", "Participants will no longer see it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteAnnouncement(announcementId) }
    ]);
  }

  async function deleteAnnouncement(announcementId: string) {
    setPostingDiscussion(true);
    setDiscussionMessage("");
    const { error } = await supabase.from("announcements").delete().eq("id", announcementId);
    setPostingDiscussion(false);
    if (error) {
      setDiscussionMessage(error.message);
      return;
    }
    if (editingAnnouncementId === announcementId) cancelAnnouncementEdit();
    setDiscussionMessage("Announcement deleted.");
    await refresh();
  }

  async function postChaburahMessage() {
    if (effectivePostMode === "announcement") {
      await postAnnouncement();
      return;
    }
    await postDiscussionMessage();
  }

  function startEditingMessage(messageId: string, body: string) {
    setEditingMessageId(messageId);
    setEditingMessageBody(body);
    setDiscussionMessage("");
  }

  async function saveEditedMessage() {
    if (!editingMessageId) return;
    setPostingDiscussion(true);
    setDiscussionMessage("");
    const result = await editDiscussionMessage(editingMessageId, editingMessageBody);
    setPostingDiscussion(false);
    if (result) {
      setDiscussionMessage(result);
      return;
    }
    setEditingMessageId(null);
    setEditingMessageBody("");
    setDiscussionMessage("Message updated.");
  }

  function confirmDeleteMessage(messageId: string) {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this message? This removes your message from the discussion.")) {
        deleteMessage(messageId);
      }
      return;
    }

    Alert.alert("Delete message?", "This removes your message from the discussion.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMessage(messageId) }
    ]);
  }

  async function deleteMessage(messageId: string) {
    setPostingDiscussion(true);
    setDiscussionMessage("");
    const result = await deleteDiscussionMessage(messageId);
    setPostingDiscussion(false);
    setDiscussionMessage(result ?? "Message deleted.");
  }

  async function hideMessage(messageId: string) {
    setPostingDiscussion(true);
    setDiscussionMessage("");
    const result = await hideDiscussionMessage(messageId);
    setPostingDiscussion(false);
    setDiscussionMessage(result ?? "Message hidden.");
  }

  if (!chaburah) {
    return (
      <Screen title="My Chaburah" eyebrow="Membership" onRefresh={refresh} refreshing={loading}>
        <Card>
          <EmptyState
            icon="people-outline"
            title="No Chaburah Selected"
            body="Join a chaburah to see its schedule, files, announcements, and rabbi."
            action={<Button label="Browse Directory" onPress={() => router.push("/(tabs)/directory")} icon="compass-outline" />}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      title="My Chaburah"
      eyebrow={chaburah?.name}
      onRefresh={refresh}
      refreshing={loading}
      scrollRef={scrollRef}
      onScroll={handleContentScroll}
      programSelector={<ProgramSelector />}
    >
      {/* Hero Chaburah Banner */}
      <View style={localStyles.heroCard}>
        <View style={localStyles.heroAccent} />
        <View style={localStyles.heroBody}>
          <View style={localStyles.heroTopRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1, minWidth: 220 }}>
              <IconTile icon="people-outline" tone="accent" size={48} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={localStyles.heroTitle}>{chaburah?.name}</Text>
                <Text style={localStyles.heroRabbi}>Led by {chaburah?.rabbiName}</Text>
              </View>
            </View>
            <Pill label={chaburah?.discussionEnabled ? "Discussion On" : "Announcement Only"} tone="accent" />
          </View>

          <View style={localStyles.heroDetailsGrid}>
            <View style={localStyles.heroDetailItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.accent} />
              <Text style={localStyles.heroDetailText}>{chaburah?.schedule || "Schedule TBA"}</Text>
            </View>
            <View style={localStyles.heroDetailItem}>
              <Ionicons name="location-outline" size={16} color={theme.colors.accent} />
              <Text style={localStyles.heroDetailText}>{chaburah?.address || chaburah?.city || "Location TBA"}</Text>
            </View>
          </View>

          <View style={localStyles.heroActionsRow}>
            {chaburah?.zoomLink && /^https:\/\//i.test(chaburah.zoomLink) ? (
              <Button
                label="Join Zoom Shiur"
                icon="videocam-outline"
                onPress={() => { void Linking.openURL(chaburah.zoomLink!).catch(() => Alert.alert("Cannot Open Zoom", "Please try again or contact your Rav for the shiur link.")); }}
              />
            ) : null}
            <Button
              label="Join or Change Chaburah"
              icon="swap-horizontal-outline"
              onPress={() => router.push("/(tabs)/directory")}
              variant="secondary"
            />
          </View>
        </View>
      </View>

      {/* Quick Jump Bar */}
      <View style={localStyles.indexBar}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="compass-outline" size={16} color={theme.colors.muted} />
          <Text style={localStyles.indexLabel}>Jump to:</Text>
        </View>
        <View style={localStyles.indexGrid}>
          {indexItems
            .filter((item) => item.show)
            .map((item) => (
              <Pressable key={item.key} accessibilityRole="button" onPress={() => jumpToSection(item.key)} style={localStyles.indexButton}>
                <Ionicons name={item.icon} size={15} color={theme.colors.primary} />
                <Text style={localStyles.indexButtonText}>{item.label}</Text>
                {typeof item.count === "number" ? (
                  <View style={localStyles.indexBadge}>
                    <Text style={localStyles.indexCount}>{item.count}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
        </View>
      </View>

      {/* Messages & Announcements Section */}
      <View
        nativeID={sectionDomId("discussion")}
        onLayout={(event) => trackSection("discussion", event.nativeEvent.layout.y)}
      >
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <SectionTitle icon="chatbubbles-outline">Chaburah Messages</SectionTitle>
              <Text style={styles.muted}>
                Official announcements and chaburah discussion in one place.
              </Text>
            </View>
            <Pill label={chaburah.discussionEnabled ? "Discussion On" : "Announcements Only"} tone={chaburah.discussionEnabled ? "success" : "neutral"} />
          </Row>
          {discussionMessage ? (
            <StatusBanner
              message={discussionMessage}
              tone={
                discussionMessage.includes("Announcement") ||
                discussionMessage.includes("posted") ||
                discussionMessage.includes("updated") ||
                discussionMessage.includes("deleted") ||
                discussionMessage.includes("hidden")
                  ? "success"
                  : "error"
              }
            />
          ) : null}
          <>
            {chaburahMessages.length === 0 ? (
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="No chaburah messages yet"
                body="Official updates from your Rav and chaburah discussion notes will appear here."
              />
            ) : (
              <ScrollView contentContainerStyle={{ gap: 10, paddingRight: 2 }} nestedScrollEnabled style={{ maxHeight: 440 }}>
                {chaburahMessages.map((entry) => {
                  if (entry.kind === "announcement") {
                    const isEditingAnnouncement = editingAnnouncementId === entry.announcement.id;
                    const visibleAnnouncementTitle =
                      entry.announcement.title === "Announcement" ? "" : entry.announcement.title.trim();
                    return (
                      <View key={entry.id} style={localStyles.announcementMessage}>
                        <View style={localStyles.discussionMessageHeader}>
                          <View style={localStyles.discussionMessageMeta}>
                            <Row>
                              <Pill label="Announcement" tone="accent" />
                              {entry.announcement.isPinned ? <Pill label="Pinned" tone="primary" /> : null}
                            </Row>
                            {isEditingAnnouncement || !visibleAnnouncementTitle ? null : (
                              <Text style={localStyles.announcementTitle}>{visibleAnnouncementTitle}</Text>
                            )}
                          </View>
                          {canPostAnnouncement && !isEditingAnnouncement ? (
                            <View style={localStyles.discussionActions}>
                              <DiscussionAction
                                disabled={postingDiscussion}
                                label="Edit"
                                onPress={() => startEditingAnnouncement(entry.announcement)}
                              />
                              <DiscussionAction
                                disabled={postingDiscussion}
                                label="Delete"
                                onPress={() => confirmDeleteAnnouncement(entry.announcement.id)}
                                tone="danger"
                              />
                            </View>
                          ) : null}
                        </View>
                        {isEditingAnnouncement ? (
                          <View style={{ gap: 8 }}>
                            <FormInput
                              onChangeText={setEditingAnnouncementTitle}
                              placeholder="Announcement title (optional)"
                              value={editingAnnouncementTitle}
                            />
                            <TextArea
                              onChangeText={setEditingAnnouncementBody}
                              placeholder="Announcement details..."
                              value={editingAnnouncementBody}
                            />
                            <Row>
                              <Button
                                disabled={postingDiscussion || !editingAnnouncementBody.trim()}
                                label={postingDiscussion ? "Saving..." : "Save Announcement"}
                                onPress={saveEditedAnnouncement}
                              />
                              <Button disabled={postingDiscussion} label="Cancel" onPress={cancelAnnouncementEdit} variant="ghost" />
                            </Row>
                          </View>
                        ) : (
                          <Text style={styles.body}>{entry.announcement.body}</Text>
                        )}
                        <MetaText>{formatDiscussionDate(entry.announcement.postedAt)}</MetaText>
                      </View>
                    );
                  }
                  const message = entry.message;
                  const isAuthor = message.authorId === profile?.id;
                  const isEditing = editingMessageId === message.id;
                  const authorName = message.authorName ?? "Chaburah member";
                  return (
                    <View key={message.id} style={localStyles.discussionMessage}>
                      <View style={localStyles.discussionMessageHeader}>
                        <View style={[localStyles.discussionMessageMeta, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
                          <Avatar name={authorName} size={32} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={localStyles.authorNameText}>{authorName}</Text>
                            <MetaText>{formatDiscussionDate(message.createdAt)}</MetaText>
                          </View>
                        </View>
                        <View style={localStyles.discussionActions}>
                          {message.status !== "active" ? (
                            <Pill label={message.status === "deleted" ? "Deleted" : "Hidden"} tone="neutral" />
                          ) : null}
                          {isAuthor && message.status === "active" && !isEditing ? (
                            <DiscussionAction
                              disabled={postingDiscussion}
                              label="Edit"
                              onPress={() => startEditingMessage(message.id, message.body)}
                            />
                          ) : null}
                          {isAuthor && message.status === "active" && !isEditing ? (
                            <DiscussionAction
                              disabled={postingDiscussion}
                              label="Delete"
                              onPress={() => confirmDeleteMessage(message.id)}
                              tone="danger"
                            />
                          ) : null}
                          {canModerateDiscussion && message.status === "active" && !isEditing ? (
                            <DiscussionAction disabled={postingDiscussion} label="Hide" onPress={() => hideMessage(message.id)} />
                          ) : null}
                        </View>
                      </View>
                      {isEditing ? (
                        <View style={{ gap: 8 }}>
                          <TextArea onChangeText={setEditingMessageBody} placeholder="Edit message..." value={editingMessageBody} />
                          <Row>
                            <Button
                              disabled={postingDiscussion || !editingMessageBody.trim()}
                              label={postingDiscussion ? "Saving..." : "Save"}
                              onPress={saveEditedMessage}
                            />
                            <Button
                              disabled={postingDiscussion}
                              label="Cancel"
                              onPress={() => {
                                setEditingMessageId(null);
                                setEditingMessageBody("");
                              }}
                              variant="ghost"
                            />
                          </Row>
                        </View>
                      ) : (
                        <Text style={message.status === "active" ? styles.body : styles.muted}>
                          {message.status === "active"
                            ? message.body
                            : message.status === "deleted"
                              ? "This message was deleted by the author."
                              : "This message was hidden by a moderator."}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
            {canPostAnnouncement || canPostDiscussion ? (
              <View style={localStyles.composerBox}>
                {canPostAnnouncement && canPostDiscussion ? (
                  <SegmentedTabs
                    options={[
                      { key: "discussion", label: "Discussion" },
                      { key: "announcement", label: "Announcement" }
                    ]}
                    value={effectivePostMode}
                    onChange={setMessagePostMode}
                  />
                ) : null}
                {effectivePostMode === "announcement" ? (
                  <>
                    <Text style={styles.muted}>Post an official announcement. Participants will see it highlighted in gold.</Text>
                    <FormInput onChangeText={setAnnouncementTitle} placeholder="Announcement title (optional), e.g. Shiur canceled tonight" value={announcementTitle} />
                    <TextArea onChangeText={setAnnouncementBody} placeholder="Announcement details..." value={announcementBody} />
                  </>
                ) : (
                  <TextArea
                    onChangeText={setDiscussionBody}
                    placeholder="Share a question, note, or chaburah discussion point..."
                    value={discussionBody}
                  />
                )}
                <View style={{ alignSelf: "flex-start" }}>
                  <Button
                    disabled={
                      postingDiscussion ||
                      (effectivePostMode === "announcement"
                        ? !announcementBody.trim()
                        : !discussionBody.trim())
                    }
                    label={
                      postingDiscussion
                        ? "Posting..."
                        : effectivePostMode === "announcement"
                          ? "Post Announcement"
                          : "Post Message"
                    }
                    icon={effectivePostMode === "announcement" ? "megaphone-outline" : "send-outline"}
                    onPress={postChaburahMessage}
                  />
                </View>
              </View>
            ) : (
              <Text style={styles.muted}>Discussion is not enabled for this chaburah yet. Announcements from the Rabbi or Admin will appear here.</Text>
            )}
          </>
        </Card>
      </View>

      {/* Recent Files Section */}
      <View nativeID={sectionDomId("files")} onLayout={(event) => trackSection("files", event.nativeEvent.layout.y)}>
        <Card>
          <View style={localStyles.filesHeader}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <SectionTitle icon="folder-open-outline">Recent Files</SectionTitle>
              <Text style={styles.muted}>Newest source sheets, review sheets, recordings, and links.</Text>
            </View>
            <View style={localStyles.viewAllFilesAction}>
              <Button label="View All Files" onPress={() => router.push("/(tabs)/files")} variant="secondary" />
            </View>
          </View>
          {localFiles.length === 0 ? <Text style={styles.muted}>No learning files have been published yet.</Text> : null}
          {localFiles.length > 0 ? (
            <>
              <ScrollView contentContainerStyle={{ gap: 10, paddingRight: 2 }} nestedScrollEnabled style={{ maxHeight: 320 }}>
                {localFiles.slice(0, 10).map((file) => (
                  <View key={file.id} style={localStyles.fileRow}>
                    <IconTile
                      icon={
                        file.fileType === "recording"
                          ? "mic-outline"
                          : file.fileType === "custom_review_packet"
                            ? "layers-outline"
                            : "document-text-outline"
                      }
                      tone={file.fileType === "custom_review_packet" ? "accent" : "brand"}
                      size={38}
                    />
                    <View style={localStyles.fileInfo}>
                      <Text style={[styles.body, { fontWeight: "700" }, materialTextStyle(file.language)]}>{file.title}</Text>
                      <MetaText>{fileCoverageDetailLabel(file.coverage, file.week)} · {learningFileTypeLabel(file)} · {file.language === "he" ? "Hebrew" : "English"}</MetaText>
                    </View>
                    <View style={localStyles.fileActions}>
                      <Button
                        label={file.fileType === "custom_review_packet" || file.url || file.storagePath ? "Open" : "Details"}
                        onPress={() => openChaburahFile(file)}
                        variant="secondary"
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.muted}>Click View All Files for more files and filters.</Text>
            </>
          ) : null}
        </Card>
      </View>

      {/* Members Section */}
      <View nativeID={sectionDomId("members")} onLayout={(event) => trackSection("members", event.nativeEvent.layout.y)}>
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <SectionTitle icon="people-outline">Members</SectionTitle>
              <Text style={styles.muted}>Active people in this chaburah.</Text>
            </View>
            <Pill label={`${activeMembers.length} active`} tone="success" />
          </Row>
          {activeMembers.length === 0 ? (
            <Text style={styles.muted}>No active members are listed yet.</Text>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 10, paddingRight: 2 }} nestedScrollEnabled style={{ maxHeight: 340 }}>
              {activeMembers.map((member) => (
                <View key={member.id} style={localStyles.memberRow}>
                  <Avatar name={member.fullName ?? "Member"} size={36} />
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={[styles.body, { fontWeight: "700" }]}>{member.fullName ?? "Member"}</Text>
                    <MetaText>Joined {formatMemberDate(member.joinedAt)}</MetaText>
                  </View>
                  <Pill
                    label={memberRoleLabel(member.memberRole)}
                    tone={member.memberRole === "rabbi" ? "accent" : member.memberRole === "admin" ? "primary" : "neutral"}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </Card>
      </View>

      {chaburah.askRavEnabled ? (
        <View nativeID={sectionDomId("askRav")} onLayout={(event) => trackSection("askRav", event.nativeEvent.layout.y)}>
          <Card tone="accent">
            <Row>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 220 }}>
                <IconTile icon="help-buoy-outline" tone="accent" size={42} />
                <View style={{ flex: 1, gap: 2 }}>
                  <SectionTitle>Ask the Rav</SectionTitle>
                  <Text style={styles.muted}>Submit a question about this week's SCP material to {chaburah?.rabbiName}.</Text>
                </View>
              </View>
              <Button label="Ask a Question" onPress={() => router.push("/(tabs)/ask-rav")} variant="secondary" icon="chatbubble-outline" />
            </Row>
          </Card>
        </View>
      ) : null}
      <PacketPreviewModal
        packetId={previewPacketId}
        visible={Boolean(previewPacketId)}
        onClose={() => setPreviewPacketId(null)}
      />
    </Screen>
  );
}

function memberRoleLabel(role: "participant" | "rabbi" | "admin") {
  if (role === "rabbi") return "Rabbi";
  if (role === "admin") return "Local Admin";
  return "Participant";
}

function formatMemberDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString();
}

function formatDiscussionDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function sectionDomId(section: MyChaburahSection) {
  return `my-chaburah-${section}`;
}

function isMyChaburahSection(value: string | undefined): value is MyChaburahSection {
  return value === "announcements" || value === "discussion" || value === "members" || value === "files" || value === "askRav";
}

function buildChaburahMessages(announcements: Announcement[], messages: DiscussionMessage[]): ChaburahMessageEntry[] {
  return [
    ...announcements.map((announcement) => ({
      announcement,
      createdAt: announcement.postedAt,
      id: `announcement-${announcement.id}`,
      kind: "announcement" as const
    })),
    ...messages.map((message) => ({
      createdAt: message.createdAt,
      id: `discussion-${message.id}`,
      kind: "discussion" as const,
      message
    }))
  ].sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
}

function DiscussionAction({
  disabled = false,
  label,
  onPress,
  tone = "primary"
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "primary" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.discussionAction,
        tone === "danger" && localStyles.discussionActionDanger,
        pressed && !disabled && localStyles.discussionActionPressed,
        disabled && localStyles.discussionActionDisabled
      ]}
    >
      <Text style={[localStyles.discussionActionText, tone === "danger" && localStyles.discussionActionDangerText]}>{label}</Text>
    </Pressable>
  );
}

const localStyles = StyleSheet.create({
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...theme.shadows.card
  },
  heroAccent: {
    backgroundColor: theme.colors.primary,
    height: 5,
    width: "100%"
  },
  heroBody: {
    gap: 14,
    padding: 20
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  heroTitle: {
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 28
  },
  heroRabbi: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "700"
  },
  heroDetailsGrid: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    padding: 12
  },
  heroDetailItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  heroDetailText: {
    color: theme.colors.inkSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  heroActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  indexBar: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  indexLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  indexGrid: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  indexButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primaryBorder,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  indexButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "700"
  },
  indexBadge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  indexCount: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: "800"
  },
  announcementMessage: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentBorder,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  announcementTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21
  },
  authorNameText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  discussionAction: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    minHeight: 30,
    paddingHorizontal: 10,
    justifyContent: "center"
  },
  discussionActionDanger: {
    backgroundColor: theme.colors.dangerSoft
  },
  discussionActionDangerText: {
    color: theme.colors.danger
  },
  discussionActionDisabled: {
    opacity: 0.45
  },
  discussionActionPressed: {
    opacity: 0.8
  },
  discussionActionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
  discussionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    justifyContent: "flex-end"
  },
  discussionMessageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  discussionMessageMeta: {
    flex: 1,
    minWidth: 0
  },
  discussionMessage: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  composerBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
    padding: 14
  },
  fileActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end"
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  fileRow: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 12
  },
  filesHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between"
  },
  viewAllFilesAction: {
    flexShrink: 0
  },
  memberRow: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});
