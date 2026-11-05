import webpush from 'web-push';
import { randomUUID } from 'node:crypto';
import { authenticated, doorName, doorRef, type DoorRecord } from '@/lib/doors';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!authenticated(request)) return Response.json({ error: '請先登入' }, { status: 401, headers: noStore });
  try {
    checkOrigin(request);
    const { id } = await context.params;
    const ref = doorRef(id);
    const snap = await ref.get(); const data = (snap.data() || {}) as DoorRecord;
    if (!data.subscription) return Response.json({ error: '此門尚未綁定接收裝置' }, { status: 409, headers: noStore });
    const pendingId = randomUUID();
    await ref.set({ pendingId, status: 'pending', updatedAt: Date.now() }, { merge: true });
    const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
    if (!publicKey || !privateKey || !subject) throw Error('推送設定缺失');
    try {
      await webpush.sendNotification(data.subscription, JSON.stringify({ title: `${doorName(id)} · 開門申請`, body: '有人發起開門申請，請查看並決定。', url: `/door?id=${id}&request=${pendingId}` }), { TTL: 300, urgency: 'high', vapidDetails: { subject, publicKey, privateKey }, timeout: 10000 });
    } catch (error) {
      await ref.update({ status: 'denied', updatedAt: Date.now() });
      throw error;
    }
    return Response.json({ pendingId, message: '開門申請已送出' }, { headers: noStore });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return Response.json({ error: status === 404 || status === 410 ? '推送訂閱已失效，請重新綁定' : '開門申請發送失敗' }, { status: 502, headers: noStore });
  }
}
