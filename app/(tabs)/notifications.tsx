import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, MetaText, Pill, Row, Screen, SectionTitle, styles } from "../../src/shared/components";
import { NotificationItem } from "../../src/shared/types";
import { useAppState } from "../../src/state/AppState";

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    loading,
    markAllNotificationsRead,
    markNotificationRead,
    notificationUnreadCount,
    notifications,
    refresh
  } = useAppState();

  async function openNotification(notification: NotificationItem) {
    if (!notification.readAt) await markNotificationRead(notification.id);
    if (notification.actionRoute) {
      router.push({
        pathname: notification.actionRoute as never,
        params: notification.actionParams
      });
    }
  }

  return (
    <Screen title="Notifications" eyebrow="Updates" onRefresh={refresh} refreshing={loading}>
      <Card>
        <Row>
          <View style={{ flex: 1, minWidth: 220 }}>
            <SectionTitle>In-App Notifications</SectionTitle>
            <Text style={styles.muted}>Review app updates and mark them read.</Text>
          </View>
          <Pill label={`${notificationUnreadCount} unread`} tone={notificationUnreadCount ? "accent" : "success"} />
        </Row>
        {notificationUnreadCount > 0 ? (
          <Button label="Mark All Read" onPress={markAllNotificationsRead} />
        ) : null}
      </Card>

      {notifications.length === 0 ? (
        <Card>
          <SectionTitle>No Notifications</SectionTitle>
          <Text style={styles.muted}>You do not have any in-app notifications yet.</Text>
        </Card>
      ) : null}

      {notifications.map((notification) => (
        <Card key={notification.id}>
          <Row>
            <View style={{ flex: 1, minWidth: 220 }}>
              <MetaText>{formatNotificationDate(notification.createdAt)}</MetaText>
              <SectionTitle>{notification.title}</SectionTitle>
              <Text style={styles.muted}>{notification.body}</Text>
            </View>
            <Pill label={notification.readAt ? "Read" : "Unread"} tone={notification.readAt ? "neutral" : "accent"} />
          </Row>
          <Row>
            <MetaText>{notificationTypeLabel(notification.type)}</MetaText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {!notification.readAt ? (
                <Button label="Mark Read" onPress={() => markNotificationRead(notification.id)} variant="secondary" />
              ) : null}
              {notification.actionRoute ? (
                <Button label="Open" onPress={() => openNotification(notification)} />
              ) : null}
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

function formatNotificationDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function notificationTypeLabel(type: NotificationItem["type"]) {
  const labels: Record<NotificationItem["type"], string> = {
    review_questions: "Review Questions",
    discussion_posts: "Discussion",
    rabbi_answers: "Rabbi Answers",
    ask_rav_questions: "Ask Rav Questions",
    uploads: "Uploads",
    join_requests: "Join Requests",
    system: "System"
  };
  return labels[type];
}
