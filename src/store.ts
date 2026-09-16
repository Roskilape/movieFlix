import { create } from "zustand";

interface UserStore {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));
