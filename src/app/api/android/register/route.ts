import { sealAndroid, smallJson, validateFcmToken } from '@/lib/android-push';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    if (request.headers.has('origin')) checkOrigin(request);
    const { token } = await smallJson(request);
    const capability = sealAndroid(validateFcmToken(token));
    return Response.json({ sendUrl: `${new URL(request.url).origin}/android#${capability}` }, { headers: noStore });
  } catch {
    return Response.json({ error: '设备配对失败，请重新启用通知' }, { status: 400, headers: noStore });
  }
}
