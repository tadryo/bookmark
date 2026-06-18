import { CORS, options as onRequestOptions } from '../_cors.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'invalid JSON' }, { status: 400, headers: CORS }); }

  const { url } = body;
  if (!url) return Response.json({ error: 'url required' }, { status: 400, headers: CORS });

  const clicks = await env.DATA.get('clicks', 'json').catch(() => null) ?? {};
  clicks[url] = (clicks[url] || 0) + 1;
  await env.DATA.put('clicks', JSON.stringify(clicks));
  return Response.json({ ok: true }, { headers: CORS });
}

export { onRequestOptions };
