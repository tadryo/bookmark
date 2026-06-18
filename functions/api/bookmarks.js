const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestGet({ env }) {
  const data = await env.DATA.get('bookmarks', 'json').catch(() => null);
  return Response.json(data ?? [], { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
