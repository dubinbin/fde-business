import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sealAndroid, unsealAndroid, validateFcmToken, smallJson } from '../src/lib/android-push';
import { unseal } from '../src/lib/push';
process.env.PUSH_TOKEN_SECRET = 'test-secret-with-at-least-thirty-two-characters';
const token = 'device-token:' + 'A'.repeat(150);
test('Android capability is encrypted, expires and cannot be used as a web subscription', () => {
  const sealed = sealAndroid(token, 1000);
  assert.equal(unsealAndroid(sealed, 2000), token);
  assert.ok(!sealed.includes(token));
  assert.throws(() => unsealAndroid(sealed, 1000 + 30 * 86400000));
  assert.throws(() => unseal(sealed));
  const bytes = Buffer.from(sealed, 'base64url'); bytes[40] ^= 1;
  assert.throws(() => unsealAndroid(bytes.toString('base64url'), 2000));
});
test('rejects invalid FCM targets and oversized chunked bodies', async () => {
  for (const value of [null, '', 'x', '/topics/all', 'https://example.com/' + 'a'.repeat(100), 'a'.repeat(4097)]) assert.throws(() => validateFcmToken(value));
  await assert.rejects(smallJson(new Request('https://example.com', { method: 'POST', body: JSON.stringify({ token: 'a'.repeat(13000) }) })));
});
