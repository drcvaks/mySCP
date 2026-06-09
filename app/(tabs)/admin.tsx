import { Text } from "react-native";
import { Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";

export default function AdminScreen() {
  return (
    <Screen title="Admin" eyebrow="Local chaburah tools placeholder">
      <Card>
        <SectionTitle>Chaburah Management</SectionTitle>
        <Text style={styles.muted}>
          Admins and rabbis will manage members, local announcements, files, schedules, reminders, and discussion
          settings here.
        </Text>
        <Row>
          <Pill label="Members" tone="primary" />
          <Pill label="Announcements" />
          <Pill label="Files" />
          <Pill label="Settings" />
        </Row>
      </Card>
    </Screen>
  );
}
