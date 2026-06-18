import { CORS, options as onRequestOptions } from '../_cors.js';

function faviconUrl(url) {
  try { return `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`; }
  catch { return ''; }
}

export async function onRequestGet({ env }) {
  const list = await env.DATA.get('reading_list', 'json').catch(() => null) ?? [];
  return Response.json(list, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const { title, url } = await request.json().catch(() => ({}));
  if (!title?.trim() || !url?.trim())
    return Response.json({ error: 'title and url required' }, { status: 400, headers: CORS });
  const list = await env.DATA.get('reading_list', 'json').catch(() => null) ?? [];
  if (!list.find(r => r.url === url.trim())) {
    list.push({ title: title.trim(), url: url.trim(), favicon: faviconUrl(url.trim()), addedAt: Date.now() });
    await env.DATA.put('reading_list', JSON.stringify(list));
  }
  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestDelete({ request, env }) {
  const { url } = await request.json().catch(() => ({}));
  const list = await env.DATA.get('reading_list', 'json').catch(() => null) ?? [];
  await env.DATA.put('reading_list', JSON.stringify(list.filter(r => r.url !== url)));
  return Response.json({ ok: true }, { headers: CORS });
}

export { onRequestOptions };
