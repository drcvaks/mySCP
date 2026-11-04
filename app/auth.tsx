import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputProps, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Redirect, useLocalSearchParams } from "expo-router";
import { MY_SCP_HERO_LOGO_URI } from "../src/data/myScpBrandLogos";
import { Button, Card, SectionTitle, SegmentedTabs, StatusBanner, styles } from "../src/shared/components";
import { theme } from "../src/shared/theme";
import { useAuthState } from "../src/state/AuthState";

export default function AuthScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 880;
  const { bmThread } = useLocalSearchParams<{ bmThread?: string }>();
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

  if (session && !passwordRecovery) {
    return (
      <Redirect
        href={
          typeof bmThread === "string" && /^[0-9a-f-]{36}$/i.test(bmThread)
            ? { pathname: "/(tabs)/beis-midrash", params: { thread: bmThread } }
            : "/dashboard"
        }
      />
    );
  }

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
    setMessage(
      result ??
        "Password reset email sent. The email may show Supabase, mySCP's sign-in provider, as the sender. Check your inbox and spam/junk folder for the reset link."
    );
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
    <SafeAreaView style={authStyles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={authStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[authStyles.shell, wide ? authStyles.shellWide : authStyles.shellCompact]}>
            {/* Brand Showcase Column */}
            <View style={[authStyles.brandHero, wide ? authStyles.brandHeroWide : authStyles.brandHeroCompact]}>
              <View style={authStyles.logoFrame}>
                <Image
                  accessibilityLabel="mySCP Semichas Chaver Program logo"
                  resizeMode="contain"
                  source={{ uri: MY_SCP_HERO_LOGO_URI }}
                  style={wide ? authStyles.heroLogoWide : authStyles.heroLogoCompact}
                />
              </View>
              <View style={authStyles.brandCopyBlock}>
                <View style={authStyles.goldTag}>
                  <Ionicons color={theme.colors.accent} name="flame" size={13} />
                  <Text style={authStyles.goldTagTxt}>SEMICHAS CHAVER PROGRAM</Text>
                </View>
                <Text style={[authStyles.heroHeadline, !wide && authStyles.heroHeadlineCompact]}>
                  Structured Halacha Learning for Every Chaburah
                </Text>
                <Text style={authStyles.heroLead}>
                  {mode === "sign-in"
                    ? "Sign in with your mySCP email and password."
                    : "Create an account to join a chaburah and access learning materials."}
                </Text>
              </View>

              {wide ? (
                <View style={authStyles.featureList}>
                  <View style={authStyles.featureItem}>
                    <View style={authStyles.featureIcon}>
                      <Ionicons color={theme.colors.accent} name="book-outline" size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={authStyles.featureTitle}>Weekly Shiurim & Source Packets</Text>
                      <Text style={authStyles.featureDesc}>
                        Follow your Chaburah’s active Zman, source sheets, review notes, and audio recordings.
                      </Text>
                    </View>
                  </View>
                  <View style={authStyles.featureItem}>
                    <View style={authStyles.featureIcon}>
                      <Ionicons color={theme.colors.accent} name="checkmark-done-circle-outline" size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={authStyles.featureTitle}>Quick Review & Self-Testing</Text>
                      <Text style={authStyles.featureDesc}>
                        Reinforce each week’s halachos with interactive review quizzes and explanations.
                      </Text>
                    </View>
                  </View>
                  <View style={authStyles.featureItem}>
                    <View style={authStyles.featureIcon}>
                      <Ionicons color={theme.colors.accent} name="flame-outline" size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={authStyles.featureTitle}>Rabbinic Hub & Beis Medrash</Text>
                      <Text style={authStyles.featureDesc}>
                        Dedicated Shiur Builder, Ask the Rav inbox, and collaborative Beis Medrash for SCP Rabbonim.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Form Column */}
            <View style={[authStyles.formColumn, wide && authStyles.formColumnWide]}>
              <Card>
                {passwordRecovery ? (
                  <>
                    <SectionTitle>Reset Password</SectionTitle>
                    <Text style={styles.muted}>Enter a new password for your account.</Text>
                    <AuthInput
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
                    <SegmentedTabs
                      items={[
                        { key: "sign-in", label: "Sign In" },
                        { key: "sign-up", label: "Join mySCP" }
                      ]}
                      value={mode}
                      onChange={(next) => {
                        setMode(next);
                        setMessage("");
                      }}
                    />

                    <SectionTitle>{mode === "sign-in" ? "Sign In" : "Join mySCP"}</SectionTitle>
                    <Text style={styles.muted}>
                      {mode === "sign-in"
                        ? "Sign in with your mySCP email and password."
                        : "Create an account to join a chaburah and access learning materials."}
                    </Text>

                    {mode === "sign-up" ? (
                      <>
                        <View style={authStyles.nameRow}>
                          <AuthInput
                            autoComplete="given-name"
                            onChangeText={setFirstName}
                            placeholder="First name"
                            placeholderTextColor={theme.colors.muted}
                            style={[authStyles.input, authStyles.nameInput]}
                            value={firstName}
                          />
                          <AuthInput
                            autoComplete="family-name"
                            onChangeText={setLastName}
                            placeholder="Last name"
                            placeholderTextColor={theme.colors.muted}
                            style={[authStyles.input, authStyles.nameInput]}
                            value={lastName}
                          />
                        </View>
                        <AuthInput
                          autoComplete="address-line2"
                          onChangeText={setCity}
                          placeholder="City (optional)"
                          placeholderTextColor={theme.colors.muted}
                          style={authStyles.input}
                          value={city}
                        />
                      </>
                    ) : null}

                    <AuthInput
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="Email"
                      placeholderTextColor={theme.colors.muted}
                      style={authStyles.input}
                      value={email}
                    />
                    <AuthInput
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
                      tone={
                        message.startsWith("Check your email") || message.startsWith("Password reset email sent")
                          ? "info"
                          : "error"
                      }
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
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthInput(props: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      accessibilityLabel={props.placeholder}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      style={[props.style, focused && authStyles.inputFocused]}
    />
  );
}

const authStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20
  },
  shell: {
    width: "100%",
    maxWidth: 1020,
    alignSelf: "center",
    gap: 20
  },
  shellWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 24
  },
  shellCompact: {
    maxWidth: 460,
    gap: 16
  },
  brandHero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    padding: 24,
    gap: 16,
    ...theme.shadows.raised
  },
  brandHeroWide: {
    flex: 1.05,
    justifyContent: "space-between",
    padding: 28
  },
  brandHeroCompact: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 12
  },
  logoFrame: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.xl,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    ...theme.shadows.card
  },
  heroLogoWide: {
    width: 148,
    height: 160
  },
  heroLogoCompact: {
    width: 90,
    height: 98
  },
  brandCopyBlock: {
    gap: 6,
    alignItems: "center"
  },
  goldTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(246, 186, 54, 0.16)",
    borderColor: "rgba(246, 186, 54, 0.45)",
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  goldTagTxt: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: theme.colors.accent
  },
  heroHeadline: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center"
  },
  heroHeadlineCompact: {
    fontSize: 18,
    lineHeight: 23
  },
  heroLead: {
    fontSize: 13,
    lineHeight: 19,
    color: "#C5D2EC",
    textAlign: "center"
  },
  featureList: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.14)"
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(246, 186, 54, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(246, 186, 54, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: "#C5D2EC"
  },
  formColumn: {
    gap: 14,
    justifyContent: "center"
  },
  formColumnWide: {
    flex: 1
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    color: theme.colors.ink,
    fontSize: 16,
    minHeight: 48,
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
