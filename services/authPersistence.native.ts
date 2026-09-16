import * as SecureStore from "expo-secure-store";
// Firebase exposes this export through its React Native entry point.
// @ts-expect-error The default Firebase declaration resolves the web entry point.
import { getReactNativePersistence } from "firebase/auth";

// Firebase keys contain ':'; SecureStore only accepts alphanumeric, '.', '-' and '_'.
const storageKey = (key: string) =>
  Array.from(key, (character) =>
    character.charCodeAt(0).toString(16).padStart(4, "0"),
  ).join("");

export const authPersistence = getReactNativePersistence({
  getItem: (key: string) => SecureStore.getItemAsync(storageKey(key)),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(storageKey(key), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(storageKey(key)),
});
