import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { randomUUID } from 'node:crypto';
import { smallJson, unsealAndroid } from '@/lib/android-push';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let token: string;
  try {
    checkOrigin(request);
    token = unsealAndroid((await smallJson(request)).token);
  } catch {
    return Response.json({ error: '发送链接无效或已过期，请在 Android App 重新配对' }, { status: 400, headers: noStore });
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return Response.json({ error: '服务端尚未配置 Firebase' }, { status: 503, headers: noStore });
  try {
    const app = getApps().find(app => app.name === 'android-push') ?? initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) }, 'android-push');
    const messageId = await getMessaging(app).send({
      token,
      notification: { title: '收到一条 Android 测试推送', body: '点击通知，选择「是」或「否」。' },
      data: { screen: 'respond', testId: randomUUID() },
      android: { priority: 'high', ttl: 3600000, notification: { channelId: 'push_test', icon: 'ic_stat_push' } },
    });
    return Response.json({ message: 'FCM 已接收，请查看 Android 系统通知。', messageId }, { headers: noStore });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const expired = code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
    console.error('Android push failed', code ?? 'unknown');
    return Response.json({ error: expired ? '设备 token 已失效，请在 App 重新配对' : 'FCM 发送失败，请检查服务端配置或稍后重试' }, { status: expired ? 410 : 502, headers: noStore });
  }
}
