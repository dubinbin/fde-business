import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { PushSubscription } from 'web-push';

const lifetime = 30 * 24 * 60 * 60 * 1000;
export function secretKey() {
  const secret = process.env.PUSH_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error('服务端尚未配置推送密钥');
  return createHash('sha256').update(secret).digest();
}
export function validateSubscription(value: unknown): PushSubscription {
  if (!value || typeof value !== 'object') throw new Error('无效的推送订阅');
  const s = value as PushSubscription;
  const url = new URL(s.endpoint);
  const hosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'push.services.mozilla.com', 'web.push.apple.com'];
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      !hosts.includes(url.hostname)) throw new Error('不支持的推送服务地址');
  if (!s.keys || typeof s.keys.auth !== 'string' || typeof s.keys.p256dh !== 'string' ||
      !/^[\w-]+$/.test(s.keys.auth) || !/^[\w-]+$/.test(s.keys.p256dh) ||
      Buffer.from(s.keys.auth, 'base64url').length !== 16 || Buffer.from(s.keys.p256dh, 'base64url').length !== 65 || s.endpoint.length > 4096) {
    throw new Error('无效的订阅密钥');
  }
  return { endpoint: s.endpoint, keys: { auth: s.keys.auth, p256dh: s.keys.p256dh } };
}
export function seal(subscription: PushSubscription, now = Date.now()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify({ subscription, expires: now + lifetime })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
export function unseal(token: string, now = Date.now()): PushSubscription {
  if (!/^[\w-]+$/.test(token) || token.length > 10000) throw new Error('无效的发送链接');
  const data = Buffer.from(token, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', secretKey(), data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  const payload = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
  if (!Number.isFinite(payload.expires) || payload.expires <= now) throw new Error('发送链接已过期，请在接收端重新生成');
  return validateSubscription(payload.subscription);
}
export function checkOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new Error('请求来源不匹配');
}
export const noStore = { 'Cache-Control': 'no-store' };
