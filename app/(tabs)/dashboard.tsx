import { ProgramSelector } from "../../src/shared/ProgramSelector";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { fileCoverageDetailLabel, learningFileTypeLabel } from "../../src/shared/format";
import { useRefreshOnFocus } from "../../src/shared/useRefreshOnFocus";
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
    selectedChaburahId,
    selectedProgram
  } = useAppState();
  useRefreshOnFocus(refresh);

  const currentChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const visibleFiles = learningFiles.filter((file) => file.visibility === "everyone" || file.chaburahId === selectedChaburahId);
  const latestUploadedFile = visibleFiles[0];
  const latestUploadedFiles = visibleFiles.slice(0, 4);
  const localAnnouncements = announcements.filter(
    (announcement) => announcement.isGlobal || announcement.chaburahId === selectedChaburahId
  );
  const assignedQuestions = reviewQuestions.filter(
    (question) =>
      question.enabled &&
      question.publicationStatus === "published" &&
      !question.isLibraryQuestion &&
      question.week <= currentReviewWeek + 3 &&
      question.chaburahId === selectedChaburahId
  );
  const cumulativeReview = summarizeCumulativeReview(reviewSessions);
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

  const actionItems = [
    ...(pendingJoinRequests.length > 0
      ? [
          {
            id: "pending-requests",
            badge: "Action Needed",
            tone: "accent" as const,
            title: "Pending Join Requests",
            detail:
              pendingJoinRequests.length === 1
                ? "1 participant is waiting to join this chaburah."
                : `${pendingJoinRequests.length} participants are waiting to join this chaburah.`,
            cta: "Review Requests",
            onPress: () => router.push({ pathname: "/(tabs)/admin", params: { section: "requests" } })
          }
        ]
      : []),
    ...(submittedAskRavQuestions.length > 0
      ? [
          {
            id: "ask-rav",
            badge: "Action Needed",
            tone: "accent" as const,
            title: "Ask Rav Questions",
            detail:
              submittedAskRavQuestions.length === 1
                ? "1 participant question is waiting for an answer."
                : `${submittedAskRavQuestions.length} participant questions are waiting for answers.`,
            cta: "Answer Questions",
            onPress: () => router.push("/(tabs)/rabbi-hub")
          }
        ]
      : []),
    ...(discussionUnreadCount > 0
      ? [
          {
            id: "unread-discussion",
            badge: "New",
            tone: "primary" as const,
            title: "New Chaburah Discussion",
            detail:
              discussionUnreadCount === 1
                ? "1 new message in your chaburah discussion."
                : `${discussionUnreadCount} new messages in your chaburah discussion.`,
            cta: "Open Discussion",
            onPress: () => router.push({ pathname: "/(tabs)/chaburah", params: { section: "discussion" } })
          }
        ]
      : []),
    ...(notificationUnreadCount > 0
      ? [
          {
            id: "unread-notifications",
            badge: "Unread",
            tone: "primary" as const,
            title: "Notifications",
            detail:
              notificationUnreadCount === 1
                ? "1 unread in-app notification."
                : `${notificationUnreadCount} unread in-app notifications.`,
            cta: "Open Notifications",
            onPress: () => router.push("/(tabs)/notifications")
          }
        ]
      : [])
  ];

  return (
    <Screen title="This Week in SCP" onRefresh={refresh} refreshing={loading} programSelector={<ProgramSelector />}>
      {/* 1. Primary Hero Card (must remain tree.props.children[0] for test_dashboard_topic.cjs) */}
      <Card tone="hero">
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14
          }}
        >
          <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <Row>
              <Pill label="Current Topic" tone="accent" />
              <Text style={{ color: "#C5D2EC", fontSize: 13, lineHeight: 19, fontWeight: "700" }}>
                {selectedProgram.name} - Week {currentReviewWeek}
              </Text>
            </Row>
            <Text style={{ color: "#FFFFFF", fontSize: 24, lineHeight: 30, fontWeight: "800", marginTop: 2 }}>
              {selectedProgram.topic}
            </Text>
            <View style={{ marginTop: 4, gap: 2 }}>
              <Text style={{ color: "#F6BA36", fontSize: 11, lineHeight: 16, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7 }}>
                Next Shiur
              </Text>
              <Text style={{ color: "#FFFFFF", fontSize: 15, lineHeight: 22, fontWeight: "600" }}>
                {currentChaburah?.schedule ?? "Join a chaburah to see its schedule."}
              </Text>
              {currentChaburah ? (
                <Text style={{ color: "#C5D2EC", fontSize: 13, lineHeight: 18 }}>
                  {currentChaburah.name} · {currentChaburah.rabbiName}
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderColor: "rgba(246, 186, 54, 0.45)",
              borderWidth: 1,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
              minWidth: 165,
              gap: 3
            }}
          >
            <Text
              style={{
                color: "#F6BA36",
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 0.8,
                textTransform: "uppercase"
              }}
            >
              Cumulative Score
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "800" }}>
              {cumulativeReviewScore}%
            </Text>
            <Text style={{ color: "#C5D2EC", fontSize: 12 }}>
              {assignedQuestions.length} review questions ready
            </Text>
          </View>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            width: "100%",
            marginVertical: 2
          }}
        />

        <Row>
          <Button label="Start Review" variant="accent" onPress={() => router.push("/(tabs)/review")} />
          <Button label="My Chaburah" variant="secondary" onPress={() => router.push("/(tabs)/chaburah")} />
          <Button label="View Files" variant="secondary" onPress={() => router.push("/(tabs)/files")} />
        </Row>
      </Card>

      {/* 2. Needs Attention / Unread Alerts */}
      {actionItems.length > 0 ? (
        <Card tone="accent">
          <Row>
            <SectionTitle>Needs Your Attention</SectionTitle>
            <Pill label={`${actionItems.length} Active`} tone="accent" />
          </Row>
          <View style={{ gap: 10 }}>
            {actionItems.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#F5D47A",
                  padding: 13,
                  gap: 6
                }}
              >
                <Row>
                  <View style={{ flex: 1, minWidth: 200, gap: 3 }}>
                    <Row>
                      <Pill label={item.badge} tone={item.tone} />
                      <Text style={{ color: "#0B1933", fontSize: 15, fontWeight: "800" }}>
                        {item.title}
                      </Text>
                    </Row>
                    <Text style={styles.muted}>{item.detail}</Text>
                  </View>
                  <Button label={item.cta} onPress={item.onPress} />
                </Row>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {/* 3. Key Metrics Strip */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flex: 1, flexBasis: 180, minWidth: 160 }}>
          <Card>
            <Text style={styles.muted}>Cumulative Review Score</Text>
            <Text style={styles.statNumber}>{cumulativeReviewScore}%</Text>
          </Card>
        </View>
        <View style={{ flex: 1, flexBasis: 180, minWidth: 160 }}>
          <Card>
            <Text style={styles.muted}>Review Questions</Text>
            <Text style={styles.statNumber}>{assignedQuestions.length}</Text>
          </Card>
        </View>
        <View style={{ flex: 1, flexBasis: 180, minWidth: 160 }}>
          <Card>
            <Text style={styles.muted}>Available Files</Text>
            <Text style={styles.statNumber}>{visibleFiles.length}</Text>
          </Card>
        </View>
      </View>

      {/* 4. Two-Column Responsive Workspace */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <View style={{ flex: 1.15, minWidth: 280, gap: 16 }}>
          <Card>
            <Row>
              <View style={{ flex: 1, minWidth: 180 }}>
                <SectionTitle>Latest Uploaded Files</SectionTitle>
                <Text style={styles.muted}>
                  Newest source sheets, review packets, and recordings
                </Text>
              </View>
              <Button label="View Files" variant="secondary" onPress={() => router.push("/(tabs)/files")} />
            </Row>
            {latestUploadedFiles.length === 0 ? (
              <Text style={styles.muted}>No files have been uploaded yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {latestUploadedFiles.map((file) => (
                  <View
                    key={file.id}
                    style={{
                      backgroundColor: "#F8FAFD",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#DDE4F0",
                      padding: 12,
                      gap: 4
                    }}
                  >
                    <Row>
                      <View style={{ flex: 1, minWidth: 160 }}>
                        <Text style={[styles.body, { fontWeight: "700" }]}>{file.title}</Text>
                        <Text style={styles.muted}>
                          {fileCoverageDetailLabel(file.coverage, file.week)} - {learningFileTypeLabel(file)}
                        </Text>
                      </View>
                      <Pill label={learningFileTypeLabel(file)} tone="accent" />
                    </Row>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card>
            <Row>
              <View style={{ flex: 1, minWidth: 200 }}>
                <SectionTitle>Review Assigned</SectionTitle>
                <Text style={styles.muted}>{assignedQuestions.length} questions are available for this zman.</Text>
              </View>
              <Button label="Start Review" onPress={() => router.push("/(tabs)/review")} />
            </Row>
          </Card>
        </View>

        <View style={{ flex: 1, minWidth: 280, gap: 16 }}>
          <Card>
            <Row>
              <SectionTitle>Recent Announcements</SectionTitle>
              <Pill label={`${localAnnouncements.length}`} tone="accent" />
            </Row>
            {localAnnouncements.length === 0 ? (
              <Text style={styles.muted}>No announcements have been published yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {localAnnouncements.slice(0, 3).map((announcement) => (
                  <View
                    key={announcement.id}
                    style={{
                      backgroundColor: "#FEF5DC",
                      borderColor: "#F5D47A",
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      gap: 4
                    }}
                  >
                    <Text style={[styles.body, { fontWeight: "800" }]}>{announcement.title}</Text>
                    <Text style={styles.muted}>{announcement.body}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {currentChaburah?.askRavEnabled && !canAnswerAskRav ? (
            <Card tone="accent">
              <SectionTitle>Ask the Rav</SectionTitle>
              <Text style={styles.muted}>Submit a question about this week's SCP material to your local Rav.</Text>
              <Button label="Submit Question" variant="secondary" onPress={() => router.push("/(tabs)/ask-rav")} />
            </Card>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function summarizeCumulativeReview(
  reviewSessions: {
    week: number | "all";
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }[]
) {
  const bestByWeek = new Map<number, { correctAnswers: number; totalQuestions: number; completedAt: string }>();
  let bestAllWeeksSession: { correctAnswers: number; totalQuestions: number; completedAt: string } | undefined;

  reviewSessions.forEach((session) => {
    if (session.totalQuestions <= 0) return;
    if (session.week === "all") {
      if (!bestAllWeeksSession || isBetterReviewSession(session, bestAllWeeksSession)) {
        bestAllWeeksSession = session;
      }
      return;
    }

    const currentBest = bestByWeek.get(session.week);
    if (!currentBest || isBetterReviewSession(session, currentBest)) {
      bestByWeek.set(session.week, session);
    }
  });

  if (bestByWeek.size === 0 && bestAllWeeksSession) {
    return {
      correct: bestAllWeeksSession.correctAnswers,
      questions: bestAllWeeksSession.totalQuestions
    };
  }

  return Array.from(bestByWeek.values()).reduce(
    (total, session) => ({
      correct: total.correct + session.correctAnswers,
      questions: total.questions + session.totalQuestions
    }),
    { correct: 0, questions: 0 }
  );
}

function isBetterReviewSession(
  candidate: { correctAnswers: number; totalQuestions: number; completedAt: string },
  current: { correctAnswers: number; totalQuestions: number; completedAt: string }
) {
  const candidateScore = candidate.correctAnswers / candidate.totalQuestions;
  const currentScore = current.correctAnswers / current.totalQuestions;
  if (candidateScore !== currentScore) return candidateScore > currentScore;
  return new Date(candidate.completedAt).getTime() > new Date(current.completedAt).getTime();
}
