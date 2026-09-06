import { Alert, Linking, Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { LearningFile } from "./types";

export async function openLearningFile(file: LearningFile) {
  const webWindow =
    Platform.OS === "web" && (file.url || file.storagePath) && typeof window !== "undefined"
      ? window.open("about:blank", "_blank")
      : null;
  if (webWindow) {
    webWindow.document.write("<p style=\"font-family: sans-serif; padding: 24px;\">Opening file...</p>");
  }

  let targetUrl = file.url;
  if (!targetUrl && file.storagePath) {
    const { data, error } = await supabase.storage
      .from("learning-files")
      .createSignedUrl(file.storagePath, 60);
    if (error) {
      webWindow?.close();
      Alert.alert("Cannot Open File", error.message);
      return;
    }
    targetUrl = data.signedUrl;
  }

  if (!targetUrl) {
    webWindow?.close();
    Alert.alert(
      file.title,
      "This file record does not have an uploaded object or external URL."
    );
    return;
  }

  if (webWindow) {
    webWindow.location.replace(targetUrl);
    return;
  }

  try {
    await Linking.openURL(targetUrl);
  } catch (openError) {
    Alert.alert(
      "Cannot Open File",
      openError instanceof Error ? openError.message : "This device could not open the file URL."
    );
  }
}
