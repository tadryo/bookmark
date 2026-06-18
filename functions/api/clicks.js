import { CORS, options as onRequestOptions } from '../_cors.js';

export async function onRequestGet({ env }) {
  const data = await env.DATA.get('clicks', 'json').catch(() => null);
  return Response.json(data ?? {}, { headers: CORS });
}

export { onRequestOptions };
