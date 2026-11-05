import { authenticated, doorRef, type DoorRecord } from '@/lib/doors';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!authenticated(request)) return Response.json({ error: '請先登入' }, { status: 401, headers: noStore });
  try {
    if (request.headers.has('origin')) checkOrigin(request);
    const { id } = await context.params;
    const { pendingId, decision } = await request.json();
    if (typeof pendingId !== 'string' || !['opened', 'denied'].includes(decision)) throw Error('選擇無效');
    await dbTransaction(doorRef(id), pendingId, decision);
    return Response.json({ message: decision === 'opened' ? '門已開啟' : '開門申請已拒絕' }, { headers: noStore });
  } catch { return Response.json({ error: '申請已處理或失效，請重新整理' }, { status: 409, headers: noStore }); }
}
async function dbTransaction(ref: ReturnType<typeof doorRef>, pendingId: string, decision: 'opened' | 'denied') {
  await ref.firestore.runTransaction(async tx => {
    const snap = await tx.get(ref); const data = (snap.data() || {}) as DoorRecord;
    if (data.status !== 'pending' || data.pendingId !== pendingId || Date.now() - (data.updatedAt || 0) > 300000) throw Error('申請失效');
    tx.update(ref, { status: decision, updatedAt: Date.now() });
  });
}
