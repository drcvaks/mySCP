import { Text } from "react-native";
import { Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";

export default function RabbiHubScreen() {
  return (
    <Screen title="Rabbi Hub" eyebrow="Rabbi-only placeholder">
      <Card>
        <SectionTitle>Shared Rabbi Workspace</SectionTitle>
        <Text style={styles.muted}>
          Rabbi-only announcements, shared source sheets, shared review questions, planning discussion, and curriculum
          collaboration will live here.
        </Text>
        <Row>
          <Pill label="Announcements" tone="primary" />
          <Pill label="Source Sheets" />
          <Pill label="Review Questions" />
          <Pill label="Planning" />
        </Row>
      </Card>
    </Screen>
  );
}
