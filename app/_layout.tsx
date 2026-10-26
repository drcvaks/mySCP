import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider } from "../src/state/AppState";
import { AuthStateProvider } from "../src/state/AuthState";
import { PwaProvider } from "../src/shared/PwaInstall";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthStateProvider>
          <AppStateProvider>
            <PwaProvider><Stack screenOptions={{ headerShown: false }} /></PwaProvider>
            <StatusBar style="dark" />
          </AppStateProvider>
        </AuthStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
