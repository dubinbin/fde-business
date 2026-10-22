import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { secretKey } from './push';

export function validateFcmToken(value: unknown): string {
  if (typeof value !== 'string' || value.length < 50 || value.length > 4096 || !/^[\w:\-]+$/.test(value)) throw new Error('无效的设备 token');
  return value;
}
export function sealAndroid(token: string, now = Date.now()) {
  validateFcmToken(token);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  cipher.setAAD(Buffer.from('android-fcm-v1'));
  const body = Buffer.concat([cipher.update(JSON.stringify({ token, expires: now + 30 * 86400000 })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function unsealAndroid(value: unknown, now = Date.now()): string {
  if (typeof value !== 'string' || value.length > 8000 || !/^[\w-]+$/.test(value)) throw new Error('无效的发送链接');
  const bytes = Buffer.from(value, 'base64url');
  const cipher = createDecipheriv('aes-256-gcm', secretKey(), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from('android-fcm-v1'));
  cipher.setAuthTag(bytes.subarray(12, 28));
  const data = JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString());
  if (!Number.isFinite(data.expires) || data.expires <= now) throw new Error('发送链接已过期');
  return validateFcmToken(data.token);
}
export async function smallJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('缺少请求内容');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12000) { await reader.cancel(); throw new Error('请求过大'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
