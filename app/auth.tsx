import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { Button, Card, Screen, SectionTitle, StatusBanner, styles } from "../src/shared/components";
import { theme } from "../src/shared/theme";
import { useAuthState } from "../src/state/AuthState";

export default function AuthScreen() {
  const { loading: authLoading, session, signIn, signUp } = useAuthState();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (session) return <Redirect href="/dashboard" />;

  async function submit() {
    setSubmitting(true);
    setMessage("");
    const result =
      mode === "sign-in"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, fullName.trim());
    if (result) setMessage(result);
    setSubmitting(false);
  }

  const valid =
    email.includes("@") &&
    password.length >= 6 &&
    (mode === "sign-in" || fullName.trim().length >= 2);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Screen title="mySCP" eyebrow={mode === "sign-in" ? "Welcome back" : "Create account"}>
        <Card>
          <SectionTitle>{mode === "sign-in" ? "Sign In" : "Join mySCP"}</SectionTitle>
          <Text style={styles.muted}>
            {mode === "sign-in"
              ? "Use the email and password from your Supabase account."
              : "Create an account to join a chaburah and access learning materials."}
          </Text>
          {mode === "sign-up" ? (
            <TextInput
              onChangeText={setFullName}
              placeholder="Full name"
              placeholderTextColor={theme.colors.muted}
              style={authStyles.input}
              value={fullName}
            />
          ) : null}
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.colors.muted}
            style={authStyles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
            style={authStyles.input}
            value={password}
          />
          <StatusBanner message={message} tone={message.startsWith("Check your email") ? "info" : "error"} />
          <Button
            disabled={!valid || submitting || authLoading}
            label={submitting ? "Please wait..." : mode === "sign-in" ? "Sign In" : "Create Account"}
            onPress={submit}
          />
          <Button
            label={mode === "sign-in" ? "Create an Account" : "Back to Sign In"}
            onPress={() => {
              setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
              setMessage("");
            }}
            variant="ghost"
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const authStyles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: theme.spacing.md
  }
});
