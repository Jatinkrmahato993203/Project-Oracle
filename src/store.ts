import { create } from "zustand";
import { auth } from "./lib/firebase.ts";

interface OracleState {
  user: any;
  token: string | null;
  commitments: any[];
  isLoading: boolean;
  setUser: (user: any, token: string | null) => void;
  fetchCommitments: () => Promise<void>;
  addCommitment: (data: any) => Promise<void>;
}

export const useStore = create<OracleState>((set, get) => ({
  user: null,
  token: null,
  commitments: [],
  isLoading: false,

  setUser: (user, token) => set({ user, token }),

  fetchCommitments: async () => {
    const { token } = get();
    if (!token) return;
    set({ isLoading: true });
    try {
      const res = await fetch("/api/commitments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ commitments: data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  addCommitment: async (data: any) => {
    const { token, commitments } = get();
    if (!token) return;
    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newC = await res.json();
        set({
          commitments: [...commitments, newC].sort(
            (a, b) => b.riskScore - a.riskScore,
          ),
        });
      }
    } catch (e) {
      console.error(e);
    }
  },
}));
