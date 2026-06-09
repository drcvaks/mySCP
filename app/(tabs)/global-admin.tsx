import { Text } from "react-native";
import { Card, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";

export default function GlobalAdminScreen() {
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
        <SectionTitle>Sample Analytics</SectionTitle>
        <Text style={styles.statNumber}>173 Active Chaburos</Text>
        <Text style={styles.statNumber}>2,481 Active Users</Text>
        <Text style={styles.statNumber}>84% Average Readiness</Text>
      </Card>
    </Screen>
  );
}
