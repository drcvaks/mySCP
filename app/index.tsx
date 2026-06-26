import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthState } from "../src/state/AuthState";
import { theme } from "../src/shared/theme";

export default function Index() {
  const { loading, session } = useAuthState();
  if (loading) {
    return (
      <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }
  return <Redirect href={session ? "/dashboard" : "/auth"} />;
}
