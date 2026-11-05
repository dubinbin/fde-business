import { authenticated, doorRef, validateSubscription } from '@/lib/doors';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!authenticated(request)) return Response.json({ error: '請先登入' }, { status: 401, headers: noStore });
  try {
    if (request.headers.has('origin')) checkOrigin(request);
    if (Number(request.headers.get('content-length')) > 12000) throw Error();
    const { id } = await context.params;
    const body = await request.json();
    if (typeof body?.fcmToken === 'string' && body.fcmToken.length > 20 && body.fcmToken.length < 4096) {
      await doorRef(id).set({ fcmToken: body.fcmToken, boundAt: Date.now() }, { merge: true });
    } else {
      const subscription = validateSubscription(body);
      await doorRef(id).set({ subscription, boundAt: Date.now() }, { merge: true });
    }
    return Response.json({ message: '此裝置已取得該門的通知授權' }, { headers: noStore });
  } catch { return Response.json({ error: '綁定失敗，請檢查通知權限' }, { status: 400, headers: noStore }); }
}
