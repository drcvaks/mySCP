import { Text } from "react-native";
import { currentUser } from "../../src/data/mockData";
import { Card, Screen, SectionTitle, styles } from "../../src/shared/components";
import { roleLabel } from "../../src/shared/format";

export default function ProfileScreen() {
  return (
    <Screen title="Profile" eyebrow="Settings">
      <Card>
        <SectionTitle>{currentUser.fullName}</SectionTitle>
        <Text style={styles.muted}>{roleLabel(currentUser.role)}</Text>
        <Text style={styles.body}>{currentUser.email}</Text>
        <Text style={styles.muted}>Email cannot be changed in settings.</Text>
      </Card>

      <Card>
        <SectionTitle>Registration Details</SectionTitle>
        <Text style={styles.body}>{currentUser.city}, {currentUser.country}</Text>
        <Text style={styles.muted}>Phone: {currentUser.phone ?? "Not provided"}</Text>
      </Card>
    </Screen>
  );
}
