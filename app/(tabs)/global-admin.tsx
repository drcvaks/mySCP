import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
  StatusBanner,
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
const participantRoleFilters = ["all", "participant", "local_rabbi", "local_admin", "global_admin"] as const;
type ParticipantRoleFilter = (typeof participantRoleFilters)[number];

interface ParticipantDirectoryRow {
  id: string;
  fullName: string;
  email: string;
  city: string;
  role: UserRole;
  currentChaburahId?: string;
  currentChaburahName: string;
  activeMemberships: {
    chaburahId: string;
    chaburahName: string;
    memberRole: string;
  }[];
}

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
  const { chaburos, currentReviewWeek, loading, refresh, updateCurrentReviewWeek } = useAppState();
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
  const [reviewWeekInput, setReviewWeekInput] = useState(String(currentReviewWeek));
  const [chaburahSearch, setChaburahSearch] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantRoleFilter, setParticipantRoleFilter] = useState<ParticipantRoleFilter>("all");
  const [participantChaburahFilter, setParticipantChaburahFilter] = useState("all");
  const [participants, setParticipants] = useState<ParticipantDirectoryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [message, setMessage] = useState("");
  const filteredChaburos = chaburos.filter((chaburah) => {
    const query = chaburahSearch.trim().toLowerCase();
    if (!query) return true;
    return [chaburah.name, chaburah.city, chaburah.country, chaburah.rabbiName, chaburah.address]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const filteredParticipants = participants.filter((participant) => {
    const query = participantSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        participant.fullName,
        participant.email,
        participant.city,
        participant.currentChaburahName,
        ...participant.activeMemberships.map((membership) => membership.chaburahName)
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    const matchesRole = participantRoleFilter === "all" || participant.role === participantRoleFilter;
    const matchesChaburah =
      participantChaburahFilter === "all" ||
      (participantChaburahFilter === "none"
        ? participant.activeMemberships.length === 0
        : participant.activeMemberships.some((membership) => membership.chaburahId === participantChaburahFilter));
    return matchesSearch && matchesRole && matchesChaburah;
  });

  useEffect(() => {
    setReviewWeekInput(String(currentReviewWeek));
  }, [currentReviewWeek]);

  useEffect(() => {
    void loadParticipantDirectory();
  }, [chaburos]);

  async function refreshGlobalAdmin() {
    await Promise.all([refresh(), loadParticipantDirectory()]);
  }

  async function loadParticipantDirectory() {
    setLoadingParticipants(true);
    const [profilesResult, membershipsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,city,role,current_chaburah_id")
        .order("full_name", { ascending: true }),
      supabase
        .from("chaburah_members")
        .select("user_id,chaburah_id,member_role,status")
        .eq("status", "active")
    ]);
    setLoadingParticipants(false);

    const firstError = profilesResult.error ?? membershipsResult.error;
    if (firstError) {
      setMessage(firstError.message);
      return;
    }

    const chaburahById = new Map(chaburos.map((chaburah) => [chaburah.id, chaburah.name]));
    const activeMembershipsByUserId = new Map<string, ParticipantDirectoryRow["activeMemberships"]>();
    (membershipsResult.data ?? []).forEach((membership) => {
      const current = activeMembershipsByUserId.get(membership.user_id) ?? [];
      current.push({
        chaburahId: membership.chaburah_id,
        chaburahName: chaburahById.get(membership.chaburah_id) ?? "Unknown chaburah",
        memberRole: membership.member_role
      });
      activeMembershipsByUserId.set(membership.user_id, current);
    });

    setParticipants(
      (profilesResult.data ?? []).map((profileRow) => {
        const activeMemberships = activeMembershipsByUserId.get(profileRow.id) ?? [];
        const currentChaburahName =
          profileRow.current_chaburah_id
            ? chaburahById.get(profileRow.current_chaburah_id) ?? "Unknown chaburah"
            : activeMemberships[0]?.chaburahName ?? "Not assigned";
        return {
          id: profileRow.id,
          fullName: profileRow.full_name || "Name not set",
          email: profileRow.email,
          city: profileRow.city || "City not set",
          role: profileRow.role,
          currentChaburahId: profileRow.current_chaburah_id ?? undefined,
          currentChaburahName,
          activeMemberships
        };
      })
    );
  }

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
    await loadParticipantDirectory();
  }

  async function saveCurrentReviewWeek() {
    const parsedWeek = Number(reviewWeekInput);
    if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 52) {
      setMessage("Current review week must be a number from 1 to 52.");
      return;
    }
    setSaving(true);
    setMessage("");
    const result = await updateCurrentReviewWeek(parsedWeek);
    setSaving(false);
    if (result) {
      setMessage(result);
      return;
    }
    setMessage(`Current review week updated to Week ${parsedWeek}.`);
  }

  return (
    <Screen title="Global Admin" eyebrow="SCP headquarters" onRefresh={refreshGlobalAdmin} refreshing={loading || loadingParticipants}>
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Leadership Console</SectionTitle>
            <Text style={styles.muted}>Create chaburos, manage active status, and manage global app access.</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pill label={`Week ${currentReviewWeek}`} tone="accent" />
            <Pill label={`${chaburos.length} chaburos`} tone="primary" />
          </View>
        </Row>
      </Card>

      <StatusBanner
        message={message}
        tone={message.includes("created") || message.includes("activated") || message.includes("deactivated") || message.includes("updated") || message.includes("now") ? "success" : "error"}
      />

      <Card>
        <SectionTitle>Live Overview</SectionTitle>
        <Row>
          <View style={{ minWidth: 160 }}>
            <Text style={styles.statNumber}>{chaburos.length}</Text>
            <MetaText>Configured chaburos</MetaText>
          </View>
          <View style={{ minWidth: 160 }}>
            <Text style={styles.statNumber}>{currentReviewWeek}</Text>
            <MetaText>Current review week</MetaText>
          </View>
        </Row>
      </Card>

      <Card>
        <SectionTitle>Current Review Week</SectionTitle>
        <Text style={styles.muted}>This controls the default week across Review, Rabbi Hub, Files, Admin uploads, and Dashboard prompts.</Text>
        <Row>
          <View style={{ flex: 1, minWidth: 160 }}>
            <FormInput
              keyboardType="numeric"
              onChangeText={setReviewWeekInput}
              placeholder="Current week"
              value={reviewWeekInput}
            />
          </View>
          <View style={{ minWidth: 140 }}>
            <Button disabled={saving} label={saving ? "Saving..." : "Save Week"} onPress={saveCurrentReviewWeek} />
          </View>
        </Row>
        <MetaText>Current setting: Week {currentReviewWeek}</MetaText>
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
            <SectionTitle>Participant Directory</SectionTitle>
            <Text style={styles.muted}>Find users by name, email, city, role, or chaburah.</Text>
          </View>
          <Pill label={`${filteredParticipants.length} of ${participants.length}`} tone="accent" />
        </Row>
        <SearchField
          onChangeText={setParticipantSearch}
          placeholder="Search users, email, city, or chaburah..."
          value={participantSearch}
        />
        <View style={{ gap: 8 }}>
          <MetaText>Role</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {participantRoleFilters.map((role) => (
              <FilterChip
                key={role}
                label={role === "all" ? "All Roles" : roleLabel(role)}
                onPress={() => setParticipantRoleFilter(role)}
                selected={participantRoleFilter === role}
              />
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <MetaText>Chaburah</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="All Chaburos" onPress={() => setParticipantChaburahFilter("all")} selected={participantChaburahFilter === "all"} />
            <FilterChip label="No Active Chaburah" onPress={() => setParticipantChaburahFilter("none")} selected={participantChaburahFilter === "none"} />
            {chaburos.map((chaburah) => (
              <FilterChip
                key={chaburah.id}
                label={chaburah.name}
                onPress={() => setParticipantChaburahFilter(chaburah.id)}
                selected={participantChaburahFilter === chaburah.id}
              />
            ))}
          </View>
        </View>
        {filteredParticipants.length === 0 ? (
          <Text style={styles.muted}>No users match those filters.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 520 }} nestedScrollEnabled>
            <View style={{ gap: 12 }}>
              {filteredParticipants.map((participant) => (
                <View key={participant.id} style={{ gap: 8 }}>
                  <Row>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={styles.body}>{participant.fullName}</Text>
                      <MetaText>{participant.email}</MetaText>
                    </View>
                    <Pill label={roleLabel(participant.role)} tone={participant.role === "global_admin" ? "primary" : "neutral"} />
                  </Row>
                  <Row>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <MetaText>City: {participant.city}</MetaText>
                      <MetaText>Current chaburah: {participant.currentChaburahName}</MetaText>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                      {participant.activeMemberships.length === 0 ? (
                        <Pill label="No active membership" tone="neutral" />
                      ) : (
                        participant.activeMemberships.map((membership) => (
                          <Pill
                            key={`${participant.id}-${membership.chaburahId}-${membership.memberRole}`}
                            label={`${membership.chaburahName} - ${membership.memberRole}`}
                            tone="accent"
                          />
                        ))
                      )}
                    </View>
                  </Row>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
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
