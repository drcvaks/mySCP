import { useEffect, useState } from "react";
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
  SectionTitle,
  TextArea,
  styles
} from "../../src/shared/components";
import { fileTypeLabel, visibilityLabel } from "../../src/shared/format";
import { FileType, Visibility } from "../../src/shared/types";
import { supabase } from "../../src/lib/supabase";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

const fileTypes: FileType[] = ["source_sheet", "review_sheet", "recording", "pdf", "link"];

export default function AdminScreen() {
  const { profile } = useAuthState();
  const { chaburos, learningFiles, refresh, selectedChaburahId } = useAppState();
  const managedChaburahId = profile?.role === "global_admin" ? selectedChaburahId : profile?.chaburahId;
  const chaburah = chaburos.find((item) => item.id === managedChaburahId);
  const [address, setAddress] = useState("");
  const [schedule, setSchedule] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [description, setDescription] = useState("");
  const [discussionEnabled, setDiscussionEnabled] = useState(false);
  const [joinRequiresApproval, setJoinRequiresApproval] = useState(false);
  const [fileTitle, setFileTitle] = useState("");
  const [fileTopic, setFileTopic] = useState("");
  const [fileWeek, setFileWeek] = useState("1");
  const [fileUrl, setFileUrl] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [fileType, setFileType] = useState<FileType>("source_sheet");
  const [visibility, setVisibility] = useState<Visibility>(profile?.role === "global_admin" ? "everyone" : "chaburah");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!chaburah) return;
    setAddress(chaburah.address);
    setSchedule(chaburah.schedule);
    setZoomLink(chaburah.zoomLink ?? "");
    setDescription(chaburah.description ?? "");
    setDiscussionEnabled(chaburah.discussionEnabled);
    setJoinRequiresApproval(chaburah.joinRequiresApproval);
  }, [chaburah]);

  const localFiles = learningFiles.filter(
    (file) => file.visibility === "everyone" || file.chaburahId === managedChaburahId
  );

  async function saveChaburah() {
    if (!managedChaburahId) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("chaburos")
      .update({
        address: address.trim() || null,
        schedule_text: schedule.trim() || null,
        zoom_url: zoomLink.trim() || null,
        description: description.trim() || null,
        discussion_enabled: discussionEnabled,
        join_requires_approval: joinRequiresApproval
      })
      .eq("id", managedChaburahId);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Chaburah settings saved.");
    await refresh();
  }

  async function publishFile() {
    if (!profile?.id) return;
    const parsedWeek = Number(fileWeek);
    if (!fileTitle.trim() || !fileTopic.trim() || !fileUrl.trim()) {
      setMessage("Add a file title, topic, and URL.");
      return;
    }
    if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > 52) {
      setMessage("Week must be a number from 1 to 52.");
      return;
    }
    if (visibility === "chaburah" && !managedChaburahId) {
      setMessage("Choose or join a chaburah before publishing chaburah-only files.");
      return;
    }

    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("learning_files").insert({
      chaburah_id: visibility === "chaburah" ? managedChaburahId : null,
      title: fileTitle.trim(),
      description: fileDescription.trim() || null,
      topic: fileTopic.trim(),
      week: parsedWeek,
      file_type: fileType,
      visibility,
      external_url: fileUrl.trim(),
      uploaded_by: profile.id
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setFileTitle("");
    setFileTopic("");
    setFileWeek("1");
    setFileUrl("");
    setFileDescription("");
    setMessage("File published.");
    await refresh();
  }

  return (
    <Screen title="Admin" eyebrow="Local chaburah tools">
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>{chaburah ? chaburah.name : "No Chaburah Selected"}</SectionTitle>
            <Text style={styles.muted}>Manage the local details users see on Dashboard, Directory, and My Chaburah.</Text>
          </View>
          <Pill label={`${localFiles.length} files`} tone="accent" />
        </Row>
        {message ? <Text style={message.includes("saved") || message.includes("published") ? styles.successText : styles.errorText}>{message}</Text> : null}
      </Card>

      <Card>
        <SectionTitle>Chaburah Settings</SectionTitle>
        {!managedChaburahId ? (
          <Text style={styles.muted}>Join or select a chaburah before editing local settings.</Text>
        ) : (
          <>
            <FormInput onChangeText={setAddress} placeholder="Address" value={address} />
            <FormInput onChangeText={setSchedule} placeholder="Schedule" value={schedule} />
            <FormInput keyboardType="url" onChangeText={setZoomLink} placeholder="Zoom or meeting link" value={zoomLink} />
            <TextArea onChangeText={setDescription} placeholder="Short chaburah description" value={description} />
            <View style={{ gap: 8 }}>
              <MetaText>Discussion</MetaText>
              <Row>
                <FilterChip label="Enabled" onPress={() => setDiscussionEnabled(true)} selected={discussionEnabled} />
                <FilterChip label="Disabled" onPress={() => setDiscussionEnabled(false)} selected={!discussionEnabled} />
              </Row>
            </View>
            <View style={{ gap: 8 }}>
              <MetaText>Joining</MetaText>
              <Row>
                <FilterChip label="Approval Required" onPress={() => setJoinRequiresApproval(true)} selected={joinRequiresApproval} />
                <FilterChip label="Open Join" onPress={() => setJoinRequiresApproval(false)} selected={!joinRequiresApproval} />
              </Row>
            </View>
            <Button disabled={saving} label={saving ? "Saving..." : "Save Chaburah Settings"} onPress={saveChaburah} />
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>Publish Learning File</SectionTitle>
        <Text style={styles.muted}>Checkpoint 4 supports external URLs. Native upload can come after the admin flows settle.</Text>
        {profile?.role === "global_admin" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="Everyone" onPress={() => setVisibility("everyone")} selected={visibility === "everyone"} />
            <FilterChip label="Current Chaburah" onPress={() => setVisibility("chaburah")} selected={visibility === "chaburah"} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {fileTypes.map((type) => (
            <FilterChip key={type} label={fileTypeLabel(type)} onPress={() => setFileType(type)} selected={fileType === type} />
          ))}
        </View>
        <FormInput onChangeText={setFileTitle} placeholder="Title" value={fileTitle} />
        <FormInput onChangeText={setFileTopic} placeholder="Topic" value={fileTopic} />
        <FormInput keyboardType="numeric" onChangeText={setFileWeek} placeholder="Week" value={fileWeek} />
        <FormInput keyboardType="url" onChangeText={setFileUrl} placeholder="https://..." value={fileUrl} />
        <TextArea onChangeText={setFileDescription} placeholder="Description" value={fileDescription} />
        <Button disabled={saving} label={saving ? "Publishing..." : "Publish File"} onPress={publishFile} />
      </Card>

      <Card>
        <SectionTitle>Recent Files</SectionTitle>
        {localFiles.slice(0, 5).map((file) => (
          <Row key={file.id}>
            <View style={{ flex: 1, minWidth: 190 }}>
              <Text style={styles.body}>{file.title}</Text>
              <MetaText>Week {file.week} - {file.topic}</MetaText>
            </View>
            <Pill label={visibilityLabel(file.visibility)} tone={file.visibility === "everyone" ? "primary" : "neutral"} />
          </Row>
        ))}
        {localFiles.length === 0 ? <Text style={styles.muted}>No files have been published yet.</Text> : null}
      </Card>
    </Screen>
  );
}
