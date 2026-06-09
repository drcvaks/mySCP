import { Text, View } from "react-native";
import { announcements, chaburos, currentUser, learningFiles, reviewQuestions } from "../../src/data/mockData";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";

const currentChaburah = chaburos.find((chaburah) => chaburah.id === currentUser.chaburahId);
const latestSourceSheet = learningFiles.find((file) => file.fileType === "source_sheet");
const localAnnouncements = announcements.filter(
  (announcement) => announcement.isGlobal || announcement.chaburahId === currentUser.chaburahId
);

export default function DashboardScreen() {
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
          <Button label="My Chaburah" variant="secondary" />
        </Row>
      </Card>

      <Row>
        <Card>
          <Text style={styles.muted}>Bechina Readiness</Text>
          <Text style={styles.statNumber}>78%</Text>
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
        <Button label="Open" />
      </Card>

      <Card>
        <SectionTitle>Missed Last Shiur?</SectionTitle>
        <Text style={styles.muted}>Catch up with recordings and review summaries from your chaburah.</Text>
        <Button label="Catch Up" variant="secondary" />
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
        <Button label="Submit Question" />
      </Card>
    </Screen>
  );
}
