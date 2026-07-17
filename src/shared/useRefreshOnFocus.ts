import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

const defaultStaleMs = 45_000;

export function useRefreshOnFocus(refresh: () => Promise<void>, staleMs = defaultStaleMs) {
  const lastFocusedRefreshAt = useRef(0);
  const refreshingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (refreshingRef.current || now - lastFocusedRefreshAt.current < staleMs) return;

      refreshingRef.current = true;
      lastFocusedRefreshAt.current = now;
      refresh().finally(() => {
        refreshingRef.current = false;
      });
    }, [refresh, staleMs])
  );
}
