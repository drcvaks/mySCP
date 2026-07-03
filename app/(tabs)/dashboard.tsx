import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthState();
  const {
    announcements,
    chaburos,
    learningFiles,
    loading,
    memberships,
    refresh,
    reviewQuestions,
    reviewSessions,
    selectedChaburahId
  } = useAppState();
  const currentChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const latestSourceSheet = learningFiles.find((file) => file.fileType === "source_sheet");
  const localAnnouncements = announcements.filter(
    (announcement) => announcement.isGlobal || announcement.chaburahId === selectedChaburahId
  );
  const latestReview = reviewSessions[0];
  const readiness = latestReview
    ? Math.round((latestReview.correctAnswers / latestReview.totalQuestions) * 100)
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
          <Button label="My Chaburah" onPress={() => router.push("/(tabs)/chaburah")} variant="secondary" />
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
              variant="secondary"
            />
          </Row>
        </Card>
      ) : null}

      <Row>
        <Card>
          <Text style={styles.muted}>Bechina Readiness</Text>
          <Text style={styles.statNumber}>{readiness}%</Text>
        </Card>
        <Card>
          <Text style={styles.muted}>Review Questions</Text>
          <Text style={styles.statNumber}>
            {reviewQuestions.filter((question) => question.enabled && question.publicationStatus === "published").length}
          </Text>
        </Card>
      </Row>

      <Card>
        <SectionTitle>Latest Source Sheet</SectionTitle>
        <Text style={styles.body}>{latestSourceSheet?.title ?? "No source sheet has been published yet."}</Text>
        {latestSourceSheet ? <Text style={styles.muted}>{latestSourceSheet.topic}</Text> : null}
        <Button label="Open" onPress={() => router.push("/(tabs)/files")} />
      </Card>

      <Card>
        <SectionTitle>Missed Last Shiur?</SectionTitle>
        <Text style={styles.muted}>Catch up with recordings and review summaries from your chaburah.</Text>
        <Button label="Catch Up" onPress={() => router.push("/(tabs)/files")} variant="secondary" />
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

      <Card>
        <SectionTitle>Ask the Rav</SectionTitle>
        <Text style={styles.muted}>Submit a question to your local rav and track the answer here.</Text>
        <Button label="Submit Question" onPress={() => router.push("/(tabs)/ask-rav")} />
      </Card>
    </Screen>
  );
}
