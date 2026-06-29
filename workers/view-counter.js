/**
 * Cloudflare Worker — Page View Counter
 * 
 * Deploy this as a Cloudflare Worker with a KV namespace bound as VIEW_COUNTS.
 * 
 * Setup instructions:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Create a KV namespace: Workers → KV → Create Namespace (name: "VIEW_COUNTS")
 * 4. Bind it: Worker Settings → Variables → KV Namespace Bindings → Add: VIEW_COUNTS
 * 5. Deploy
 * 6. Update WORKER_URL in view-counter-client.js with your worker URL
 * 
 * API:
 *   GET  /?page=/blog/my-post/  → { "count": 42 }
 *   POST /?page=/blog/my-post/  → { "count": 43 } (increments)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const page = url.searchParams.get('page');

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (!page) {
      return new Response(JSON.stringify({ error: 'Missing ?page= parameter' }), {
        status: 400,
        headers,
      });
    }

    const key = `views:${page}`;

    if (request.method === 'POST') {
      // Increment view count
      const current = parseInt(await env.VIEW_COUNTS.get(key) || '0', 10);
      const newCount = current + 1;
      await env.VIEW_COUNTS.put(key, newCount.toString());
      return new Response(JSON.stringify({ count: newCount }), { headers });
    }

    // GET — return current count
    const count = parseInt(await env.VIEW_COUNTS.get(key) || '0', 10);
    return new Response(JSON.stringify({ count }), { headers });
  },
};
