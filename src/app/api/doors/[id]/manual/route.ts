import { authenticated, doorRef, type DoorRecord } from '@/lib/doors';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!authenticated(request)) return Response.json({ error: '請先登入' }, { status: 401, headers: noStore });
  try {
    if (request.headers.has('origin')) checkOrigin(request);
    const ref = doorRef((await context.params).id);
    await ref.firestore.runTransaction(async tx => {
      const snap = await tx.get(ref); const data = (snap.data() || {}) as DoorRecord;
      if (!(data.subscription || data.fcmToken) || data.status === 'pending') throw Error('門未授權或有待處理申請');
      tx.update(ref, { status: 'opened', updatedAt: Date.now() });
    });
    return Response.json({ message: '門已開啟' }, { headers: noStore });
  } catch { return Response.json({ error: '暫時無法開門，請檢查授權或待處理申請' }, { status: 409, headers: noStore }); }
}
