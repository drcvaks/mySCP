import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, MetaText, Pill, Row, Screen, SectionTitle, StatusBanner, TextArea, styles } from "../../src/shared/components";
import { fileCoverageDetailLabel, fileTypeLabel } from "../../src/shared/format";
import { currentReviewWeek } from "../../src/shared/reviewWeeks";
import { theme } from "../../src/shared/theme";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

export default function MyChaburahScreen() {
  const router = useRouter();
  const { profile } = useAuthState();
  const {
    announcements,
    chaburahMemberDirectory,
    chaburos,
    deleteDiscussionMessage,
    discussionMessages,
    editDiscussionMessage,
    hideDiscussionMessage,
    learningFiles,
    loading,
    refresh,
    reviewQuestions,
    selectedChaburahId,
    submitDiscussionMessage
  } = useAppState();
  const [discussionBody, setDiscussionBody] = useState("");
  const [discussionMessage, setDiscussionMessage] = useState("");
  const [postingDiscussion, setPostingDiscussion] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageBody, setEditingMessageBody] = useState("");
  const chaburah = chaburos.find((item) => item.id === selectedChaburahId);
  const activeMembers = chaburahMemberDirectory.filter((member) => member.chaburahId === selectedChaburahId);
  const currentMembership = activeMembers.find((member) => member.userId === profile?.id);
  const canModerateDiscussion =
    profile?.role === "global_admin" || currentMembership?.memberRole === "rabbi" || currentMembership?.memberRole === "admin";
  const localAnnouncements = announcements.filter((item) => item.chaburahId === selectedChaburahId);
  const localDiscussionMessages = discussionMessages.filter((item) => item.chaburahId === selectedChaburahId);
  const localFiles = learningFiles.filter(
    (item) => item.visibility === "everyone" || item.chaburahId === selectedChaburahId
  );
  const assignedQuestions = reviewQuestions.filter((item) => item.enabled && item.week <= currentReviewWeek + 3);

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
    <Screen title="My Chaburah" eyebrow={chaburah?.name} onRefresh={refresh} refreshing={loading}>
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
          activeMembers.map((member) => (
            <Row key={member.id}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <Text style={styles.body}>{member.fullName ?? "Member"}</Text>
                <MetaText>Joined {formatMemberDate(member.joinedAt)}</MetaText>
              </View>
              <Pill label={memberRoleLabel(member.memberRole)} tone={member.memberRole === "participant" ? "neutral" : "primary"} />
            </Row>
          ))
        )}
      </Card>

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
          </>
        )}
      </Card>

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

      <Card>
        <SectionTitle>Source Sheets & Recordings</SectionTitle>
        {localFiles.length === 0 ? <Text style={styles.muted}>No learning files have been published yet.</Text> : null}
        {localFiles.slice(0, 3).map((file) => (
          <Row key={file.id}>
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>{file.title}</Text>
              <Text style={styles.muted}>{fileCoverageDetailLabel(file.coverage, file.week)} - {fileTypeLabel(file.fileType)}</Text>
            </View>
            <Pill label={file.visibility === "everyone" ? "Everyone" : "Local"} />
          </Row>
        ))}
      </Card>

      <Card>
        <SectionTitle>Review Assigned</SectionTitle>
        <Text style={styles.muted}>{assignedQuestions.length} questions are available for this zman.</Text>
        <Button label="Start Review" onPress={() => router.push("/(tabs)/review")} />
      </Card>

      {chaburah.askRavEnabled ? (
        <Card>
          <SectionTitle>Ask the Rav</SectionTitle>
          <Text style={styles.muted}>Submit a question about this week's SCP material to {chaburah?.rabbiName}.</Text>
          <Button label="Ask a Question" onPress={() => router.push("/(tabs)/ask-rav")} variant="secondary" />
        </Card>
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
  }
});
