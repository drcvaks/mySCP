import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  Button,
  CompactCard,
  EmptyState,
  IconTile,
  MetaText,
  Pill,
  Row,
  Screen,
  SearchField,
  SectionTitle,
  StatusBanner,
  styles
} from "../../src/shared/components";
import { theme } from "../../src/shared/theme";
import { useAppState } from "../../src/state/AppState";
import { useAuthState } from "../../src/state/AuthState";
import { Ionicons } from "@expo/vector-icons";

export default function DirectoryScreen() {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const { width } = useWindowDimensions();
  const { chaburos, joinChaburah, loading, memberships, refresh, selectedChaburahId } = useAppState();
  const { profile } = useAuthState();
  const cardWidth = width >= 900 ? "48.8%" : "100%";

  const filteredChaburos = useMemo(() => {
    const query = search.trim().toLowerCase();
    const activeChaburos = chaburos.filter((chaburah) => chaburah.status === "active");
    if (!query) return activeChaburos;
    return activeChaburos.filter((chaburah) =>
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
        void join(chaburahId);
      }
      return;
    }
    Alert.alert(
      "Change Chaburah?",
      `Join ${name} as your current chaburah?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Join", onPress: () => void join(chaburahId) }
      ]
    );
  }

  return (
    <Screen title="Directory" eyebrow="Find SCP locations" onRefresh={refresh} refreshing={loading}>
      <CompactCard>
        <SectionTitle icon="search-outline">Find a Chaburah</SectionTitle>
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
      <StatusBanner message={message} tone={message.includes("pending") ? "info" : "success"} />

      {filteredChaburos.length === 0 ? (
        <EmptyState icon="location-outline" title="No Chaburos Found" body="Try searching by a different city, shul, or rav." />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }}>
          {filteredChaburos.map((chaburah) => {
            const joined = chaburah.id === selectedChaburahId;
            const membership = memberships.find(
              (item) => item.chaburahId === chaburah.id && item.userId === profile?.id
            );
            const pending = membership?.status === "pending";

            return (
              <View key={chaburah.id} style={{ width: cardWidth, flexGrow: 1, minWidth: 300 }}>
                <CompactCard style={joined ? s.joinedCard : undefined}>
                  <Row>
                    <View style={{ flex: 1, minWidth: 190, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                      <IconTile icon={joined ? "checkmark-circle-outline" : "location-outline"} tone={joined ? "accent" : "brand"} size={42} />
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <Text style={styles.sectionTitle}>{chaburah.name}</Text>
                        <MetaText>{chaburah.address}</MetaText>
                      </View>
                    </View>
                    {joined ? <Pill label="Joined" tone="success" icon="checkmark-circle" /> : null}
                    {pending ? <Pill label="Pending Approval" tone="accent" /> : null}
                  </Row>

                  <View style={s.metaDetailsBox}>
                    <View style={s.metaItem}>
                      <Ionicons name="person-outline" size={14} color={theme.colors.primary} />
                      <Text style={s.metaItemText}>Rabbi: {chaburah.rabbiName}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                      <Text style={s.metaItemText}>Schedule: {chaburah.schedule}</Text>
                    </View>
                    <View style={s.metaItem}>
                      <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
                      <Text style={s.metaItemText}>Location: {chaburah.city}, {chaburah.country}</Text>
                    </View>
                    {chaburah.joinRequiresApproval && !joined && !pending ? (
                      <MetaText>Joining this chaburah requires rabbi/admin approval.</MetaText>
                    ) : null}
                  </View>

                  <Row>
                    <Pill label={`${chaburah.memberCount} members`} tone="primary" icon="people" />
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

const s = StyleSheet.create({
  joinedCard: {
    borderColor: theme.colors.accentBorder,
    borderWidth: 1.5
  },
  metaDetailsBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 6,
    padding: 12
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  metaItemText: {
    color: theme.colors.inkSecondary,
    flex: 1,
    fontSize: 13,
    fontWeight: "600"
  }
});
