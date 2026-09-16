import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth } from "../services/firebase";
import { storeUserProfile } from "../services/firebaseaction";
import { buildUserProfile } from "../services/googleAuth";
import { useUserStore } from "../src/store";

type AuthState = {
  user: User | null;
  isInitializing: boolean;
  isSignedIn: boolean;
  profileError: string | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isInitializing: true,
    isSignedIn: false,
    profileError: null,
  });

  useEffect(() => {
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const request = ++generation;
      // Account creation signs in automatically. An unverified session is not
      // eligible for the app's signed-in UI, but remains available for verification.
      const isSignedIn = !!user && user.emailVerified;
      useUserStore.getState().setCurrentUser(null);
      setState({ user, isSignedIn, isInitializing: false, profileError: null });
      if (!user || !isSignedIn) return;

      const fallback = buildUserProfile(user);
      useUserStore.getState().setCurrentUser(fallback);
      void storeUserProfile(fallback)
        .then((profile) => {
          // A previous user's slow database request must never overwrite a new session.
          if (request !== generation || auth.currentUser?.uid !== user.uid)
            return;
          useUserStore.getState().setCurrentUser({
            ...profile,
            uid: user.uid,
            email: user.email ?? "",
            emailVerified: user.emailVerified,
          });
        })
        .catch(() => {
          if (request !== generation) return;
          setState((current) => ({
            ...current,
            profileError:
              "Your saved profile could not be loaded. Showing your account details.",
          }));
        });
    });
    return () => {
      generation++;
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
