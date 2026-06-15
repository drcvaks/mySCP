import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { announcements, chaburos, learningFiles, reviewQuestions } from "../../src/data/mockData";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { useAppState } from "../../src/state/AppState";

export default function DashboardScreen() {
  const router = useRouter();
  const { selectedChaburahId, reviewSessions } = useAppState();
  const currentChaburah = chaburos.find((chaburah) => chaburah.id === selectedChaburahId);
  const latestSourceSheet = learningFiles.find((file) => file.fileType === "source_sheet");
  const localAnnouncements = announcements.filter(
    (announcement) => announcement.isGlobal || announcement.chaburahId === selectedChaburahId
  );
  const latestReview = reviewSessions[0];
  const readiness = latestReview
    ? Math.round((latestReview.correctAnswers / latestReview.totalQuestions) * 100)
    : 0;

  return (
    <Screen title="This Week in SCP" eyebrow="Practical Kashrus">
      <Card>
        <Pill label="Current Topic" tone="primary" />
        <Text style={styles.sectionTitle}>Practical Kashrus: Kitchen, Food & Wine</Text>
        <Text style={styles.muted}>Week 1 of Nat Bar Nat & Kitchen Kashrus</Text>
        <Row>
          <View>
            <Text style={styles.muted}>Next Shiur</Text>
            <Text style={styles.body}>{currentChaburah?.schedule}</Text>
          </View>
          <Button label="My Chaburah" onPress={() => router.push("/(tabs)/chaburah")} variant="secondary" />
        </Row>
      </Card>

      <Row>
        <Card>
          <Text style={styles.muted}>Bechina Readiness</Text>
          <Text style={styles.statNumber}>{readiness}%</Text>
        </Card>
        <Card>
          <Text style={styles.muted}>Review Questions</Text>
          <Text style={styles.statNumber}>{reviewQuestions.filter((question) => question.enabled).length}</Text>
        </Card>
      </Row>

      <Card>
        <SectionTitle>Latest Source Sheet</SectionTitle>
        <Text style={styles.body}>{latestSourceSheet?.title}</Text>
        <Text style={styles.muted}>{latestSourceSheet?.topic}</Text>
        <Button label="Open" onPress={() => router.push("/(tabs)/files")} />
      </Card>

      <Card>
        <SectionTitle>Missed Last Shiur?</SectionTitle>
        <Text style={styles.muted}>Catch up with recordings and review summaries from your chaburah.</Text>
        <Button label="Catch Up" onPress={() => router.push("/(tabs)/files")} variant="secondary" />
      </Card>

      <Card>
        <SectionTitle>Recent Announcements</SectionTitle>
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
