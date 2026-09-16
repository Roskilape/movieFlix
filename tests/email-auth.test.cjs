const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }});
  return exports;
}
function harness(overrides = {}) {
  const user = { uid: 'a', email: 'a@example.com', emailVerified: false };
  const auth = { currentUser: user };
  const calls = [];
  const errors = load('services/authErrors.ts');
  const api = load('services/EmailandPasswordAuth.ts', {
    './authErrors': errors,
    './firebase': { auth },
    './googleAuth': { buildUserProfile: (value) => value },
    'firebase/auth': {
      createUserWithEmailAndPassword: async () => { calls.push('create'); return { user }; },
      signInWithEmailAndPassword: async () => { calls.push('signIn'); return { user }; },
      sendEmailVerification: async () => { calls.push('send'); },
      sendPasswordResetEmail: async (_, email) => { calls.push(['reset', email]); },
      reload: async () => {},
      signOut: async () => { calls.push('signOut'); auth.currentUser = null; },
      ...overrides,
    },
  });
  return { api, errors, auth, user, calls };
}
test('duplicate sign-up never signs in or sends verification', async () => {
  const duplicate = { code: 'auth/email-already-in-use' };
  const h = harness({ createUserWithEmailAndPassword: async () => { throw duplicate; } });
  await assert.rejects(h.api.signUpWithEmailAndPasswordAuth('a@example.com', 'password'), (e) => e === duplicate);
  assert.deepEqual(h.calls, []);
  assert.equal(h.errors.getAuthErrorMessage(duplicate, 'SignUp'), 'This email is already registered. Please sign in.');
});
test('new sign-up creates an account and sends verification', async () => {
  const h = harness();
  await h.api.signUpWithEmailAndPasswordAuth('a@example.com', 'password');
  assert.deepEqual(h.calls, ['create', 'send']);
});
test('unverified sign-in requires explicit resend', async () => {
  const h = harness();
  await assert.rejects(h.api.signInWithEmailAndPasswordAuth('a@example.com', 'password'), (e) => e instanceof h.errors.EmailVerificationRequiredError && e.uid === 'a');
  assert.deepEqual(h.calls, ['signIn']);
  await h.api.resendVerificationEmail('a');
  assert.deepEqual(h.calls, ['signIn', 'send']);
});
test('resend rejects a different session without sending', async () => {
  const h = harness();
  await assert.rejects(h.api.resendVerificationEmail('other'));
  assert.deepEqual(h.calls, []);
});
test('already verified resend signs out and directs user to sign in', async () => {
  const h = harness();
  h.user.emailVerified = true;
  await assert.rejects(h.api.resendVerificationEmail('a'), /already verified/);
  assert.deepEqual(h.calls, ['signOut']);
});
test('resend failures use friendly messages', async () => {
  const h = harness({ sendEmailVerification: async () => { throw { code: 'auth/too-many-requests' }; } });
  await assert.rejects(h.api.resendVerificationEmail('a'), (e) => h.errors.getAuthErrorMessage(e, 'Resend').startsWith('Too many attempts.'));
  assert.equal(h.errors.getAuthErrorMessage(new Error('Firebase internal details'), 'Resend'), 'Unable to resend the verification email. Please try again.');
});

test('password reset trims email and works while signed out', async () => {
  const h = harness();
  h.auth.currentUser = null;
  await h.api.forgotPasswordAuth('  a@example.com  ');
  assert.deepEqual(h.calls, [['reset', 'a@example.com']]);
  assert.equal(h.auth.currentUser, null);
});

test('password reset rejects blank email before contacting Firebase', async () => {
  const h = harness();
  await assert.rejects(h.api.forgotPasswordAuth('   '), /Email is required/);
  assert.deepEqual(h.calls, []);
});

test('unknown account reset has the same result as a successful request', async () => {
  const h = harness({ sendPasswordResetEmail: async () => { throw { code: 'auth/user-not-found' }; } });
  assert.equal(await h.api.forgotPasswordAuth('missing@example.com'), undefined);
  assert.deepEqual(h.calls, []);
});

test('password reset preserves failures for friendly error handling', async () => {
  for (const [code, message] of [
    ['auth/invalid-email', 'Please enter a valid email address.'],
    ['auth/network-request-failed', 'Unable to connect. Please check your internet connection and try again.'],
    ['auth/too-many-requests', 'Too many attempts. Please wait a while and try again.'],
    ['auth/internal-error', 'Unable to send the password reset email. Please try again.'],
  ]) {
    const error = { code, message: 'Firebase internal details' };
    const h = harness({ sendPasswordResetEmail: async () => { throw error; } });
    await assert.rejects(h.api.forgotPasswordAuth('a@example.com'), (e) => {
      assert.equal(e, error);
      assert.equal(h.errors.getAuthErrorMessage(e, 'ForgotPassword'), message);
      return true;
    });
  }
});
