import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { currentUser, learningFiles } from "../../src/data/mockData";
import {
  Button,
  Card,
  FilterChip,
  MetaText,
  Pill,
  Row,
  Screen,
  SearchField,
  SectionTitle,
  styles
} from "../../src/shared/components";
import { fileTypeLabel, visibilityLabel } from "../../src/shared/format";
import { FileType, Visibility } from "../../src/shared/types";

const fileTypes: Array<FileType | "all"> = ["all", "source_sheet", "review_sheet", "recording", "link"];
const scopes: Array<Visibility | "all"> = ["all", "everyone", "chaburah"];

export default function FilesScreen() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<FileType | "all">("all");
  const [selectedScope, setSelectedScope] = useState<Visibility | "all">("all");

  const visibleFiles = useMemo(
    () =>
      learningFiles.filter((file) => file.visibility === "everyone" || file.chaburahId === currentUser.chaburahId),
    []
  );

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleFiles.filter((file) => {
      const matchesSearch =
        query.length === 0 ||
        file.title.toLowerCase().includes(query) ||
        file.topic.toLowerCase().includes(query) ||
        fileTypeLabel(file.fileType).toLowerCase().includes(query);
      const matchesType = selectedType === "all" || file.fileType === selectedType;
      const matchesScope = selectedScope === "all" || file.visibility === selectedScope;
      return matchesSearch && matchesType && matchesScope;
    });
  }, [search, selectedScope, selectedType, visibleFiles]);

  return (
    <Screen title="Files" eyebrow="Source sheets, review sheets, recordings">
      <Card>
        <SectionTitle>Find Learning Materials</SectionTitle>
        <SearchField onChangeText={setSearch} placeholder="Search by title, topic, or type..." value={search} />

        <View style={{ gap: 8 }}>
          <MetaText>Scope</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {scopes.map((scope) => (
              <FilterChip
                key={scope}
                label={scope === "all" ? "All" : visibilityLabel(scope)}
                onPress={() => setSelectedScope(scope)}
                selected={selectedScope === scope}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <MetaText>Type</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {fileTypes.map((type) => (
              <FilterChip
                key={type}
                label={type === "all" ? "All Types" : fileTypeLabel(type)}
                onPress={() => setSelectedType(type)}
                selected={selectedType === type}
              />
            ))}
          </View>
        </View>
      </Card>

      <Row>
        <SectionTitle>{filteredFiles.length} Files</SectionTitle>
        <Pill label={selectedScope === "all" ? "All scopes" : visibilityLabel(selectedScope)} tone="accent" />
      </Row>

      {filteredFiles.length === 0 ? (
        <Card>
          <SectionTitle>No Files Found</SectionTitle>
          <Text style={styles.muted}>Try a different search term or filter.</Text>
        </Card>
      ) : (
        filteredFiles.map((file) => (
          <Card key={file.id}>
            <Row>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.sectionTitle}>{file.title}</Text>
                <Text style={styles.muted}>Week {file.week} - {file.topic}</Text>
              </View>
              <Pill label={fileTypeLabel(file.fileType)} tone="accent" />
            </Row>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pill label={visibilityLabel(file.visibility)} tone={file.visibility === "everyone" ? "primary" : "neutral"} />
              <Pill label={`By ${file.uploadedBy}`} />
            </View>

            <Row>
              <MetaText>Organized by title, topic, week, type, and scope.</MetaText>
              <View style={{ minWidth: 112 }}>
                <Button label="Open" variant="secondary" />
              </View>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
