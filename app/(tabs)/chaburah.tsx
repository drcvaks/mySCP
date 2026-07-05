import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, MetaText, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { fileCoverageDetailLabel, fileTypeLabel } from "../../src/shared/format";
import { currentReviewWeek } from "../../src/shared/reviewWeeks";
import { useAppState } from "../../src/state/AppState";

export default function MyChaburahScreen() {
  const router = useRouter();
  const { announcements, chaburahMemberDirectory, chaburos, learningFiles, loading, refresh, reviewQuestions, selectedChaburahId } =
    useAppState();
  const chaburah = chaburos.find((item) => item.id === selectedChaburahId);
  const activeMembers = chaburahMemberDirectory.filter((member) => member.chaburahId === selectedChaburahId);
  const localAnnouncements = announcements.filter((item) => item.chaburahId === selectedChaburahId);
  const localFiles = learningFiles.filter(
    (item) => item.visibility === "everyone" || item.chaburahId === selectedChaburahId
  );
  const assignedQuestions = reviewQuestions.filter((item) => item.enabled && item.week <= currentReviewWeek + 3);

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
