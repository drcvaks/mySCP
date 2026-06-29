import { useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Card,
  FilterChip,
  FormInput,
  MetaText,
  Pill,
  Row,
  Screen,
  SearchField,
  SectionTitle,
  TextArea,
  styles
} from "../../src/shared/components";
import { roleLabel } from "../../src/shared/format";
import { UserRole } from "../../src/shared/types";
import { formatSchedule, meridiems, weekDays } from "../../src/shared/schedule";
import { supabase } from "../../src/lib/supabase";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

const assignableRoles: UserRole[] = ["global_admin", "participant"];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function GlobalAdminScreen() {
  const { profile, refreshProfile } = useAuthState();
  const { chaburos, refresh } = useAppState();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [rabbiName, setRabbiName] = useState("");
  const [scheduleDay, setScheduleDay] = useState("Sunday");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleMeridiem, setScheduleMeridiem] = useState("PM");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");
  const [roleEmail, setRoleEmail] = useState("");
  const [targetRole, setTargetRole] = useState<UserRole>("participant");
  const [chaburahSearch, setChaburahSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const filteredChaburos = chaburos.filter((chaburah) => {
    const query = chaburahSearch.trim().toLowerCase();
    if (!query) return true;
    return [chaburah.name, chaburah.city, chaburah.country, chaburah.rabbiName, chaburah.address]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  async function createChaburah() {
    if (!profile?.id || !name.trim() || !city.trim()) {
      setMessage("Add at least a chaburah name and city.");
      return;
    }
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("chaburos").insert({
      name: name.trim(),
      slug: slugify(`${name}-${city}`),
      address: address.trim() || null,
      city: city.trim(),
      state: state.trim() || null,
      country: country.trim() || "United States",
      rabbi_name: rabbiName.trim() || null,
      schedule_text: scheduleTime.trim() ? formatSchedule(scheduleDay, scheduleTime, scheduleMeridiem) : null,
      contact_email: contactEmail.trim() || null,
      description: description.trim() || null,
      status: "active",
      discussion_enabled: false,
      join_requires_approval: false,
      created_by: profile.id
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setName("");
    setAddress("");
    setCity("");
    setState("");
    setCountry("United States");
    setRabbiName("");
    setScheduleDay("Sunday");
    setScheduleTime("");
    setScheduleMeridiem("PM");
    setContactEmail("");
    setDescription("");
    setMessage("Chaburah created.");
    await refresh();
  }

  async function setChaburahStatus(chaburahId: string, status: "active" | "inactive") {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("chaburos").update({ status }).eq("id", chaburahId);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(status === "active" ? "Chaburah activated." : "Chaburah deactivated.");
    await refresh();
  }

  async function assignRole() {
    const email = roleEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setMessage("Enter a valid user email.");
      return;
    }
    setSaving(true);
    setMessage("");
    const { data: targetProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email")
      .eq("email", email)
      .single();
    if (profileError || !targetProfile) {
      setSaving(false);
      setMessage(profileError?.message ?? "No profile found for that email.");
      return;
    }
    const { error: roleError } = await supabase.rpc("admin_set_user_role", {
      target_user_id: targetProfile.id,
      new_role: targetRole
    });
    setSaving(false);
    if (roleError) {
      setMessage(roleError.message);
      return;
    }
    setMessage(`${email} is now ${roleLabel(targetRole)}.`);
    if (targetProfile.id === profile?.id) await refreshProfile();
  }

  return (
    <Screen title="Global Admin" eyebrow="SCP headquarters">
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Leadership Console</SectionTitle>
            <Text style={styles.muted}>Create chaburos, manage active status, and manage global app access.</Text>
          </View>
          <Pill label={`${chaburos.length} chaburos`} tone="primary" />
        </Row>
        {message ? <Text style={message.includes("created") || message.includes("activated") || message.includes("now") ? styles.successText : styles.errorText}>{message}</Text> : null}
      </Card>

      <Card>
        <SectionTitle>Live Overview</SectionTitle>
        <Row>
          <View style={{ minWidth: 160 }}>
            <Text style={styles.statNumber}>{chaburos.length}</Text>
            <MetaText>Configured chaburos</MetaText>
          </View>
        </Row>
      </Card>

      <Card>
        <SectionTitle>Create Chaburah</SectionTitle>
        <FormInput onChangeText={setName} placeholder="Chaburah name" value={name} />
        <FormInput onChangeText={setAddress} placeholder="Address" value={address} />
        <Row>
          <View style={{ flex: 1, minWidth: 180 }}>
            <FormInput onChangeText={setCity} placeholder="City" value={city} />
          </View>
          <View style={{ flex: 1, minWidth: 120 }}>
            <FormInput onChangeText={setState} placeholder="State" value={state} />
          </View>
        </Row>
        <FormInput onChangeText={setCountry} placeholder="Country" value={country} />
        <FormInput onChangeText={setRabbiName} placeholder="Rabbi name" value={rabbiName} />
        <FormInput keyboardType="email-address" onChangeText={setContactEmail} placeholder="Contact email" value={contactEmail} />
        <View style={{ gap: 8 }}>
          <MetaText>Schedule</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {weekDays.map((day) => (
              <FilterChip key={day} label={day} onPress={() => setScheduleDay(day)} selected={scheduleDay === day} />
            ))}
          </View>
          <Row>
            <View style={{ flex: 1, minWidth: 160 }}>
              <FormInput onChangeText={setScheduleTime} placeholder="Time, e.g. 8:00" value={scheduleTime} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {meridiems.map((meridiem) => (
                <FilterChip
                  key={meridiem}
                  label={meridiem}
                  onPress={() => setScheduleMeridiem(meridiem)}
                  selected={scheduleMeridiem === meridiem}
                />
              ))}
            </View>
          </Row>
        </View>
        <TextArea onChangeText={setDescription} placeholder="Description" value={description} />
        <Button disabled={saving} label={saving ? "Saving..." : "Create Chaburah"} onPress={createChaburah} />
      </Card>

      <Card>
        <SectionTitle>Global Access</SectionTitle>
        <Text style={styles.muted}>
          Use Admin to assign local rabbis and local admins to a specific chaburah. This tool is only for global admin
          access or resetting a user back to participant.
        </Text>
        <FormInput keyboardType="email-address" onChangeText={setRoleEmail} placeholder="user@example.com" value={roleEmail} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {assignableRoles.map((role) => (
            <FilterChip
              key={role}
              label={role === "participant" ? "Reset to Participant" : roleLabel(role)}
              onPress={() => setTargetRole(role)}
              selected={targetRole === role}
            />
          ))}
        </View>
        <Button disabled={saving} label={saving ? "Saving..." : targetRole === "participant" ? "Reset User" : "Promote to Global Admin"} onPress={assignRole} />
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Chaburos</SectionTitle>
            <Text style={styles.muted}>Search before activating or deactivating a chaburah.</Text>
          </View>
          <Pill label={`${filteredChaburos.length} of ${chaburos.length}`} tone="accent" />
        </Row>
        <SearchField
          onChangeText={setChaburahSearch}
          placeholder="Search by chaburah, city, address, or rabbi..."
          value={chaburahSearch}
        />
        {filteredChaburos.length === 0 ? <Text style={styles.muted}>No chaburos match that search.</Text> : null}
        {filteredChaburos.map((chaburah) => (
          <View key={chaburah.id} style={{ gap: 8 }}>
            <Row>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.body}>{chaburah.name}</Text>
                <MetaText>{chaburah.city}, {chaburah.country} - {chaburah.memberCount} members</MetaText>
              </View>
              <Pill label={chaburah.status === "active" ? "Active" : "Inactive"} tone={chaburah.status === "active" ? "success" : "danger"} />
              <Pill label={chaburah.rabbiName} tone="accent" />
            </Row>
            <Row>
              <MetaText>{chaburah.schedule}</MetaText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  disabled={saving || chaburah.status === "active"}
                  label="Activate"
                  onPress={() => setChaburahStatus(chaburah.id, "active")}
                  variant="secondary"
                />
                <Button
                  disabled={saving || chaburah.status === "inactive"}
                  label="Deactivate"
                  onPress={() => setChaburahStatus(chaburah.id, "inactive")}
                  variant="ghost"
                />
              </View>
            </Row>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
