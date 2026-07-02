import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, FormInput, Row, Screen, SectionTitle, StatusBanner, styles } from "../../src/shared/components";
import { roleLabel } from "../../src/shared/format";
import { supabase } from "../../src/lib/supabase";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";

export default function ProfileScreen() {
  const { chaburos } = useAppState();
  const { loading, profile, refreshProfile, signOut } = useAuthState();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentChaburah = useMemo(
    () => chaburos.find((chaburah) => chaburah.id === profile?.chaburahId),
    [chaburos, profile?.chaburahId]
  );

  useEffect(() => {
    if (!profile) return;
    const { first, last } = splitName(profile.fullName);
    setFirstName(first);
    setLastName(last);
    setCity(profile.city ?? "");
  }, [profile]);

  if (!profile) return null;

  async function saveProfile() {
    if (!profile) return;
    if (!firstName.trim() || !lastName.trim()) {
      setMessage("Add your first and last name.");
      return;
    }

    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        city: city.trim() || null
      })
      .eq("id", profile.id);
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await refreshProfile();
    setMessage("Profile saved.");
  }

  return (
    <Screen title="Profile" eyebrow="Settings" onRefresh={refreshProfile} refreshing={loading}>
      <Card>
        <SectionTitle>{profile.fullName || "Name not set"}</SectionTitle>
        <Text style={styles.muted}>{roleLabel(profile.role)}</Text>
        <Text style={styles.body}>{profile.email}</Text>
        <Text style={styles.muted}>Email changes are managed through Supabase Auth.</Text>
      </Card>

      <StatusBanner message={message} tone={message.includes("saved") ? "success" : "error"} />

      <Card>
        <SectionTitle>Edit Profile</SectionTitle>
        <Row>
          <View style={{ flex: 1, minWidth: 150 }}>
            <FormInput onChangeText={setFirstName} placeholder="First name" value={firstName} />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <FormInput onChangeText={setLastName} placeholder="Last name" value={lastName} />
          </View>
        </Row>
        <FormInput onChangeText={setCity} placeholder="City (optional)" value={city} />
        <Button disabled={saving} label={saving ? "Saving..." : "Save Profile"} onPress={saveProfile} />
      </Card>

      <Card>
        <SectionTitle>Registration Details</SectionTitle>
        <Text style={styles.body}>{city || "City not set"}, {profile.country}</Text>
        <Text style={styles.muted}>Current chaburah: {currentChaburah?.name ?? "Not joined"}</Text>
        <Text style={styles.muted}>Role: {roleLabel(profile.role)}</Text>
      </Card>

      <Card>
        <Button label="Sign Out" onPress={signOut} variant="secondary" />
      </Card>
    </Screen>
  );
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
