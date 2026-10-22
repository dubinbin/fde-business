import webpush from 'web-push';
import { checkOrigin, noStore, unseal } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let subscription;
  try {
    checkOrigin(request);
    if (Number(request.headers.get('content-length')) > 12000) throw new Error('请求过大');
    const { token } = await request.json();
    if (typeof token !== 'string') throw new Error('缺少发送链接');
    subscription = unseal(token);
  } catch {
    return Response.json({ error: '发送链接无效或已过期，请在接收端重新生成' }, { status: 400, headers: noStore });
  }
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
  if (!publicKey || !privateKey || !subject) return Response.json({ error: '服务端推送配置缺失' }, { status: 503, headers: noStore });
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title: '收到一条测试推送', body: '点击通知，选择「是」或「否」。' }), {
      TTL: 86400, urgency: 'high', vapidDetails: { subject, publicKey, privateKey }, timeout: 10000,
    });
    return Response.json({ message: '推送服务已接收，请在接收设备查看通知。' }, { headers: noStore });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return Response.json({ error: status === 410 || status === 404 ? '订阅已失效，请在接收端重新启用通知并生成链接' : '推送服务暂时无法发送，请稍后重试' }, { status: status === 410 || status === 404 ? 410 : 502, headers: noStore });
  }
}
