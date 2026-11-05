import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { secretKey, validateSubscription } from './push';
import type { PushSubscription } from 'web-push';

export const doorIds = Array.from({ length: 10 }, (_, floor) => ['A', 'B'].map(side => `F${String(floor + 1).padStart(2, '0')}-${side}`)).flat();
export function validDoor(id: string) { return doorIds.includes(id); }
export function doorName(id: string) { return `${Number(id.slice(1, 3))} 樓 ${id.endsWith('A') ? 'A' : 'B'} 門`; }
export function db() {
  const app = getApps().find(app => app.name === 'door-demo') ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)) }, 'door-demo');
  return getFirestore(app);
}
export function doorRef(id: string) { if (!validDoor(id)) throw new Error('無效的門'); return db().collection('door-demo').doc(id); }
export type DoorRecord = { subscription?: PushSubscription; pendingId?: string; status?: 'pending' | 'opened' | 'denied'; updatedAt?: number; boundAt?: number };
const password = () => { if (!process.env.DOOR_DEMO_PASSWORD) throw new Error('管理員密碼尚未設定'); return process.env.DOOR_DEMO_PASSWORD; };
export function validPassword(value: string) {
  const a = createHmac('sha256', secretKey()).update(value).digest();
  const b = createHmac('sha256', secretKey()).update(password()).digest();
  return timingSafeEqual(a, b);
}
function signature(value: string) { return createHmac('sha256', secretKey()).update(value).digest('base64url'); }
export function sessionCookie() { const value = `${Date.now() + 7 * 86400000}.${randomUUID()}`; return `${value}.${signature(value)}`; }
export function authenticated(request: Request) {
  const cookie = request.headers.get('cookie')?.match(/(?:^|; )door_session=([^;]+)/)?.[1];
  if (!cookie) return false;
  const parts = cookie.split('.'); if (parts.length !== 3 || Number(parts[0]) < Date.now()) return false;
  const value = `${parts[0]}.${parts[1]}`;
  const a = Buffer.from(signature(value)); const b = Buffer.from(parts[2]);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function publicDoor(id: string, data: DoorRecord) { return { id, name: doorName(id), bound: !!data.subscription, status: data.status || 'idle', pendingId: data.pendingId || null, updatedAt: data.updatedAt || null }; }
export { validateSubscription };
