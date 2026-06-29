import { useMemo, useState } from "react";
import { Alert, Platform, Text, useWindowDimensions, View } from "react-native";
import {
  Button,
  CompactCard,
  MetaText,
  Pill,
  Row,
  Screen,
  SearchField,
  SectionTitle,
  styles
} from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";

export default function DirectoryScreen() {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const { width } = useWindowDimensions();
  const { chaburos, joinChaburah, memberships, selectedChaburahId } = useAppState();
  const { profile } = useAuthState();
  const cardWidth = width >= 900 ? "48%" : "100%";

  const filteredChaburos = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chaburos;
    return chaburos.filter((chaburah) =>
      [chaburah.name, chaburah.city, chaburah.country, chaburah.rabbiName, chaburah.address]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [chaburos, search]);

  async function join(chaburahId: string) {
    const result = await joinChaburah(chaburahId);
    setMessage(result ?? "Chaburah membership updated.");
  }

  function confirmJoin(chaburahId: string, name: string) {
    if (chaburahId === selectedChaburahId) return;
    if (Platform.OS === "web") {
      if (globalThis.confirm(`Join ${name} as your current chaburah?`)) {
        join(chaburahId);
      }
      return;
    }
    Alert.alert(
      "Change Chaburah?",
      `Join ${name} as your current chaburah?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Join", onPress: () => join(chaburahId) }
      ]
    );
  }

  return (
    <Screen title="Directory" eyebrow="Find SCP locations">
      <CompactCard>
        <SectionTitle>Find a Chaburah</SectionTitle>
        <Text style={styles.muted}>Search by chaburah name, city, address, or rabbi.</Text>
        <SearchField
          onChangeText={setSearch}
          placeholder={`Search near ${profile?.city || "your city"}, ${profile?.country || ""}...`}
          value={search}
        />
      </CompactCard>

      <Row>
        <SectionTitle>{filteredChaburos.length} Chaburos</SectionTitle>
        <Pill label={`Default: ${profile?.city || "Not set"}`} tone="accent" />
      </Row>
      {message ? <Text style={message.includes("pending") ? styles.muted : styles.successText}>{message}</Text> : null}

      {filteredChaburos.length === 0 ? (
        <CompactCard>
          <SectionTitle>No Chaburos Found</SectionTitle>
          <Text style={styles.muted}>Try searching by a different city, shul, or rav.</Text>
        </CompactCard>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }}>
          {filteredChaburos.map((chaburah) => {
            const joined = chaburah.id === selectedChaburahId;
            const membership = memberships.find(
              (item) => item.chaburahId === chaburah.id && item.userId === profile?.id
            );
            const pending = membership?.status === "pending";

            return (
              <View key={chaburah.id} style={{ width: cardWidth, maxWidth: 500 }}>
                <CompactCard>
                  <Row>
                    <View style={{ flex: 1, minWidth: 190 }}>
                      <Text style={styles.sectionTitle}>{chaburah.name}</Text>
                      <MetaText>{chaburah.address}</MetaText>
                    </View>
                    {joined ? <Pill label="Joined" tone="primary" /> : null}
                    {pending ? <Pill label="Pending Approval" tone="accent" /> : null}
                  </Row>

                  <View style={{ gap: 6 }}>
                    <Text style={styles.body}>Rabbi: {chaburah.rabbiName}</Text>
                    <MetaText>Schedule: {chaburah.schedule}</MetaText>
                    <MetaText>Location: {chaburah.city}, {chaburah.country}</MetaText>
                    {chaburah.joinRequiresApproval && !joined && !pending ? (
                      <MetaText>Joining this chaburah requires rabbi/admin approval.</MetaText>
                    ) : null}
                  </View>

                  <Row>
                    <Pill label={`${chaburah.memberCount} members`} tone="accent" />
                    <View style={{ minWidth: 132 }}>
                      <Button
                        disabled={joined || pending}
                        label={joined ? "Joined" : pending ? "Pending" : chaburah.joinRequiresApproval ? "Request Join" : "Join"}
                        onPress={() => confirmJoin(chaburah.id, chaburah.name)}
                        variant={joined ? "secondary" : "primary"}
                      />
                    </View>
                  </Row>
                </CompactCard>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
