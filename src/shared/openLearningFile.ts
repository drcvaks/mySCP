import { Alert, Linking } from "react-native";
import { supabase } from "../lib/supabase";
import { LearningFile } from "./types";

export async function openLearningFile(file: LearningFile) {
  let targetUrl = file.url;
  if (!targetUrl && file.storagePath) {
    const { data, error } = await supabase.storage
      .from("learning-files")
      .createSignedUrl(file.storagePath, 60);
    if (error) {
      Alert.alert("Cannot Open File", error.message);
      return;
    }
    targetUrl = data.signedUrl;
  }

  if (!targetUrl) {
    Alert.alert(
      file.title,
      "This file record does not have an uploaded object or external URL."
    );
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
