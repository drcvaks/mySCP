import { useEffect, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
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
import { fileCoverageDetailLabel, fileCoverageLabel, fileTypeLabel, visibilityLabel } from "../../src/shared/format";
import { buildReviewWeeks, currentReviewWeek } from "../../src/shared/reviewWeeks";
import { formatSchedule, meridiems, parseSchedule, weekDays } from "../../src/shared/schedule";
import { ChaburahMembership, FileCoverage, FileType, LearningFile, Visibility } from "../../src/shared/types";
import { supabase } from "../../src/lib/supabase";
import { useAuthState } from "../../src/state/AuthState";
import { useAppState } from "../../src/state/AppState";

const fileTypes: FileType[] = ["source_sheet", "review_sheet", "recording", "video", "pdf", "other"];
type LeadershipRole = "rabbi" | "admin";
type MemberStatusFilter = ChaburahMembership["status"] | "all";
type FilePublishMode = "upload" | "link";
const memberStatusFilters: MemberStatusFilter[] = ["all", "active", "pending", "suspended", "left"];
const fileCoverages: FileCoverage[] = ["week", "bechina_review", "entire_zman"];
const fileWeekSelections = buildReviewWeeks();

export default function AdminScreen() {
  const { profile } = useAuthState();
  const {
    chaburos,
    learningFiles,
    loading,
    memberships,
    refresh,
    reviewMembershipRequest,
    selectedChaburahId,
    updateMembershipStatus
  } = useAppState();
  const [adminChaburahId, setAdminChaburahId] = useState<string | undefined>(undefined);
  const [chaburahSearch, setChaburahSearch] = useState("");
  const isGlobalAdmin = profile?.role === "global_admin";
  const managedChaburahId = isGlobalAdmin ? adminChaburahId : profile?.chaburahId;
  const chaburah = chaburos.find((item) => item.id === managedChaburahId);
  const [address, setAddress] = useState("");
  const [scheduleDay, setScheduleDay] = useState("Sunday");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleMeridiem, setScheduleMeridiem] = useState("PM");
  const [contactEmail, setContactEmail] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [description, setDescription] = useState("");
  const [discussionEnabled, setDiscussionEnabled] = useState(false);
  const [joinRequiresApproval, setJoinRequiresApproval] = useState(false);
  const [fileTitle, setFileTitle] = useState("");
  const [fileTopic, setFileTopic] = useState("");
  const [fileCoverage, setFileCoverage] = useState<FileCoverage>("week");
  const [fileWeek, setFileWeek] = useState(currentReviewWeek);
  const [fileUrl, setFileUrl] = useState("");
  const [fileDescription, setFileDescription] = useState("");
  const [fileType, setFileType] = useState<FileType>("source_sheet");
  const [filePublishMode, setFilePublishMode] = useState<FilePublishMode>("upload");
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [editingFile, setEditingFile] = useState<LearningFile | null>(null);
  const [visibility, setVisibility] = useState<Visibility>(profile?.role === "global_admin" ? "everyone" : "chaburah");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [leaderRole, setLeaderRole] = useState<LeadershipRole>("rabbi");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>("active");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isGlobalAdmin || adminChaburahId || chaburos.length === 0) return;
    setAdminChaburahId(selectedChaburahId ?? chaburos[0].id);
  }, [adminChaburahId, chaburos, isGlobalAdmin, selectedChaburahId]);

  useEffect(() => {
    if (!chaburah) return;
    const parsedSchedule = parseSchedule(chaburah.schedule);
    setAddress(chaburah.address);
    setScheduleDay(parsedSchedule.day);
    setScheduleTime(parsedSchedule.time);
    setScheduleMeridiem(parsedSchedule.meridiem);
    setContactEmail(chaburah.contactEmail ?? "");
    setZoomLink(chaburah.zoomLink ?? "");
    setDescription(chaburah.description ?? "");
    setDiscussionEnabled(chaburah.discussionEnabled);
    setJoinRequiresApproval(chaburah.joinRequiresApproval);
  }, [chaburah]);

  const localFiles = learningFiles.filter(
    (file) => file.visibility === "everyone" || file.chaburahId === managedChaburahId
  );
  const pendingJoinRequests = memberships.filter(
    (membership) =>
      membership.chaburahId === managedChaburahId &&
      membership.memberRole === "participant" &&
      membership.status === "pending"
  );
  const assignedLeaders = memberships.filter(
    (membership) =>
      membership.chaburahId === managedChaburahId &&
      membership.status === "active" &&
      (membership.memberRole === "rabbi" || membership.memberRole === "admin")
  );
  const filteredAdminChaburos = chaburos.filter((item) => {
    const query = chaburahSearch.trim().toLowerCase();
    if (!query) return true;
    return [item.name, item.city, item.country, item.rabbiName, item.address]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const chaburahMembers = memberships.filter((membership) => membership.chaburahId === managedChaburahId);
  const filteredMembers = chaburahMembers.filter((membership) => {
    const query = memberSearch.trim().toLowerCase();
    const matchesStatus = memberStatusFilter === "all" || membership.status === memberStatusFilter;
    const matchesSearch =
      query.length === 0 ||
      [membership.fullName ?? "", membership.email ?? "", membership.userId, membership.memberRole, membership.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return matchesStatus && matchesSearch;
  });
  const activeMemberCount = chaburahMembers.filter((membership) => membership.status === "active").length;

  async function saveChaburah() {
    if (!managedChaburahId) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("chaburos")
      .update({
        address: address.trim() || null,
        schedule_text: scheduleTime.trim() ? formatSchedule(scheduleDay, scheduleTime, scheduleMeridiem) : null,
        contact_email: contactEmail.trim() || null,
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
    if (!fileTitle.trim()) {
      setMessage("Add a file title.");
      return;
    }
    if (filePublishMode === "link" && !fileUrl.trim()) {
      setMessage("Add a URL for this learning file.");
      return;
    }
    if (filePublishMode === "upload" && !selectedFile && !editingFile?.storagePath) {
      setMessage("Choose a file to upload.");
      return;
    }
    if (visibility === "chaburah" && !managedChaburahId) {
      setMessage("Choose or join a chaburah before publishing chaburah-only files.");
      return;
    }

    setSaving(true);
    setMessage("");
    const wasEditing = Boolean(editingFile);
    const storagePath =
      filePublishMode === "upload"
        ? editingFile?.storagePath ?? buildStoragePath(visibility, managedChaburahId, selectedFile?.name || fileTitle.trim())
        : null;
    if (editingFile?.storagePath && filePublishMode === "link") {
      const { error: storageRemoveError } = await supabase.storage.from("learning-files").remove([editingFile.storagePath]);
      if (storageRemoveError) {
        setSaving(false);
        setMessage(storageRemoveError.message);
        return;
      }
    }
    const filePayload = {
      chaburah_id: visibility === "chaburah" ? managedChaburahId : null,
      title: fileTitle.trim(),
      description: fileDescription.trim() || null,
      topic: fileTopic.trim() || defaultFileTopic(fileCoverage, fileWeek),
      coverage: fileCoverage,
      week: fileCoverage === "week" ? fileWeek : null,
      file_type: fileType,
      visibility,
      external_url: filePublishMode === "link" ? fileUrl.trim() : null,
      storage_path: storagePath
    };

    const fileResult = editingFile
      ? await supabase
          .from("learning_files")
          .update(filePayload)
          .eq("id", editingFile.id)
          .select("id")
          .single()
      : await supabase
          .from("learning_files")
          .insert({
            ...filePayload,
            uploaded_by: profile.id
          })
          .select("id")
          .single();
    if (fileResult.error) {
      setSaving(false);
      setMessage(fileResult.error.message);
      return;
    }

    if (filePublishMode === "upload" && selectedFile && storagePath) {
      try {
        const uploadBody = await readDocumentForUpload(selectedFile);
        const { error: uploadError } = await supabase.storage.from("learning-files").upload(storagePath, uploadBody, {
          contentType: selectedFile.mimeType ?? "application/octet-stream",
          upsert: Boolean(editingFile)
        });
        if (uploadError) {
          if (!editingFile && fileResult.data?.id) {
            await supabase.from("learning_files").delete().eq("id", fileResult.data.id);
          } else if (editingFile) {
            await restoreFileRecord(editingFile);
          }
          setSaving(false);
          setMessage(uploadError.message);
          return;
        }
      } catch (uploadError) {
        if (!editingFile && fileResult.data?.id) {
          await supabase.from("learning_files").delete().eq("id", fileResult.data.id);
        } else if (editingFile) {
          await restoreFileRecord(editingFile);
        }
        setSaving(false);
        setMessage(uploadError instanceof Error ? uploadError.message : "Could not read or upload the selected file.");
        return;
      }
    }

    setSaving(false);
    resetFileForm();
    setMessage(wasEditing ? "File updated." : filePublishMode === "upload" ? "File uploaded." : "File published.");
    await refresh();
  }

  async function chooseFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "*/*"
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setSelectedFile(asset);
    if (!fileTitle.trim()) {
      setFileTitle(asset.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function resetFileForm() {
    setEditingFile(null);
    setFileTitle("");
    setFileTopic("");
    setFileCoverage("week");
    setFileWeek(currentReviewWeek);
    setFileUrl("");
    setFileDescription("");
    setFileType("source_sheet");
    setFilePublishMode("upload");
    setSelectedFile(null);
  }

  function startEditFile(file: LearningFile) {
    setEditingFile(file);
    setFileTitle(file.title);
    setFileTopic(file.topic);
    setFileCoverage(file.coverage);
    setFileWeek(file.week ?? currentReviewWeek);
    setFileUrl(file.url ?? "");
    setFileDescription(file.description ?? "");
    setFileType(file.fileType === "link" ? "source_sheet" : file.fileType);
    setFilePublishMode(file.storagePath ? "upload" : "link");
    setVisibility(file.visibility);
    setSelectedFile(null);
    setMessage("Editing file.");
  }

  async function restoreFileRecord(file: LearningFile) {
    await supabase
      .from("learning_files")
      .update({
        chaburah_id: file.chaburahId ?? null,
        title: file.title,
        description: file.description ?? null,
        topic: file.topic,
        coverage: file.coverage,
        week: file.week,
        file_type: file.fileType,
        visibility: file.visibility,
        external_url: file.url ?? null,
        storage_path: file.storagePath ?? null
      })
      .eq("id", file.id);
  }

  function confirmDeleteFile(file: LearningFile) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`Delete "${file.title}"? This cannot be undone.`)) {
        void deleteFile(file);
      }
      return;
    }

    Alert.alert("Delete File", `Delete "${file.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteFile(file);
        }
      }
    ]);
  }

  async function deleteFile(file: LearningFile) {
    setSaving(true);
    setMessage("");
    if (file.storagePath) {
      const { error: storageError } = await supabase.storage.from("learning-files").remove([file.storagePath]);
      if (storageError) {
        setSaving(false);
        setMessage(storageError.message);
        return;
      }
    }

    const { error } = await supabase.from("learning_files").delete().eq("id", file.id);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (editingFile?.id === file.id) {
      resetFileForm();
    }
    setMessage("File deleted.");
    await refresh();
  }

  async function handleMembershipRequest(membershipId: string, approve: boolean) {
    setSaving(true);
    setMessage("");
    const result = await reviewMembershipRequest(membershipId, approve);
    setSaving(false);
    setMessage(result ?? "Membership request updated.");
  }

  async function assignLeader() {
    if (!managedChaburahId || !leaderEmail.trim().includes("@")) {
      setMessage("Choose a chaburah and enter a valid user email.");
      return;
    }
    setSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("assign_chaburah_leader", {
      target_chaburah_id: managedChaburahId,
      target_user_email: leaderEmail.trim(),
      target_member_role: leaderRole
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setLeaderEmail("");
    setMessage(`${leaderRole === "rabbi" ? "Rabbi" : "Local admin"} assigned.`);
    await refresh();
  }

  async function changeMembershipStatus(membershipId: string, status: ChaburahMembership["status"]) {
    setSaving(true);
    setMessage("");
    const result = await updateMembershipStatus(membershipId, status);
    setSaving(false);
    setMessage(result ?? "Membership updated.");
  }

  function statusTone(status: ChaburahMembership["status"]): "neutral" | "primary" | "accent" | "success" | "danger" {
    if (status === "active") return "success";
    if (status === "pending") return "accent";
    if (status === "suspended") return "danger";
    return "neutral";
  }

  function memberStatusLabel(status: MemberStatusFilter) {
    if (status === "all") return "All";
    if (status === "active") return "Active";
    if (status === "pending") return "Pending";
    if (status === "suspended") return "Suspended";
    return "Left";
  }

  function roleLabel(role: ChaburahMembership["memberRole"]) {
    if (role === "rabbi") return "Rabbi";
    if (role === "admin") return "Local Admin";
    return "Participant";
  }

  function formatDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unknown";
    return parsed.toLocaleDateString();
  }

  function buildStoragePath(scope: Visibility, chaburahId: string | undefined, fileName: string) {
    const owner = scope === "everyone" ? "everyone" : chaburahId ?? "unassigned";
    const safeFileName = sanitizeFileName(fileName);
    return `${scope}/${owner}/${Date.now()}-${safeFileName}`;
  }

  function sanitizeFileName(fileName: string) {
    return fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "learning-file";
  }

  function formatFileSize(size: number) {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} bytes`;
  }

  function defaultFileTopic(coverage: FileCoverage, week: number) {
    if (coverage === "week") return `Week ${week}`;
    return fileCoverageLabel(coverage);
  }

  return (
    <Screen title="Admin" eyebrow="Local chaburah tools" onRefresh={refresh} refreshing={loading}>
      {isGlobalAdmin ? (
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <SectionTitle>Managing Chaburah</SectionTitle>
              <Text style={styles.muted}>Choose which local chaburah these admin tools should control.</Text>
            </View>
            {chaburah ? <Pill label={chaburah.name} tone="primary" /> : null}
          </Row>
          <SearchField
            onChangeText={setChaburahSearch}
            placeholder="Search by chaburah, city, address, or rabbi..."
            value={chaburahSearch}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filteredAdminChaburos.map((item) => (
              <FilterChip
                key={item.id}
                label={`${item.name} - ${item.city}`}
                onPress={() => setAdminChaburahId(item.id)}
                selected={managedChaburahId === item.id}
              />
            ))}
          </View>
          {filteredAdminChaburos.length === 0 ? (
            <Text style={styles.muted}>No chaburos match that search.</Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>{chaburah ? chaburah.name : "No Chaburah Selected"}</SectionTitle>
            <Text style={styles.muted}>Manage the local details users see on Dashboard, Directory, and My Chaburah.</Text>
          </View>
          <Pill label={`${localFiles.length} files`} tone="accent" />
        </Row>
      </Card>

      <StatusBanner
        message={message}
        tone={
          message.includes("saved") ||
          message.includes("published") ||
          message.includes("approved") ||
          message.includes("rejected") ||
          message.includes("assigned") ||
          message.includes("reactivated") ||
          message.includes("suspended") ||
          message.includes("removed") ||
          message.includes("uploaded") ||
          message.includes("updated") ||
          message.includes("deleted") ||
          message.includes("Editing")
            ? "success"
            : "error"
        }
      />

      {isGlobalAdmin ? (
        <Card>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <SectionTitle>Assign Local Leadership</SectionTitle>
              <Text style={styles.muted}>Assign a rabbi or local admin to the selected chaburah by user email.</Text>
            </View>
            <Pill label={`${assignedLeaders.length} assigned`} tone="accent" />
          </Row>
          <FormInput
            keyboardType="email-address"
            onChangeText={setLeaderEmail}
            placeholder="leader@example.com"
            value={leaderEmail}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="Rabbi" onPress={() => setLeaderRole("rabbi")} selected={leaderRole === "rabbi"} />
            <FilterChip label="Local Admin" onPress={() => setLeaderRole("admin")} selected={leaderRole === "admin"} />
          </View>
          <Button disabled={saving || !managedChaburahId} label={saving ? "Saving..." : "Assign Leader"} onPress={assignLeader} />
          {assignedLeaders.length === 0 ? (
            <Text style={styles.muted}>No rabbi or local admin has been assigned here yet.</Text>
          ) : (
            assignedLeaders.map((membership) => (
              <Row key={membership.id}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={styles.body}>{membership.fullName ?? "Unnamed user"}</Text>
                  <MetaText>{membership.email ?? membership.userId}</MetaText>
                </View>
                <Pill label={membership.memberRole === "rabbi" ? "Rabbi" : "Local Admin"} tone="primary" />
              </Row>
            ))
          )}
        </Card>
      ) : null}

      <Card>
        <SectionTitle>Chaburah Settings</SectionTitle>
        {!managedChaburahId ? (
          <Text style={styles.muted}>Join or select a chaburah before editing local settings.</Text>
        ) : (
          <>
            <FormInput onChangeText={setAddress} placeholder="Address" value={address} />
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
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Join Requests</SectionTitle>
            <Text style={styles.muted}>Approve or reject pending requests for this chaburah.</Text>
          </View>
          <Pill
            label={`${pendingJoinRequests.length} pending`}
            tone={pendingJoinRequests.length ? "accent" : "success"}
          />
        </Row>
        {!managedChaburahId ? (
          <Text style={styles.muted}>Select a chaburah before reviewing join requests.</Text>
        ) : pendingJoinRequests.length === 0 ? (
          <Text style={styles.muted}>No pending join requests.</Text>
        ) : (
          pendingJoinRequests.map((membership) => (
            <Row key={membership.id}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.body}>{membership.fullName ?? "Unnamed user"}</Text>
                <MetaText>{membership.email ?? membership.userId}</MetaText>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button
                  disabled={saving}
                  label="Approve"
                  onPress={() => handleMembershipRequest(membership.id, true)}
                  variant="secondary"
                />
                <Button
                  disabled={saving}
                  label="Reject"
                  onPress={() => handleMembershipRequest(membership.id, false)}
                  variant="ghost"
                />
              </View>
            </Row>
          ))
        )}
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Members</SectionTitle>
            <Text style={styles.muted}>Search and manage the active roster for this chaburah.</Text>
          </View>
          <Pill label={`${activeMemberCount} active`} tone="success" />
        </Row>
        {!managedChaburahId ? (
          <Text style={styles.muted}>Select a chaburah before managing members.</Text>
        ) : (
          <>
            <SearchField
              onChangeText={setMemberSearch}
              placeholder="Search by name, email, role, or status..."
              value={memberSearch}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {memberStatusFilters.map((status) => (
                <FilterChip
                  key={status}
                  label={memberStatusLabel(status)}
                  onPress={() => setMemberStatusFilter(status)}
                  selected={memberStatusFilter === status}
                />
              ))}
            </View>
            {filteredMembers.length === 0 ? (
              <Text style={styles.muted}>No members match those filters.</Text>
            ) : (
              filteredMembers.map((membership) => {
                const canRemove = membership.memberRole === "participant" && membership.status !== "left";
                const canSuspend = membership.memberRole === "participant" && membership.status === "active";
                const canReactivate =
                  membership.memberRole === "participant" &&
                  (membership.status === "suspended" || membership.status === "left");
                return (
                  <Row key={membership.id}>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={styles.body}>{membership.fullName ?? "Unnamed user"}</Text>
                      <MetaText>{membership.email ?? membership.userId}</MetaText>
                      <MetaText>Joined {formatDate(membership.joinedAt)}</MetaText>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <Pill label={roleLabel(membership.memberRole)} tone="primary" />
                      <Pill label={memberStatusLabel(membership.status)} tone={statusTone(membership.status)} />
                      {canReactivate ? (
                        <Button
                          disabled={saving}
                          label="Reactivate"
                          onPress={() => changeMembershipStatus(membership.id, "active")}
                          variant="secondary"
                        />
                      ) : null}
                      {canSuspend ? (
                        <Button
                          disabled={saving}
                          label="Suspend"
                          onPress={() => changeMembershipStatus(membership.id, "suspended")}
                          variant="ghost"
                        />
                      ) : null}
                      {canRemove ? (
                        <Button
                          disabled={saving}
                          label="Remove"
                          onPress={() => changeMembershipStatus(membership.id, "left")}
                          variant="ghost"
                        />
                      ) : null}
                    </View>
                  </Row>
                );
              })
            )}
          </>
        )}
      </Card>

      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>{editingFile ? "Edit Learning File" : "Publish Learning File"}</SectionTitle>
            <Text style={styles.muted}>Publish weekly files, bechina review material, or resources for the entire zman.</Text>
          </View>
          {editingFile ? <Pill label="Editing" tone="accent" /> : null}
        </Row>
        {profile?.role === "global_admin" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <FilterChip label="Everyone" onPress={() => setVisibility("everyone")} selected={visibility === "everyone"} />
            <FilterChip label="Current Chaburah" onPress={() => setVisibility("chaburah")} selected={visibility === "chaburah"} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <FilterChip label="Upload File" onPress={() => setFilePublishMode("upload")} selected={filePublishMode === "upload"} />
          <FilterChip label="External Link" onPress={() => setFilePublishMode("link")} selected={filePublishMode === "link"} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {fileTypes.map((type) => (
            <FilterChip key={type} label={fileTypeLabel(type)} onPress={() => setFileType(type)} selected={fileType === type} />
          ))}
        </View>
        <FormInput onChangeText={setFileTitle} placeholder="Title" value={fileTitle} />
        <FormInput onChangeText={setFileTopic} placeholder="Topic (optional)" value={fileTopic} />
        <View style={{ gap: 8 }}>
          <MetaText>Coverage</MetaText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {fileCoverages.map((coverage) => (
              <FilterChip
                key={coverage}
                label={coverage === "week" ? "Week" : fileCoverageLabel(coverage)}
                onPress={() => setFileCoverage(coverage)}
                selected={fileCoverage === coverage}
              />
            ))}
          </View>
        </View>
        {fileCoverage === "week" ? (
          <View style={{ gap: 8 }}>
            <MetaText>Current week is Week {currentReviewWeek}</MetaText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {fileWeekSelections.map((week) => (
                <FilterChip
                  key={week}
                  label={`Week ${week}`}
                  onPress={() => setFileWeek(week)}
                  selected={fileWeek === week}
                />
              ))}
            </View>
          </View>
        ) : null}
        {filePublishMode === "upload" ? (
          <View style={{ gap: 8 }}>
            <Button
              disabled={saving}
              label={selectedFile ? "Change Selected File" : editingFile?.storagePath ? "Replace Uploaded File" : "Choose File"}
              onPress={chooseFile}
              variant="secondary"
            />
            {selectedFile ? (
              <MetaText>
                {selectedFile.name}
                {selectedFile.size ? ` - ${formatFileSize(selectedFile.size)}` : ""}
              </MetaText>
            ) : editingFile?.storagePath ? (
              <Text style={styles.muted}>Current uploaded file will stay unless you choose a replacement.</Text>
            ) : (
              <Text style={styles.muted}>Choose a PDF, document, audio file, or source sheet from this device.</Text>
            )}
          </View>
        ) : (
          <FormInput keyboardType="url" onChangeText={setFileUrl} placeholder="https://..." value={fileUrl} />
        )}
        <TextArea onChangeText={setFileDescription} placeholder="Description" value={fileDescription} />
        <Row>
          <Button
            disabled={saving}
            label={
              saving
                ? filePublishMode === "upload"
                  ? "Uploading..."
                  : "Saving..."
                : editingFile
                  ? "Save File Changes"
                  : "Publish File"
            }
            onPress={publishFile}
          />
          {editingFile ? <Button disabled={saving} label="Cancel Edit" onPress={resetFileForm} variant="ghost" /> : null}
        </Row>
      </Card>

      <Card>
        <SectionTitle>Manage Files</SectionTitle>
        {localFiles.map((file) => (
          <Row key={file.id}>
            <View style={{ flex: 1, minWidth: 190 }}>
              <Text style={styles.body}>{file.title}</Text>
              <MetaText>{fileCoverageDetailLabel(file.coverage, file.week)} - {file.topic}</MetaText>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <Pill label={visibilityLabel(file.visibility)} tone={file.visibility === "everyone" ? "primary" : "neutral"} />
              <Button disabled={saving} label="Edit" onPress={() => startEditFile(file)} variant="secondary" />
              <Button disabled={saving} label="Delete" onPress={() => confirmDeleteFile(file)} variant="ghost" />
            </View>
          </Row>
        ))}
        {localFiles.length === 0 ? <Text style={styles.muted}>No files have been published yet.</Text> : null}
      </Card>
    </Screen>
  );
}

function readDocumentAsBlob(uri: string) {
  return new Promise<Blob>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.onload = () => resolve(request.response);
    request.onerror = () => reject(new Error("Could not read the selected file from this device."));
    request.responseType = "blob";
    request.open("GET", uri, true);
    request.send(null);
  });
}

async function readDocumentForUpload(asset: DocumentPicker.DocumentPickerAsset) {
  if (Platform.OS === "web") {
    if (asset.file) return asset.file;
    return readDocumentAsBlob(asset.uri);
  }

  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64
  });
  return base64ToArrayBuffer(base64);
}

function base64ToArrayBuffer(base64: string) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = base64.replace(/=+$/, "");
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (const character of clean) {
    const value = chars.indexOf(character);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }

  return bytes.buffer;
}
