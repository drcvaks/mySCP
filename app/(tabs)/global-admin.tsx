import { Text } from "react-native";
import { Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { useAppState } from "../../src/state/AppState";

export default function GlobalAdminScreen() {
  const { chaburos, reviewSessions } = useAppState();
  return (
    <Screen title="Global Admin" eyebrow="SCP headquarters placeholder">
      <Card>
        <SectionTitle>Leadership Console</SectionTitle>
        <Text style={styles.muted}>
          Global admins will approve role requests, manage chaburos, publish global announcements, and maintain the
          official review library.
        </Text>
        <Row>
          <Pill label="Approve Requests" tone="primary" />
          <Pill label="Chaburos" />
          <Pill label="Announcements" />
          <Pill label="Analytics" />
        </Row>
      </Card>

      <Card>
        <SectionTitle>Live Overview</SectionTitle>
        <Text style={styles.statNumber}>{chaburos.length} Active Chaburos</Text>
        <Text style={styles.statNumber}>{reviewSessions.length} Visible Review Sessions</Text>
        <Text style={styles.muted}>Full administrative reporting will be added after the management workflows.</Text>
      </Card>
    </Screen>
  );
}
