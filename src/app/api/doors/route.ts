import { authenticated, db, doorIds, publicDoor, type DoorRecord } from '@/lib/doors';
import { noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!authenticated(request)) return Response.json({ error: '請先登入' }, { status: 401, headers: noStore });
  try {
    const snapshots = await db().getAll(...doorIds.map(id => db().collection('door-demo').doc(id)));
    return Response.json({ doors: snapshots.map((snap, i) => publicDoor(doorIds[i], (snap.data() || {}) as DoorRecord)) }, { headers: noStore });
  } catch { return Response.json({ error: '暫時無法載入門資料' }, { status: 503, headers: noStore }); }
}
