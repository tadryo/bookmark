// 認証済みユーザーにのみトークンを返す（ミドルウェアが通過済み）
export async function onRequestGet({ env }) {
  const token = env.AUTH_PASSWORD ?? '';
  return Response.json({ token }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
