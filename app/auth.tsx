import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { Button, Card, Screen, SectionTitle, StatusBanner, styles } from "../src/shared/components";
import { theme } from "../src/shared/theme";
import { useAuthState } from "../src/state/AuthState";

export default function AuthScreen() {
  const {
    cancelPasswordRecovery,
    loading: authLoading,
    passwordRecovery,
    resetPassword,
    session,
    signIn,
    signUp,
    updatePassword
  } = useAuthState();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (session && !passwordRecovery) return <Redirect href="/dashboard" />;

  async function submit() {
    setSubmitting(true);
    setMessage("");
    const result =
      mode === "sign-in"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, `${firstName.trim()} ${lastName.trim()}`.trim(), city.trim());
    if (result) setMessage(result);
    setSubmitting(false);
  }

  async function sendPasswordReset() {
    if (!email.includes("@")) {
      setMessage("Enter your email address first.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const result = await resetPassword(email.trim(), Linking.createURL("/auth"));
    setMessage(result ?? "Password reset email sent. Check your inbox for the reset link.");
    setSubmitting(false);
  }

  async function saveNewPassword() {
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const result = await updatePassword(newPassword);
    setMessage(result ?? "Password updated. You can continue into mySCP.");
    setNewPassword("");
    setSubmitting(false);
  }

  const valid =
    email.includes("@") &&
    password.length >= 6 &&
    (mode === "sign-in" || (firstName.trim().length >= 1 && lastName.trim().length >= 1));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <Screen title="mySCP" eyebrow={mode === "sign-in" ? "Welcome back" : "Create account"}>
        <Card>
          {passwordRecovery ? (
            <>
              <SectionTitle>Reset Password</SectionTitle>
              <Text style={styles.muted}>Enter a new password for your account.</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                onChangeText={setNewPassword}
                placeholder="New password"
                placeholderTextColor={theme.colors.muted}
                secureTextEntry
                style={authStyles.input}
                value={newPassword}
              />
              <StatusBanner
                message={message}
                tone={message.startsWith("Password updated") ? "success" : "error"}
              />
              <Button
                disabled={newPassword.length < 6 || submitting || authLoading}
                label={submitting ? "Saving..." : "Save New Password"}
                onPress={saveNewPassword}
              />
              <Button
                disabled={submitting}
                label="Back to Sign In"
                onPress={() => {
                  setMessage("");
                  setNewPassword("");
                  void cancelPasswordRecovery();
                }}
                variant="ghost"
              />
            </>
          ) : (
            <>
          <SectionTitle>{mode === "sign-in" ? "Sign In" : "Join mySCP"}</SectionTitle>
          <Text style={styles.muted}>
            {mode === "sign-in"
              ? "Use the email and password from your Supabase account."
              : "Create an account to join a chaburah and access learning materials."}
          </Text>
          {mode === "sign-up" ? (
            <>
              <View style={authStyles.nameRow}>
                <TextInput
                  autoComplete="given-name"
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={theme.colors.muted}
                  style={[authStyles.input, authStyles.nameInput]}
                  value={firstName}
                />
                <TextInput
                  autoComplete="family-name"
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={theme.colors.muted}
                  style={[authStyles.input, authStyles.nameInput]}
                  value={lastName}
                />
              </View>
              <TextInput
                autoComplete="address-line2"
                onChangeText={setCity}
                placeholder="City (optional)"
                placeholderTextColor={theme.colors.muted}
                style={authStyles.input}
                value={city}
              />
            </>
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
          <StatusBanner
            message={message}
            tone={message.startsWith("Check your email") || message.startsWith("Password reset email sent") ? "info" : "error"}
          />
          <Button
            disabled={!valid || submitting || authLoading}
            label={submitting ? "Please wait..." : mode === "sign-in" ? "Sign In" : "Create Account"}
            onPress={submit}
          />
          {mode === "sign-in" ? (
            <Button
              disabled={submitting || authLoading}
              label="Forgot Password?"
              onPress={sendPasswordReset}
              variant="secondary"
            />
          ) : null}
          <Button
            label={mode === "sign-in" ? "Create an Account" : "Back to Sign In"}
            onPress={() => {
              setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
              setMessage("");
            }}
            variant="ghost"
          />
            </>
          )}
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
  },
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  nameInput: {
    flex: 1,
    minWidth: 140
  }
});
