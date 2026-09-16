const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }});
  return exports;
}

function harness() {
  let listener, cleanup, state, profile;
  const requests = [];
  const auth = { currentUser: null };
  const { AuthProvider } = load('components/AuthProvider.tsx', {
    react: {
      createContext: () => ({ Provider: 'provider' }),
      useState: (initial) => { state = initial; return [state, (next) => { state = typeof next === 'function' ? next(state) : next; }]; },
      useEffect: (effect) => { cleanup = effect(); },
    },
    'react/jsx-runtime': { jsx: () => null },
    'firebase/auth': { onAuthStateChanged: (_, callback) => { listener = callback; return () => {}; } },
    '../services/firebase': { auth },
    '../services/googleAuth': { buildUserProfile: (user) => ({ ...user, displayName: 'fallback' }) },
    '../services/firebaseaction': { storeUserProfile: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) },
    '../src/store': { useUserStore: { getState: () => ({ setCurrentUser: (value) => { profile = value; } }) } },
  });
  AuthProvider({ children: null });
  return {
    emit: (user) => { auth.currentUser = user; listener(user); },
    state: () => state, profile: () => profile, requests, cleanup: () => cleanup(),
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
const user = (uid) => ({ uid, emailVerified: true, email: `${uid}@example.com` });

test('initialization waits for Firebase; verified session hydrates profile', async () => {
  const h = harness();
  assert.equal(h.state().isInitializing, true);
  h.emit(user('a'));
  assert.equal(h.state().isSignedIn, true);
  h.requests[0].resolve({ ...user('a'), displayName: 'Saved name' });
  await flush();
  assert.equal(h.profile().displayName, 'Saved name');
});
test('logout rejects a stale profile response', async () => {
  const h = harness();
  h.emit(user('a'));
  h.emit(null);
  h.requests[0].resolve(user('a'));
  await flush();
  assert.equal(h.profile(), null);
  assert.equal(h.state().isSignedIn, false);
});
test('unverified account does not hydrate a signed-in profile', () => {
  const h = harness();
  h.emit({ ...user('a'), emailVerified: false });
  assert.equal(h.state().isSignedIn, false);
  assert.equal(h.requests.length, 0);
});
test('profile failure preserves the Firebase session and fallback', async () => {
  const h = harness();
  h.emit(user('a'));
  h.requests[0].reject(new Error('offline'));
  await flush();
  assert.equal(h.state().isSignedIn, true);
  assert.equal(h.profile().displayName, 'fallback');
  assert.ok(h.state().profileError);
});
test('account switch and unmount ignore pending work', async () => {
  const h = harness();
  h.emit(user('a'));
  h.emit(user('b'));
  h.requests[0].resolve(user('a'));
  await flush();
  assert.equal(h.profile().uid, 'b');
  h.cleanup();
  h.requests[1].resolve({ ...user('b'), displayName: 'late' });
  await flush();
  assert.equal(h.profile().displayName, 'fallback');
});
test('SecureStore adapter persists and deletes Firebase keys', async () => {
  const storage = new Map();
  const { authPersistence } = load('services/authPersistence.native.ts', {
    'firebase/auth': { getReactNativePersistence: (adapter) => adapter },
    'expo-secure-store': {
      getItemAsync: async (key) => storage.get(key) ?? null,
      setItemAsync: async (key, value) => { assert.match(key, /^[a-zA-Z0-9._-]+$/); storage.set(key, value); },
      deleteItemAsync: async (key) => { storage.delete(key); },
    },
  });
  const key = 'firebase:authUser:api-key:[DEFAULT]';
  await authPersistence.setItem(key, 'session');
  assert.equal(await authPersistence.getItem(key), 'session');
  await authPersistence.removeItem(key);
  assert.equal(await authPersistence.getItem(key), null);
});
