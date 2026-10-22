import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin, seal, unseal, validateSubscription } from '../src/lib/push';
process.env.PUSH_TOKEN_SECRET = 'test-secret-with-at-least-thirty-two-characters';
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { auth: Buffer.alloc(16, 1).toString('base64url'), p256dh: Buffer.alloc(65, 4).toString('base64url') } };
test('encrypted token survives stateless requests and expires after 30 days', () => {
  const token = seal(sub, 1000);
  assert.deepEqual(unseal(token, 2000), sub);
  assert.throws(() => unseal(token, 1000 + 30 * 86400000), /过期/);
  assert.ok(!token.includes(sub.endpoint));
});
test('rejects tampering and wrong server secret', () => {
  const token = seal(sub);
  const bytes = Buffer.from(token, 'base64url'); bytes[40] ^= 1;
  assert.throws(() => unseal(bytes.toString('base64url')));
  const old = process.env.PUSH_TOKEN_SECRET;
  process.env.PUSH_TOKEN_SECRET = 'a-different-secret-with-thirty-two-characters';
  assert.throws(() => unseal(token)); process.env.PUSH_TOKEN_SECRET = old;
});
test('blocks arbitrary backend requests and malformed subscriptions', () => {
  for (const endpoint of ['http://fcm.googleapis.com/x', 'https://127.0.0.1/x', 'https://fcm.googleapis.com.evil.com/x', 'https://user@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x']) assert.throws(() => validateSubscription({ ...sub, endpoint }));
  assert.throws(() => validateSubscription({ ...sub, keys: { auth: 'x', p256dh: 'x' } }));
  assert.throws(() => validateSubscription(null));
});
test('requires same origin on mutation routes', () => {
  assert.throws(() => checkOrigin(new Request('https://example.com/api/push', { headers: { origin: 'https://evil.com' } })));
  assert.doesNotThrow(() => checkOrigin(new Request('https://example.com/api/push', { headers: { origin: 'https://example.com' } })));
});
