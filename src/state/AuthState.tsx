import { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Linking from "expo-linking";
import { formatSupabaseError } from "../lib/errors";
import { supabase } from "../lib/supabase";
import { UserProfile } from "../shared/types";

interface AuthStateValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string, city: string) => Promise<string | null>;
  resetPassword: (email: string, redirectTo?: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  cancelPasswordRecovery: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthStateContext = createContext<AuthStateValue | null>(null);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  async function loadProfile(userId: string) {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,phone,city,state,country,role,current_chaburah_id")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    setProfile({
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone ?? undefined,
      country: data.country,
      city: data.city ?? "",
      role: data.role,
      chaburahId: data.current_chaburah_id ?? undefined
    });
  }

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  async function refreshProfile() {
    if (!session?.user.id) return;
    try {
      await loadProfile(session.user.id);
      setError(null);
    } catch (profileError) {
      setError(formatSupabaseError(profileError, "Unable to load profile."));
    }
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data, error: sessionError }) => {
        if (sessionError) {
          setError(formatSupabaseError(sessionError));
        }
        setSession(data.session);
        if (data.session) {
          try {
            await loadProfile(data.session.user.id);
          } catch (profileError) {
            setError(formatSupabaseError(profileError, "Unable to load profile."));
          }
        }
      })
      .catch((sessionError) => {
        setError(formatSupabaseError(sessionError));
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      if (profileRef.current?.id !== nextSession.user.id) {
        setLoading(true);
      }
      setTimeout(() => {
        loadProfile(nextSession.user.id)
          .catch((profileError) => {
            setError(formatSupabaseError(profileError, "Unable to load profile."));
          })
          .finally(() => setLoading(false));
      }, 0);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function handleAuthUrl(url: string | null) {
      if (!url) return;
      const params = getUrlParams(url);
      const isRecovery = params.type === "recovery" || url.includes("type=recovery");
      try {
        if (params.code) {
          await supabase.auth.exchangeCodeForSession(params.code);
        } else if (params.access_token && params.refresh_token) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token
          });
        }
        if (isRecovery) {
          setPasswordRecovery(true);
        }
      } catch (authUrlError) {
        setError(formatSupabaseError(authUrlError, "Unable to open auth link."));
      }
    }

    Linking.getInitialURL().then(handleAuthUrl).catch((authUrlError) => {
      setError(formatSupabaseError(authUrlError, "Unable to open auth link."));
    });
    const subscription = Linking.addEventListener("url", (event) => {
      void handleAuthUrl(event.url);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<AuthStateValue>(
    () => ({
      session,
      profile,
      loading,
      error,
      passwordRecovery,
      signIn: async (email, password) => {
        setError(null);
        setPasswordRecovery(false);
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          return signInError ? formatSupabaseError(signInError) : null;
        } catch (signInError) {
          return formatSupabaseError(signInError);
        }
      },
      signUp: async (email, password, fullName, city) => {
        setError(null);
        setPasswordRecovery(false);
        try {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, city } }
          });
          if (signUpError) return formatSupabaseError(signUpError);
          if (!data.session) return "Check your email to confirm the account, then sign in.";
          return null;
        } catch (signUpError) {
          return formatSupabaseError(signUpError);
        }
      },
      resetPassword: async (email, redirectTo) => {
        setError(null);
        try {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo
          });
          return resetError ? formatSupabaseError(resetError) : null;
        } catch (resetError) {
          return formatSupabaseError(resetError);
        }
      },
      updatePassword: async (password) => {
        setError(null);
        try {
          const { error: updateError } = await supabase.auth.updateUser({ password });
          if (updateError) return formatSupabaseError(updateError);
          setPasswordRecovery(false);
          return null;
        } catch (updateError) {
          return formatSupabaseError(updateError);
        }
      },
      cancelPasswordRecovery: async () => {
        setPasswordRecovery(false);
        await supabase.auth.signOut();
      },
      signOut: async () => {
        setPasswordRecovery(false);
        await supabase.auth.signOut();
      },
      refreshProfile
    }),
    [error, loading, passwordRecovery, profile, session]
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}

function getUrlParams(url: string) {
  const params: Record<string, string> = {};
  const [, query = ""] = url.split("?");
  const [queryWithoutHash = "", hash = ""] = query.split("#");
  const directHash = url.includes("#") ? url.split("#").slice(1).join("#") : "";
  [queryWithoutHash, hash, directHash].forEach((part) => {
    part.split("&").forEach((pair) => {
      const [rawKey, rawValue] = pair.split("=");
      if (!rawKey || rawValue === undefined) return;
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    });
  });
  return params;
}

export function useAuthState() {
  const value = useContext(AuthStateContext);
  if (!value) throw new Error("useAuthState must be used inside AuthStateProvider");
  return value;
}
