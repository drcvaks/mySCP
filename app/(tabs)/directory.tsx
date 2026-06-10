import { useMemo, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { chaburos, currentUser } from "../../src/data/mockData";
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

export default function DirectoryScreen() {
  const [search, setSearch] = useState("");
  const { width } = useWindowDimensions();
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
  }, [search]);

  return (
    <Screen title="Directory" eyebrow="Find SCP locations">
      <CompactCard>
        <SectionTitle>Find a Chaburah</SectionTitle>
        <Text style={styles.muted}>Search by chaburah name, city, address, or rabbi.</Text>
        <SearchField
          onChangeText={setSearch}
          placeholder={`Search near ${currentUser.city}, ${currentUser.country}...`}
          value={search}
        />
      </CompactCard>

      <Row>
        <SectionTitle>{filteredChaburos.length} Chaburos</SectionTitle>
        <Pill label={`Default: ${currentUser.city}`} tone="accent" />
      </Row>

      {filteredChaburos.length === 0 ? (
        <CompactCard>
          <SectionTitle>No Chaburos Found</SectionTitle>
          <Text style={styles.muted}>Try searching by a different city, shul, or rav.</Text>
        </CompactCard>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md }}>
          {filteredChaburos.map((chaburah) => {
            const joined = chaburah.id === currentUser.chaburahId;

            return (
              <View key={chaburah.id} style={{ width: cardWidth, maxWidth: 500 }}>
                <CompactCard>
                  <Row>
                    <View style={{ flex: 1, minWidth: 190 }}>
                      <Text style={styles.sectionTitle}>{chaburah.name}</Text>
                      <MetaText>{chaburah.address}</MetaText>
                    </View>
                    {joined ? <Pill label="Joined" tone="primary" /> : null}
                  </Row>

                  <View style={{ gap: 6 }}>
                    <Text style={styles.body}>Rabbi: {chaburah.rabbiName}</Text>
                    <MetaText>Schedule: {chaburah.schedule}</MetaText>
                    <MetaText>Location: {chaburah.city}, {chaburah.country}</MetaText>
                  </View>

                  <Row>
                    <Pill label={`${chaburah.memberCount} members`} tone="accent" />
                    <View style={{ minWidth: 132 }}>
                      <Button label={joined ? "Joined" : "Join"} variant={joined ? "secondary" : "primary"} />
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
