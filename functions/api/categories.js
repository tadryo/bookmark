import { CORS, options as onRequestOptions } from '../_cors.js';

export async function onRequestGet({ env }) {
  const cats = await env.DATA.get('categories', 'json').catch(() => null) ?? [];
  return Response.json(cats, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  const { name } = await request.json().catch(() => ({}));
  if (!name?.trim()) return Response.json({ error: 'name required' }, { status: 400, headers: CORS });
  const cats = await env.DATA.get('categories', 'json').catch(() => null) ?? [];
  if (!cats.includes(name.trim())) {
    cats.push(name.trim());
    await env.DATA.put('categories', JSON.stringify(cats));
  }
  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestPatch({ request, env }) {
  const { oldName, newName } = await request.json().catch(() => ({}));
  if (!oldName || !newName?.trim())
    return Response.json({ error: 'oldName and newName required' }, { status: 400, headers: CORS });
  const [cats, bookmarks] = await Promise.all([
    env.DATA.get('categories', 'json').catch(() => null) ?? [],
    env.DATA.get('bookmarks',  'json').catch(() => null) ?? [],
  ]);
  const ci = cats.indexOf(oldName);
  if (ci !== -1) cats[ci] = newName.trim();
  bookmarks.forEach(bm => { if (bm.tags[0] === oldName) bm.tags[0] = newName.trim(); });
  await Promise.all([
    env.DATA.put('categories', JSON.stringify(cats)),
    env.DATA.put('bookmarks',  JSON.stringify(bookmarks)),
  ]);
  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestDelete({ request, env }) {
  const { name } = await request.json().catch(() => ({}));
  const [cats, bookmarks] = await Promise.all([
    env.DATA.get('categories', 'json').catch(() => null) ?? [],
    env.DATA.get('bookmarks',  'json').catch(() => null) ?? [],
  ]);
  bookmarks.forEach(bm => { if (bm.tags[0] === name) bm.tags = []; });
  await Promise.all([
    env.DATA.put('categories', JSON.stringify(cats.filter(c => c !== name))),
    env.DATA.put('bookmarks',  JSON.stringify(bookmarks)),
  ]);
  return Response.json({ ok: true }, { headers: CORS });
}

export { onRequestOptions };
