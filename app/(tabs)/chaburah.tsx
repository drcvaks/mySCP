import { Text, View } from "react-native";
import { announcements, chaburos, currentUser, learningFiles, reviewQuestions } from "../../src/data/mockData";
import { Button, Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { fileTypeLabel } from "../../src/shared/format";

const chaburah = chaburos.find((item) => item.id === currentUser.chaburahId);
const localAnnouncements = announcements.filter((item) => item.chaburahId === currentUser.chaburahId);
const localFiles = learningFiles.filter(
  (item) => item.visibility === "everyone" || item.chaburahId === currentUser.chaburahId
);
const assignedQuestions = reviewQuestions.filter((item) => item.enabled && item.week <= 7);

export default function MyChaburahScreen() {
  return (
    <Screen title="My Chaburah" eyebrow={chaburah?.name}>
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
        <Button label="Join or Change Chaburah" variant="secondary" />
      </Card>

      <Card>
        <SectionTitle>Announcements</SectionTitle>
        {localAnnouncements.map((announcement) => (
          <View key={announcement.id}>
            <Text style={styles.body}>{announcement.title}</Text>
            <Text style={styles.muted}>{announcement.body}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle>Source Sheets & Recordings</SectionTitle>
        {localFiles.slice(0, 3).map((file) => (
          <Row key={file.id}>
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>{file.title}</Text>
              <Text style={styles.muted}>Week {file.week} - {fileTypeLabel(file.fileType)}</Text>
            </View>
            <Pill label={file.visibility === "everyone" ? "Everyone" : "Local"} />
          </Row>
        ))}
      </Card>

      <Card>
        <SectionTitle>Review Assigned</SectionTitle>
        <Text style={styles.muted}>{assignedQuestions.length} questions are available for this zman.</Text>
        <Button label="Start Review" />
      </Card>

      <Card>
        <SectionTitle>Ask the Rav</SectionTitle>
        <Text style={styles.muted}>Questions submitted here go to {chaburah?.rabbiName}.</Text>
        <Button label="Ask a Question" variant="secondary" />
      </Card>
    </Screen>
  );
}
