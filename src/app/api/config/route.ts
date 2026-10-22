import { noStore, secretKey } from '@/lib/push';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    secretKey();
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) throw new Error('服务端尚未配置 VAPID');
    return Response.json({ publicKey }, { headers: noStore });
  } catch {
    return Response.json({ error: '服务端尚未配置推送环境变量' }, { status: 503, headers: noStore });
  }
}
