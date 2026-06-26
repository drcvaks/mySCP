import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "../src/state/AppState";
import { AuthStateProvider } from "../src/state/AuthState";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthStateProvider>
          <AppStateProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="dark" />
          </AppStateProvider>
        </AuthStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
