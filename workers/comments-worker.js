/**
 * Cloudflare Worker - Comments API
 *
 * Same pattern as your existing workers/view-counter.js: one Worker, one KV
 * namespace. No login, no GitHub account - a visitor types a name and a comment.
 *
 * SETUP
 * 1. dash.cloudflare.com -> Workers & Pages -> Create Worker -> paste this file
 * 2. Workers -> KV -> Create namespace, name it COMMENTS
 * 3. Worker -> Settings -> Bindings -> KV namespace -> Variable name: COMMENTS
 * 4. Worker -> Settings -> Variables -> add these (Secret, not plaintext, for the last one):
 *      ALLOWED_ORIGIN    https://venkateshakula1729.github.io
 *      ADMIN_TOKEN       <a long random string you invent>
 * 5. Deploy, copy the worker URL, paste it into js/comments.js as WORKER_URL
 *
 * API
 *  GET   /?page=/blog/why-quant-research/               -> { comments: [...] }
 *  POST  /?page=/blog/why-quant-research/               -> { ok: true, comment: {...} }
 *          body: { "name": "...", "body": "...", "website": "" }
 *  DELETE /?page=...&id=...  with header  X-Admin-Token: <ADMIN_TOKEN>
 */ 

const LIMITS = {
  name: 60,
  body: 4000,
  perPage: 500,        // max comments stored per page
  windowSeconds: 60,   // rate limit window
  maxPerWindow: 3      // max posts per IP per window
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const page = normalisePage(url.searchParams.get('page'));

    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || '*';
    // Echo the origin only when it matches, so the browser enforces the rule for us.
    const cors = {
      'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? origin : allowed),
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (!page) return json({ error: 'Missing or invalid ?page=' }, 400, cors);

    const key = `comments:${page}`;

    /* ----------- READ ---------------------- */
    if (request.method === 'GET') {
      const list = JSON.parse((await env.COMMENTS.get(key)) || '[]');
      return json({ comments: list.filter(c => !c.hidden) }, 200, cors);
    }

    /* ----------- DELETE (you, moderating) ---------------------- */
    if (request.method === 'DELETE') {
      if (!env.ADMIN_TOKEN || request.headers.get('X-Admin-Token') !== env.ADMIN_TOKEN) {
        return json({ error: 'Unauthorised' }, 401, cors);
      }
      const id = url.searchParams.get('id');
      const list = JSON.parse((await env.COMMENTS.get(key)) || '[]');
      const next = list.filter(c => c.id !== id);
      await env.COMMENTS.put(key, JSON.stringify(next));
      return json({ ok: true, removed: list.length - next.length }, 200, cors);
    }

    /* ----------- WRITE ---------------------- */
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

    // Reject cross-origin posts outright - CORS alone does not stop a scripted POST.
    if (allowed !== '*' && origin && origin !== allowed) {
      return json({ error: 'Forbidden origin' }, 403, cors);
    }

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400, cors); }

    // Honeypot: a real person never fills a field that is hidden with CSS.
    if (payload.website) return json({ ok: true, comment: null }, 200, cors);

    const name = clean(payload.name, LIMITS.name);
    const body = clean(payload.body, LIMITS.body);
    if (!name || !body) return json({ error: 'Name and comment are both required' }, 400, cors);
    if (body.length < 2) return json({ error: 'Comment is too short' }, 400, cors);

    // Rate limit per IP, per page.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = `rl:${ip}`;
    const hits = parseInt((await env.COMMENTS.get(rlKey)) || '0', 10);
    if (hits >= LIMITS.maxPerWindow) {
      return json({ error: 'You are posting too quickly. Try again in a minute.' }, 429, cors);
    }
    await env.COMMENTS.put(rlKey, String(hits + 1), { expirationTtl: LIMITS.windowSeconds });

    const comment = {
      id: crypto.randomUUID(),
      name,
      body,
      at: new Date().toISOString()
    };

    const list = JSON.parse((await env.COMMENTS.get(key)) || '[]');
    list.push(comment);
    if (list.length > LIMITS.perPage) list.splice(0, list.length - LIMITS.perPage);
    await env.COMMENTS.put(key, JSON.stringify(list));

    return json({ ok: true, comment }, 200, cors);
  }
};

/* Strip control characters and clamp length. HTML is NOT stripped here -
   the client renders with textContent, so tags can never execute. Storing the
   raw text keeps the data honest if you later render it somewhere else. */
function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
}

/* Only allow site-shaped paths, so nobody can use your KV as free storage. */
function normalisePage(page) {
  if (!page || typeof page !== 'string') return null;
  if (/[^\/a-zA-Z0-9\-_]/.test(page)) return null;
  if (page.includes('..')) return null;
  return page.endsWith('/') ? page : page + '/';
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}