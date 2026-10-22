import { checkOrigin, noStore, seal, validateSubscription } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (Number(request.headers.get('content-length')) > 12000) throw new Error('请求过大');
    const subscription = validateSubscription(await request.json());
    return Response.json({ token: seal(subscription) }, { headers: noStore });
  } catch {
    return Response.json({ error: '订阅失败，请检查浏览器支持及服务端配置后重试' }, { status: 400, headers: noStore });
  }
}
