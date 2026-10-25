import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { MaterialLanguage, materialLanguageName } from "./materialLanguages";

export function useMaterialLanguagePreference(userId?: string) {
  const [language, setLanguage] = useState<MaterialLanguage>("en");
  const [defaultLanguage, setDefaultLanguage] = useState<MaterialLanguage | null>(null);
  const [loadedUser, setLoadedUser] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const ready = Boolean(userId && loadedUser === userId);

  useEffect(() => {
    let cancelled = false;
    setLoadedUser(undefined);
    setLanguage("en");
    setDefaultLanguage(null);
    setSaving(false);
    setMessage("");
    if (!userId) return;

    async function load() {
      try {
        const { data, error } = await supabase.from("material_language_preferences")
          .select("language").eq("user_id", userId!).maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const value = data?.language === "he" ? "he" : "en";
        setDefaultLanguage(value);
        setLanguage(value);
      } catch {
        if (!cancelled) setMessage("Unable to load your language default. You can still choose a language for this visit.");
      } finally {
        if (!cancelled) setLoadedUser(userId);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  async function makeDefault() {
    if (!userId || !ready || saving || language === defaultLanguage) return;
    const owner = userId;
    const selected = language;
    setSaving(true);
    setMessage("");
    try {
      const { error } = await supabase.from("material_language_preferences")
        .upsert({ user_id: owner, language: selected }, { onConflict: "user_id" });
      if (error) throw error;
      if (currentUser.current === owner) {
        setDefaultLanguage(selected);
        setMessage(`${materialLanguageName(selected)} is now your default for Shiur Builder.`);
      }
    } catch {
      if (currentUser.current === owner) setMessage("Unable to save your language default. Please try again. Your packet has not changed.");
    } finally {
      if (currentUser.current === owner) setSaving(false);
    }
  }

  return { language, setLanguage, defaultLanguage, ready, saving, message, makeDefault };
}
