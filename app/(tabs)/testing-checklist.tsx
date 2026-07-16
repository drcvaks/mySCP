import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, MetaText, Pill, Row, Screen, SectionTitle, StatusBanner, styles } from "../../src/shared/components";
import { formatSupabaseError } from "../../src/lib/errors";
import { supabase } from "../../src/lib/supabase";
import { isAdmin, isGlobalAdmin, isRabbi } from "../../src/shared/permissions";
import { theme } from "../../src/shared/theme";
import { useAuthState } from "../../src/state/AuthState";

interface ChecklistTask {
  key: string;
  label: string;
  detail: string;
  group: "Core" | "Admin" | "Rabbi" | "Global Admin";
}

const coreTasks: ChecklistTask[] = [
  { key: "core_login", label: "Log in", detail: "Sign in with the beta tester account.", group: "Core" },
  { key: "core_dashboard", label: "View dashboard", detail: "Check the dashboard cards and buttons.", group: "Core" },
  { key: "core_open_files", label: "Open files", detail: "Open at least one uploaded file or external link.", group: "Core" },
  { key: "core_filter_files", label: "Filter files", detail: "Filter by week, type, and coverage/scope.", group: "Core" },
  { key: "core_discussion", label: "View chaburah discussion", detail: "Open the discussion board in My Chaburah.", group: "Core" },
  { key: "core_post_message", label: "Post message", detail: "Post a short discussion test message.", group: "Core" },
  { key: "core_announcements", label: "View announcements", detail: "Confirm announcements are readable.", group: "Core" },
  { key: "core_mobile_nav", label: "Try mobile navigation", detail: "Open the hamburger menu or bottom tabs on mobile.", group: "Core" },
  { key: "core_logout", label: "Log out", detail: "Confirm sign out works.", group: "Core" }
];

const adminTasks: ChecklistTask[] = [
  { key: "admin_upload", label: "Upload/publish a file", detail: "Publish a beta test file or external link.", group: "Admin" },
  { key: "admin_edit_file", label: "Edit a file", detail: "Edit metadata and confirm the form scrolls correctly.", group: "Admin" },
  { key: "admin_permissions", label: "Test permissions", detail: "Check participant visibility for chaburah-only and everyone files.", group: "Admin" },
  { key: "admin_join_requests", label: "Review join requests", detail: "Approve or reject a pending tester request if available.", group: "Admin" }
];

const rabbiTasks: ChecklistTask[] = [
  { key: "rabbi_stage_questions", label: "Stage review questions", detail: "Stage model or public questions for a selected week.", group: "Rabbi" },
  { key: "rabbi_publish_questions", label: "Publish staged questions", detail: "Publish after reviewing the staged set.", group: "Rabbi" },
  { key: "rabbi_ask_rav", label: "Check Ask Rav", detail: "Confirm new questions appear for rabbi response.", group: "Rabbi" },
  { key: "rabbi_communication", label: "Check communication", detail: "Review discussion and announcements from the rabbi perspective.", group: "Rabbi" }
];

const globalAdminTasks: ChecklistTask[] = [
  { key: "global_chaburah_search", label: "Search chaburos", detail: "Find a chaburah in Global Admin.", group: "Global Admin" },
  { key: "global_current_week", label: "Check current week", detail: "Confirm the current review week setting is correct.", group: "Global Admin" },
  { key: "global_feedback_review", label: "Review feedback", detail: "Reply to or mark beta feedback as reviewed.", group: "Global Admin" }
];

export default function TestingChecklistScreen() {
  const { profile } = useAuthState();
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState("");

  const tasks = useMemo(() => {
    if (!profile) return coreTasks;
    const roleTasks = [...coreTasks];
    if (isAdmin(profile) || isRabbi(profile) || isGlobalAdmin(profile)) roleTasks.push(...adminTasks);
    if (isRabbi(profile) || isGlobalAdmin(profile)) roleTasks.push(...rabbiTasks);
    if (isGlobalAdmin(profile)) roleTasks.push(...globalAdminTasks);
    return roleTasks;
  }, [profile]);

  const completedCount = tasks.filter((task) => completed[task.key]).length;

  useEffect(() => {
    void loadProgress();
  }, [profile?.id]);

  async function loadProgress() {
    if (!profile) return;
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("beta_checklist_progress")
      .select("task_key,completed")
      .eq("user_id", profile.id);
    setLoading(false);
    if (error) {
      setMessage(formatSupabaseError(error, "Unable to load checklist progress."));
      return;
    }
    setCompleted(Object.fromEntries((data ?? []).map((row) => [row.task_key, row.completed])));
  }

  async function toggleTask(task: ChecklistTask) {
    if (!profile) return;
    const nextCompleted = !completed[task.key];
    setSavingKey(task.key);
    setMessage("");
    setCompleted((current) => ({ ...current, [task.key]: nextCompleted }));
    const { error } = await supabase.from("beta_checklist_progress").upsert({
      user_id: profile.id,
      task_key: task.key,
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null
    });
    setSavingKey("");
    if (error) {
      setCompleted((current) => ({ ...current, [task.key]: !nextCompleted }));
      setMessage(formatSupabaseError(error, "Unable to save checklist progress."));
      return;
    }
    setMessage(nextCompleted ? "Checklist item completed." : "Checklist item reopened.");
  }

  const groupedTasks = groupTasks(tasks);

  return (
    <Screen title="Tester Checklist" eyebrow="Private beta" onRefresh={loadProgress} refreshing={loading}>
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>Beta Progress</SectionTitle>
            <Text style={styles.muted}>Check off what you tested. Progress is saved only for your account.</Text>
          </View>
          <Pill label={`${completedCount}/${tasks.length} done`} tone={completedCount === tasks.length ? "success" : "primary"} />
        </Row>
        {message ? (
          <StatusBanner message={message} tone={message.includes("Unable") ? "error" : "success"} />
        ) : null}
      </Card>

      {Object.entries(groupedTasks).map(([group, groupTasks]) => (
        <Card key={group}>
          <SectionTitle>{group}</SectionTitle>
          {groupTasks.map((task) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(completed[task.key]), disabled: savingKey === task.key }}
              disabled={savingKey === task.key}
              key={task.key}
              onPress={() => toggleTask(task)}
              style={({ pressed }) => [localStyles.taskRow, pressed && localStyles.pressedTask, savingKey === task.key && localStyles.disabledTask]}
            >
              <Ionicons
                name={completed[task.key] ? "checkbox" : "square-outline"}
                color={completed[task.key] ? theme.colors.success : theme.colors.muted}
                size={24}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{task.label}</Text>
                <MetaText>{task.detail}</MetaText>
              </View>
            </Pressable>
          ))}
        </Card>
      ))}

      <Card>
        <SectionTitle>After Testing</SectionTitle>
        <Text style={styles.muted}>Use Beta Feedback to report the device, browser, role, screen, and exact issue you found.</Text>
        <Button label="Refresh Checklist" onPress={loadProgress} variant="secondary" />
      </Card>
    </Screen>
  );
}

function groupTasks(tasks: ChecklistTask[]) {
  return tasks.reduce<Record<string, ChecklistTask[]>>((groups, task) => {
    groups[task.group] = groups[task.group] ?? [];
    groups[task.group].push(task);
    return groups;
  }, {});
}

const localStyles = StyleSheet.create({
  disabledTask: {
    opacity: 0.55
  },
  pressedTask: {
    opacity: 0.82
  },
  taskRow: {
    alignItems: "flex-start",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  }
});
