export function formatSupabaseError(error: unknown, fallback = "Unable to reach Supabase.") {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("fetch failed")) {
      return "Unable to reach Supabase. Check the project URL in .env, confirm this device has internet access, then restart Expo.";
    }
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = String((error as { message?: unknown }).message);
    if (message.toLowerCase().includes("fetch failed")) {
      return "Unable to reach Supabase. Check the project URL in .env, confirm this device has internet access, then restart Expo.";
    }
    return message;
  }

  return fallback;
}
