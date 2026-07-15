import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { fileCoverageDetailLabel, fileTypeLabel } from "../../src/shared/format";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthState();
  const {
    announcements,
    askRavQuestions,
    chaburos,
    currentReviewWeek,
    learningFiles,
    loading,
    memberships,
    refresh,
    reviewQuestions,
    reviewSessions,
    discussionUnreadCount,
    notificationUnreadCount,
    selectedChaburahId
  } = useAppState();
  const currentChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const visibleFiles = learningFiles.filter((file) => file.visibility === "everyone" || file.chaburahId === selectedChaburahId);
  const latestUploadedFile = visibleFiles[0];
  const latestUploadedFiles = visibleFiles.slice(0, 3);
  const localAnnouncements = announcements.filter(
    (announcement) => announcement.isGlobal || announcement.chaburahId === selectedChaburahId
  );
  const assignedQuestions = reviewQuestions.filter(
    (question) =>
      question.enabled &&
      question.publicationStatus === "published" &&
      question.week <= currentReviewWeek + 3 &&
      (question.visibility === "everyone" || question.chaburahId === selectedChaburahId)
  );
  const cumulativeReview = reviewSessions.reduce(
    (total, session) => ({
      correct: total.correct + session.correctAnswers,
      questions: total.questions + session.totalQuestions
    }),
    { correct: 0, questions: 0 }
  );
  const cumulativeReviewScore =
    cumulativeReview.questions > 0
      ? Math.round((cumulativeReview.correct / cumulativeReview.questions) * 100)
      : 0;
  const canReviewJoinRequests =
    profile?.role === "global_admin" ||
    memberships.some(
      (membership) =>
        membership.userId === profile?.id &&
        membership.chaburahId === selectedChaburahId &&
        membership.status === "active" &&
        (membership.memberRole === "rabbi" || membership.memberRole === "admin")
    );
  const pendingJoinRequests = canReviewJoinRequests
    ? memberships.filter(
        (membership) =>
          membership.chaburahId === selectedChaburahId &&
          membership.memberRole === "participant" &&
          membership.status === "pending"
      )
    : [];
  const canAnswerAskRav = memberships.some(
    (membership) =>
      membership.userId === profile?.id &&
      membership.chaburahId === selectedChaburahId &&
      membership.status === "active" &&
      membership.memberRole === "rabbi"
  );
  const submittedAskRavQuestions = canAnswerAskRav
    ? askRavQuestions.filter((question) => question.chaburahId === selectedChaburahId && question.status === "submitted")
    : [];

  return (
    <Screen title="This Week in SCP" eyebrow="Practical Kashrus" onRefresh={refresh} refreshing={loading}>
      <Card>
        <Pill label="Current Topic" tone="primary" />
        <Text style={styles.sectionTitle}>Practical Kashrus: Kitchen, Food & Wine</Text>
        <Text style={styles.muted}>Week 1 of Nat Bar Nat & Kitchen Kashrus</Text>
        <Row>
          <View>
            <Text style={styles.muted}>Next Shiur</Text>
            <Text style={styles.body}>{currentChaburah?.schedule ?? "Join a chaburah to see its schedule."}</Text>
          </View>
          <Button label="My Chaburah" onPress={() => router.push("/(tabs)/chaburah")} />
        </Row>
      </Card>

      {pendingJoinRequests.length > 0 ? (
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Pill label="Action Needed" tone="accent" />
              <SectionTitle>Pending Join Requests</SectionTitle>
              <Text style={styles.muted}>
                {pendingJoinRequests.length === 1
                  ? "1 participant is waiting to join this chaburah."
                  : `${pendingJoinRequests.length} participants are waiting to join this chaburah.`}
              </Text>
            </View>
            <Button
              label="Review Requests"
              onPress={() => router.push({ pathname: "/(tabs)/admin", params: { section: "requests" } })}
            />
          </Row>
        </Card>
      ) : null}

      {discussionUnreadCount > 0 ? (
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Pill label="New" tone="accent" />
              <SectionTitle>New Chaburah Discussion</SectionTitle>
              <Text style={styles.muted}>
                {discussionUnreadCount === 1
                  ? "1 new message in your chaburah discussion."
                  : `${discussionUnreadCount} new messages in your chaburah discussion.`}
              </Text>
            </View>
            <Button
              label="Open Discussion"
              onPress={() => router.push({ pathname: "/(tabs)/chaburah", params: { section: "discussion" } })}
              variant="secondary"
            />
          </Row>
        </Card>
      ) : null}

      {submittedAskRavQuestions.length > 0 ? (
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Pill label="Action Needed" tone="accent" />
              <SectionTitle>Ask Rav Questions</SectionTitle>
              <Text style={styles.muted}>
                {submittedAskRavQuestions.length === 1
                  ? "1 participant question is waiting for an answer."
                  : `${submittedAskRavQuestions.length} participant questions are waiting for answers.`}
              </Text>
            </View>
            <Button label="Answer Questions" onPress={() => router.push("/(tabs)/rabbi-hub")} />
          </Row>
        </Card>
      ) : null}

      {notificationUnreadCount > 0 ? (
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Pill label="Unread" tone="accent" />
              <SectionTitle>Notifications</SectionTitle>
              <Text style={styles.muted}>
                {notificationUnreadCount === 1
                  ? "1 unread in-app notification."
                  : `${notificationUnreadCount} unread in-app notifications.`}
              </Text>
            </View>
            <Button label="Open Notifications" onPress={() => router.push("/(tabs)/notifications")} />
          </Row>
        </Card>
      ) : null}

      {latestUploadedFile ? (
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Pill label="New Upload" tone="accent" />
              <SectionTitle>New File Available</SectionTitle>
              <Text style={styles.muted}>
                {latestUploadedFile.title} - {fileCoverageDetailLabel(latestUploadedFile.coverage, latestUploadedFile.week)}
              </Text>
            </View>
            <Button label="Open Files" onPress={() => router.push("/(tabs)/files")} />
          </Row>
        </Card>
      ) : null}

      <Row>
        <Card>
          <Text style={styles.muted}>Cumulative Review Score</Text>
          <Text style={styles.statNumber}>{cumulativeReviewScore}%</Text>
        </Card>
        <Card>
          <Text style={styles.muted}>Review Questions</Text>
          <Text style={styles.statNumber}>{assignedQuestions.length}</Text>
        </Card>
      </Row>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Review Assigned</SectionTitle>
            <Text style={styles.muted}>{assignedQuestions.length} questions are available for this zman.</Text>
          </View>
          <Button label="Start Review" onPress={() => router.push("/(tabs)/review")} />
        </Row>
      </Card>

      <Card>
        <SectionTitle>Latest Uploaded Files</SectionTitle>
        {latestUploadedFiles.length === 0 ? <Text style={styles.muted}>No files have been uploaded yet.</Text> : null}
        {latestUploadedFiles.map((file) => (
          <View key={file.id}>
            <Text style={styles.body}>{file.title}</Text>
            <Text style={styles.muted}>
              {fileCoverageDetailLabel(file.coverage, file.week)} - {fileTypeLabel(file.fileType)}
            </Text>
          </View>
        ))}
        <Button label="View Files" onPress={() => router.push("/(tabs)/files")} />
      </Card>

      <Card>
        <SectionTitle>Recent Announcements</SectionTitle>
        {localAnnouncements.length === 0 ? <Text style={styles.muted}>No announcements have been published yet.</Text> : null}
        {localAnnouncements.slice(0, 3).map((announcement) => (
          <View key={announcement.id}>
            <Text style={styles.body}>{announcement.title}</Text>
            <Text style={styles.muted}>{announcement.body}</Text>
          </View>
        ))}
      </Card>

      {currentChaburah?.askRavEnabled && !canAnswerAskRav ? (
        <Card>
          <SectionTitle>Ask the Rav</SectionTitle>
          <Text style={styles.muted}>Submit a question about this week's SCP material to your local Rav.</Text>
          <Button label="Submit Question" onPress={() => router.push("/(tabs)/ask-rav")} />
        </Card>
      ) : null}
    </Screen>
  );
}
