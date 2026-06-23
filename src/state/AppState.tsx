import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { currentUser } from "../data/mockData";
import { AskRavQuestion, ReviewSession } from "../shared/types";

const STORAGE_KEY = "myscp-checkpoint-2";

interface PersistedState {
  selectedChaburahId?: string;
  reviewSessions: ReviewSession[];
  askRavQuestions: AskRavQuestion[];
}

interface AppStateValue extends PersistedState {
  hydrated: boolean;
  joinChaburah: (chaburahId: string) => void;
  saveReviewSession: (session: Omit<ReviewSession, "id" | "completedAt">) => void;
  submitAskRavQuestion: (question: string) => void;
}

const initialState: PersistedState = {
  selectedChaburahId: currentUser.chaburahId,
  reviewSessions: [],
  askRavQuestions: []
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!active || !saved) return;
        const parsed = JSON.parse(saved) as Partial<PersistedState>;
        setState({
          selectedChaburahId: parsed.selectedChaburahId ?? initialState.selectedChaburahId,
          reviewSessions: parsed.reviewSessions ?? [],
          askRavQuestions: parsed.askRavQuestions ?? []
        });
      })
      .catch(() => {
        // The app remains usable with the initial local state if storage is unavailable.
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // Persistence failures should not block the current session.
    });
  }, [hydrated, state]);

  const value = useMemo<AppStateValue>(
    () => ({
      ...state,
      hydrated,
      joinChaburah: (chaburahId) => {
        setState((current) => ({ ...current, selectedChaburahId: chaburahId }));
      },
      saveReviewSession: (session) => {
        const completed: ReviewSession = {
          ...session,
          id: `review-${Date.now()}`,
          completedAt: new Date().toISOString()
        };
        setState((current) => ({
          ...current,
          reviewSessions: [completed, ...current.reviewSessions].slice(0, 25)
        }));
      },
      submitAskRavQuestion: (question) => {
        if (!state.selectedChaburahId) return;
        const submitted: AskRavQuestion = {
          id: `question-${Date.now()}`,
          chaburahId: state.selectedChaburahId,
          askerId: currentUser.id,
          question,
          status: "submitted",
          submittedAt: new Date().toISOString()
        };
        setState((current) => ({
          ...current,
          askRavQuestions: [submitted, ...current.askRavQuestions]
        }));
      }
    }),
    [hydrated, state]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return value;
}
