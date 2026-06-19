import { CORS, options as onRequestOptions } from '../_cors.js';

function faviconUrl(url) {
  try { return `https://favicon.im/${new URL(url).hostname}`; }
  catch { return ''; }
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'invalid JSON' }, { status: 400, headers: CORS }); }

  const { title, url, tags = [] } = body;
  if (!title?.trim() || !url?.trim()) {
    return Response.json({ error: 'title and url required' }, { status: 400, headers: CORS });
  }

  const bookmarks = await env.DATA.get('bookmarks', 'json').catch(() => null) ?? [];
  bookmarks.push({ title: title.trim(), url: url.trim(), tags, favicon: faviconUrl(url.trim()) });
  await env.DATA.put('bookmarks', JSON.stringify(bookmarks));
  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestPatch({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'invalid JSON' }, { status: 400, headers: CORS }); }

  const { url, title, tags, newUrl, favicon } = body;
  const currentUrl = url?.trim();
  if (!currentUrl) return Response.json({ error: 'url required' }, { status: 400, headers: CORS });

  const bookmarks = await env.DATA.get('bookmarks', 'json').catch(() => null) ?? [];
  const idx = bookmarks.findIndex(b => b.url === currentUrl);
  if (idx === -1) return Response.json({ error: 'not found' }, { status: 404, headers: CORS });

  if (title   !== undefined) bookmarks[idx].title   = title;
  if (tags    !== undefined) bookmarks[idx].tags    = tags;
  if (favicon !== undefined) bookmarks[idx].favicon = favicon || faviconUrl(bookmarks[idx].url);
  if (newUrl  !== undefined) {
    const normalizedNewUrl = newUrl.trim();
    if (!normalizedNewUrl) return Response.json({ error: 'newUrl must not be empty' }, { status: 400, headers: CORS });
    bookmarks[idx].url = normalizedNewUrl;
    if (favicon === undefined) bookmarks[idx].favicon = faviconUrl(normalizedNewUrl);
  }
  await env.DATA.put('bookmarks', JSON.stringify(bookmarks));
  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestDelete({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'invalid JSON' }, { status: 400, headers: CORS }); }

  const { url } = body;
  if (!url) return Response.json({ error: 'url required' }, { status: 400, headers: CORS });

  const bookmarks = await env.DATA.get('bookmarks', 'json').catch(() => null) ?? [];
  await env.DATA.put('bookmarks', JSON.stringify(bookmarks.filter(b => b.url !== url)));
  return Response.json({ ok: true }, { headers: CORS });
}

export { onRequestOptions };
