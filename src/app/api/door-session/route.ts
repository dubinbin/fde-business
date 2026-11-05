import { authenticated, sessionCookie, validPassword } from '@/lib/doors';
import { checkOrigin, noStore } from '@/lib/push';
export const runtime = 'nodejs';
export async function GET(request: Request) { return Response.json({ authenticated: authenticated(request) }, { headers: noStore }); }
export async function POST(request: Request) {
  try {
    if (request.headers.has('origin')) checkOrigin(request);
    if (Number(request.headers.get('content-length')) > 1024) throw Error();
    const { username, password } = await request.json();
    if (username !== 'admin' || typeof password !== 'string' || !validPassword(password)) throw Error();
    const token = sessionCookie();
    const response = Response.json({ ok: true, token }, { headers: noStore });
    response.headers.append('Set-Cookie', `door_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);
    return response;
  } catch { return Response.json({ error: '帳號或密碼不正確' }, { status: 401, headers: noStore }); }
}
