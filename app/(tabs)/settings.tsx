import { Text } from "react-native";
import { Card, Screen, SectionTitle, styles } from "../../src/shared/components";

export default function SettingsScreen() {
  return (
    <Screen title="Settings" eyebrow="Account">
      <Card>
        <SectionTitle>App Preferences</SectionTitle>
        <Text style={styles.muted}>Notification, display, and account controls will live here.</Text>
      </Card>

      <Card>
        <SectionTitle>Learning Preferences</SectionTitle>
        <Text style={styles.muted}>Default chaburah, review reminders, and file settings will be added in a later checkpoint.</Text>
      </Card>
    </Screen>
  );
}
