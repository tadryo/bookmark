const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_INFO_URL  = 'https://www.googleapis.com/oauth2/v2/userinfo';
const COOKIE           = 'bm_sess';
const THIRTY_DAYS      = 60 * 60 * 24 * 30;

// ── Cookie parser ───────────────────────────────────────────
function parseCookies(header) {
  const c = {};
  (header || '').split(';').forEach(p => {
    const [k, ...v] = p.trim().split('=');
    if (k) c[k.trim()] = v.join('=');
  });
  return c;
}

// ── HMAC-SHA256 session token ────────────────────────────────
async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

async function signToken(email, secret) {
  const payload = `${email}|${Math.floor(Date.now() / 1000)}`;
  const key = await getKey(secret);
  const sig  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return btoa(`${payload}|${sigB64}`);
}

async function verifyToken(token, secret, allowedEmail) {
  try {
    const raw     = atob(token);
    const lastPipe = raw.lastIndexOf('|');
    const payload  = raw.slice(0, lastPipe);
    const sigB64   = raw.slice(lastPipe + 1);
    const [email, tsStr] = payload.split('|');
    if (email !== allowedEmail) return false;
    if (Date.now() / 1000 - parseInt(tsStr) > THIRTY_DAYS) return false;
    const key      = await getKey(secret);
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
  } catch { return false; }
}

// ── Main middleware ──────────────────────────────────────────
export async function onRequest({ request, next, env }) {
  const url     = new URL(request.url);
  const CLIENT_ID     = env.GOOGLE_CLIENT_ID     || '';
  const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || '';
  const SECRET        = env.SESSION_SECRET       || env.AUTH_PASSWORD || 'dev-secret';
  const ALLOWED       = env.ALLOWED_EMAIL        || 'tad.ryoya@gmail.com';
  const REDIRECT_URI  = `${url.origin}/auth/callback`;

  // ─ ブックマークレット用トークン (X-Auth-Token ヘッダー)
  const xToken = request.headers.get('X-Auth-Token');
  if (env.AUTH_PASSWORD && xToken === env.AUTH_PASSWORD) return next();

  // ─ ログアウト
  if (url.pathname === '/auth/logout') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`,
      },
    });
  }

  // ─ Google OAuth コールバック
  if (url.pathname === '/auth/callback' && CLIENT_ID) {
    const code  = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '/';
    if (!code) return Response.redirect('/', 302);

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return new Response('認証失敗', { status: 401 });

    const userRes = await fetch(GOOGLE_INFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();
    if (user.email !== ALLOWED) {
      return new Response(`アクセス拒否: ${user.email}`, { status: 403 });
    }

    const sess = await signToken(user.email, SECRET);
    return new Response(null, {
      status: 302,
      headers: {
        Location: state,
        'Set-Cookie': `${COOKIE}=${sess}; HttpOnly; Secure; SameSite=Lax; Max-Age=${THIRTY_DAYS}; Path=/`,
      },
    });
  }

  // ─ セッションクッキー確認
  const cookies = parseCookies(request.headers.get('Cookie'));
  if (cookies[COOKIE] && await verifyToken(cookies[COOKIE], SECRET, ALLOWED)) {
    return next();
  }

  // ─ Google OAuth にリダイレクト
  if (CLIENT_ID) {
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'email');
    authUrl.searchParams.set('state', url.pathname + url.search);
    return Response.redirect(authUrl.toString(), 302);
  }

  // ─ Basic Auth フォールバック (GOOGLE_CLIENT_ID 未設定時)
  if (env.AUTH_PASSWORD) {
    const auth = request.headers.get('Authorization') || '';
    if (auth.startsWith('Basic ')) {
      try {
        const decoded = atob(auth.slice(6));
        const pwd = decoded.includes(':') ? decoded.split(':').slice(1).join(':') : decoded;
        if (pwd === env.AUTH_PASSWORD) return next();
      } catch {}
    }
    return new Response('401 Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Bookmark"', 'Content-Type': 'text/plain' },
    });
  }

  // ─ 認証なし (ローカル開発)
  return next();
}
