import webpush from 'web-push';
import { randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { authenticated, doorName, doorRef, type DoorRecord } from '@/lib/doors';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!authenticated(request)) return Response.json({ error: '請先登入' }, { status: 401, headers: noStore });
  try {
    if (request.headers.has('origin')) checkOrigin(request);
    const { id } = await context.params;
    const ref = doorRef(id);
    const snap = await ref.get(); const data = (snap.data() || {}) as DoorRecord;
    if (!data.subscription && !data.fcmToken) return Response.json({ error: '此門尚未綁定接收裝置' }, { status: 409, headers: noStore });
    const pendingId = randomUUID();
    await ref.set({ pendingId, status: 'pending', updatedAt: Date.now() }, { merge: true });
    try {
      if (data.fcmToken) {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw Error('Firebase 推送設定缺失');
        const app = getApps().find(item => item.name === 'door-demo-push') ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) }, 'door-demo-push');
        await getMessaging(app).send({
          token: data.fcmToken,
          notification: { title: `${doorName(id)} · 開門申請`, body: '有人發起開門申請，請查看並決定。' },
          data: { type: 'door_request', doorId: id, requestId: pendingId },
          android: { priority: 'high', ttl: 300000, notification: { channelId: 'push_test', icon: 'ic_stat_push', proxy: 'allow' } },
        });
      }
      if (data.subscription) {
        const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
        if (!publicKey || !privateKey || !subject) throw Error('推送設定缺失');
        await webpush.sendNotification(data.subscription!, JSON.stringify({ title: `${doorName(id)} · 開門申請`, body: '有人發起開門申請，請查看並決定。', url: `/door?id=${id}&request=${pendingId}` }), { TTL: 300, urgency: 'high', vapidDetails: { subject, publicKey, privateKey }, timeout: 10000 });
      }
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
