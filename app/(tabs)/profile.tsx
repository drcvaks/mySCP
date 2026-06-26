import { Text } from "react-native";
import { Button, Card, Screen, SectionTitle, styles } from "../../src/shared/components";
import { roleLabel } from "../../src/shared/format";
import { useAuthState } from "../../src/state/AuthState";

export default function ProfileScreen() {
  const { profile, signOut } = useAuthState();
  if (!profile) return null;

  return (
    <Screen title="Profile" eyebrow="Settings">
      <Card>
        <SectionTitle>{profile.fullName || "Name not set"}</SectionTitle>
        <Text style={styles.muted}>{roleLabel(profile.role)}</Text>
        <Text style={styles.body}>{profile.email}</Text>
        <Text style={styles.muted}>Email changes are managed through Supabase Auth.</Text>
      </Card>

      <Card>
        <SectionTitle>Registration Details</SectionTitle>
        <Text style={styles.body}>{profile.city || "City not set"}, {profile.country}</Text>
        <Text style={styles.muted}>Phone: {profile.phone ?? "Not provided"}</Text>
      </Card>

      <Card>
        <Button label="Sign Out" onPress={signOut} variant="secondary" />
      </Card>
    </Screen>
  );
}
