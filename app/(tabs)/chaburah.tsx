import { useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Card, MetaText, Pill, Row, Screen, SectionTitle, StatusBanner, TextArea, styles } from "../../src/shared/components";
import { fileCoverageDetailLabel, fileTypeLabel } from "../../src/shared/format";
import { openLearningFile } from "../../src/shared/openLearningFile";
import { theme } from "../../src/shared/theme";
import { useRefreshOnFocus } from "../../src/shared/useRefreshOnFocus";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

type MyChaburahSection = "announcements" | "discussion" | "members" | "files" | "askRav";

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
  const [discussionBody, setDiscussionBody] = useState("");
  const [discussionMessage, setDiscussionMessage] = useState("");
  const [postingDiscussion, setPostingDiscussion] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageBody, setEditingMessageBody] = useState("");
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
  const localFiles = learningFiles.filter((item) => item.visibility === "chaburah" && item.chaburahId === selectedChaburahId);
  const indexItems: { key: MyChaburahSection; label: string; show: boolean; count?: number }[] = [
    { key: "members", label: "Members", show: true, count: activeMembers.length },
    { key: "discussion", label: "Discussion", show: true, count: discussionUnreadCount > 0 ? discussionUnreadCount : undefined },
    { key: "files", label: "Files", show: true, count: localFiles.length },
    { key: "askRav", label: "Ask Rav", show: chaburah?.askRavEnabled ?? false }
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
          <SectionTitle>No Chaburah Selected</SectionTitle>
          <Text style={styles.muted}>Join a chaburah to see its schedule, files, announcements, and rabbi.</Text>
          <Button label="Browse Directory" onPress={() => router.push("/(tabs)/directory")} />
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
    >
      <Card>
        <Row>
          <View>
            <Text style={styles.sectionTitle}>{chaburah?.name}</Text>
            <Text style={styles.muted}>{chaburah?.rabbiName}</Text>
          </View>
          <Pill label={chaburah?.discussionEnabled ? "Discussion On" : "Announcement Only"} tone="accent" />
        </Row>
        <Text style={styles.body}>{chaburah?.schedule}</Text>
        <Text style={styles.muted}>{chaburah?.address}</Text>
        <Button label="Join or Change Chaburah" onPress={() => router.push("/(tabs)/directory")} variant="secondary" />
      </Card>

      <Card>
        <SectionTitle>Index</SectionTitle>
        <View style={localStyles.indexGrid}>
          {indexItems
            .filter((item) => item.show)
            .map((item) => (
              <Pressable key={item.key} accessibilityRole="button" onPress={() => jumpToSection(item.key)} style={localStyles.indexButton}>
                <Text style={localStyles.indexButtonText}>{item.label}</Text>
                {typeof item.count === "number" ? <Text style={localStyles.indexCount}>{item.count}</Text> : null}
              </Pressable>
            ))}
        </View>
      </Card>

      <View nativeID={sectionDomId("announcements")} onLayout={(event) => trackSection("announcements", event.nativeEvent.layout.y)}>
        <Card>
          <SectionTitle>Announcements</SectionTitle>
          {localAnnouncements.length === 0 ? <Text style={styles.muted}>No local announcements yet.</Text> : null}
          {localAnnouncements.map((announcement) => (
            <View key={announcement.id}>
              <Text style={styles.body}>{announcement.title}</Text>
              <Text style={styles.muted}>{announcement.body}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View nativeID={sectionDomId("members")} onLayout={(event) => trackSection("members", event.nativeEvent.layout.y)}>
        <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Members</SectionTitle>
            <Text style={styles.muted}>Active people in this chaburah.</Text>
          </View>
          <Pill label={`${activeMembers.length} active`} tone="success" />
        </Row>
        {activeMembers.length === 0 ? (
          <Text style={styles.muted}>No active members are listed yet.</Text>
        ) : (
          <ScrollView contentContainerStyle={{ gap: 12, paddingRight: 2 }} nestedScrollEnabled style={{ maxHeight: 340 }}>
            {activeMembers.map((member) => (
              <Row key={member.id}>
                <View style={{ flex: 1, minWidth: 180 }}>
                  <Text style={styles.body}>{member.fullName ?? "Member"}</Text>
                  <MetaText>Joined {formatMemberDate(member.joinedAt)}</MetaText>
                </View>
                <Pill label={memberRoleLabel(member.memberRole)} tone={member.memberRole === "participant" ? "neutral" : "primary"} />
              </Row>
            ))}
          </ScrollView>
        )}
        </Card>
      </View>

      <View
        nativeID={sectionDomId("discussion")}
        onLayout={(event) => trackSection("discussion", event.nativeEvent.layout.y)}
      >
        <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Discussion</SectionTitle>
            <Text style={styles.muted}>A local forum for this chaburah's SCP learning.</Text>
          </View>
          <Pill label={chaburah.discussionEnabled ? "Enabled" : "Disabled"} tone={chaburah.discussionEnabled ? "success" : "neutral"} />
        </Row>
        {discussionMessage ? (
          <StatusBanner
            message={discussionMessage}
            tone={
              discussionMessage.includes("posted") ||
              discussionMessage.includes("updated") ||
              discussionMessage.includes("deleted") ||
              discussionMessage.includes("hidden")
                ? "success"
                : "error"
            }
          />
        ) : null}
        {!chaburah.discussionEnabled ? (
          <Text style={styles.muted}>Discussion is not enabled for this chaburah yet.</Text>
        ) : (
          <>
            {localDiscussionMessages.length === 0 ? (
              <Text style={styles.muted}>No discussion messages yet.</Text>
            ) : (
              <ScrollView contentContainerStyle={{ gap: 14, paddingRight: 2 }} nestedScrollEnabled style={{ maxHeight: 420 }}>
                {localDiscussionMessages.map((message) => {
                  const isAuthor = message.authorId === profile?.id;
                  const isEditing = editingMessageId === message.id;
                  return (
                    <View key={message.id} style={{ gap: 6 }}>
                      <View style={localStyles.discussionMessageHeader}>
                        <View style={localStyles.discussionMessageMeta}>
                          <Text style={styles.body}>{message.authorName ?? "Chaburah member"}</Text>
                          <MetaText>{formatDiscussionDate(message.createdAt)}</MetaText>
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
            <TextArea
              onChangeText={setDiscussionBody}
              placeholder="Share a question, note, or chaburah discussion point..."
              value={discussionBody}
            />
            <Button
              disabled={postingDiscussion || !discussionBody.trim()}
              label={postingDiscussion ? "Posting..." : "Post Message"}
              onPress={postDiscussionMessage}
            />
          </>
        )}
        </Card>
      </View>

      <View nativeID={sectionDomId("files")} onLayout={(event) => trackSection("files", event.nativeEvent.layout.y)}>
        <Card>
        <View style={localStyles.filesHeader}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Recent Files</SectionTitle>
            <Text style={styles.muted}>Newest source sheets, review sheets, recordings, and links.</Text>
          </View>
          <View style={localStyles.viewAllFilesAction}>
            <Button label="View All Files" onPress={() => router.push("/(tabs)/files")} variant="secondary" />
          </View>
        </View>
        {localFiles.length === 0 ? <Text style={styles.muted}>No learning files have been published yet.</Text> : null}
        {localFiles.length > 0 ? (
          <>
            <ScrollView contentContainerStyle={{ gap: 12, paddingRight: 2 }} nestedScrollEnabled style={{ maxHeight: 300 }}>
              {localFiles.slice(0, 10).map((file) => (
                <View key={file.id} style={localStyles.fileRow}>
                  <View style={localStyles.fileInfo}>
                    <Text style={styles.body}>{file.title}</Text>
                    <MetaText>{fileCoverageDetailLabel(file.coverage, file.week)} - {fileTypeLabel(file.fileType)}</MetaText>
                  </View>
                  <View style={localStyles.fileActions}>
                    <Button
                      label={file.url || file.storagePath ? "Open" : "Details"}
                      onPress={() => openLearningFile(file)}
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

      {chaburah.askRavEnabled ? (
        <View nativeID={sectionDomId("askRav")} onLayout={(event) => trackSection("askRav", event.nativeEvent.layout.y)}>
          <Card>
            <SectionTitle>Ask the Rav</SectionTitle>
            <Text style={styles.muted}>Submit a question about this week's SCP material to {chaburah?.rabbiName}.</Text>
            <Button label="Ask a Question" onPress={() => router.push("/(tabs)/ask-rav")} variant="secondary" />
          </Card>
        </View>
      ) : null}
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
  discussionAction: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    minHeight: 34,
    paddingHorizontal: 10,
    justifyContent: "center"
  },
  discussionActionDanger: {
    backgroundColor: "#FEE2E2"
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
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17
  },
  discussionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    justifyContent: "flex-end"
  },
  discussionMessageHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  discussionMessageMeta: {
    flex: 1,
    minWidth: 0
  },
  fileActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end"
  },
  fileInfo: {
    flex: 1,
    minWidth: 0
  },
  fileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  filesHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  indexButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12
  },
  indexButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "800"
  },
  indexCount: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  indexGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  viewAllFilesAction: {
    flexShrink: 0,
    width: 132
  }
});
