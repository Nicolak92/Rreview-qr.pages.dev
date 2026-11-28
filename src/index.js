// Toolzweb Worker: redirects, the Google Maps short-link expander, then the static site.
const HOST = 'toolzweb.com';
const OLD = {'/sign-maker': '/review-sign-maker', '/palette-generator': '/color-palette-generator'};
const OK_HOSTS = ['maps.app.goo.gl','goo.gl','g.co','google.com','www.google.com','maps.google.com','consent.google.com'];
const okHost = h => OK_HOSTS.includes(h.toLowerCase()) || /^(www\.)?google\.[a-z.]{2,6}$/i.test(h);
const SEC = {'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'strict-transport-security': 'max-age=31536000', 'permissions-policy': 'camera=(), microphone=(), geolocation=()'};
const STATIC_ICON = /^\/(og-image\.png|apple-touch-icon\.png|icon-\d+\.png|favicon\.(svg|ico))$/;
const json = (o, s = 200) => new Response(JSON.stringify(o), {status: s, headers: {'content-type': 'application/json'}});

async function resolve(input) {
  let url;
  try { url = new URL(input); } catch (e) { return {error: 'That is not a valid link.'}; }
  if (url.protocol !== 'https:' || !okHost(url.hostname)) return {error: 'Only Google Maps links are supported.'};
  for (let i = 0; i < 8; i++) {
    if (url.hostname === 'consent.google.com' && url.searchParams.get('continue')) {
      try { url = new URL(url.searchParams.get('continue')); } catch (e) { break; }
      if (!okHost(url.hostname)) return {error: 'Unexpected redirect.'};
      continue;
    }
    if (/google\.[a-z.]+\/maps\/place\//i.test(url.href) || /[?&]ftid=|!1s0x/.test(url.href)) return {url: url.href};
    const res = await fetch(url.href, {redirect: 'manual', headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'accept-language': 'en-US,en;q=0.9'}});
    const loc = res.headers.get('location');
    if (!loc) return {url: url.href};
    url = new URL(loc, url);
    if (!okHost(url.hostname)) return {error: 'Unexpected redirect.'};
  }
  return {url: url.href};
}

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (u.hostname !== HOST && (u.hostname === 'www.' + HOST || u.hostname.endsWith('.workers.dev'))) {
      const fromWd = u.hostname.endsWith('.workers.dev');
      u.hostname = HOST; u.protocol = 'https:'; u.port = '';
      // the old workers.dev home page was the QR generator, so send it to the same tool
      if (fromWd && u.pathname === '/') u.pathname = '/google-review-qr-code-generator';
      if (OLD[u.pathname]) u.pathname = OLD[u.pathname];
      return Response.redirect(u.toString(), 301);
    }
    if (OLD[u.pathname]) { u.pathname = OLD[u.pathname]; return Response.redirect(u.toString(), 301); }
    if (u.pathname === '/api/resolve') {
      const target = u.searchParams.get('url');
      if (!target) return json({error: 'Missing url.'}, 400);
      try { const r = await resolve(target); return json(r, r.error ? 400 : 200); }
      catch (e) { return json({error: 'Could not open that link.'}, 502); }
    }
    // One address per page: /page.html and /page/ go to /page (and /index.html to /)
    if (u.pathname.endsWith('.html')) { u.pathname = u.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, ''); return Response.redirect(u.toString(), 301); }
    if (u.pathname === '/blog') { u.pathname = '/blog/'; return Response.redirect(u.toString(), 301); }
    // (the blog is a folder, so its addresses keep the trailing slash)
    if (u.pathname.length > 1 && u.pathname.endsWith('/') && !u.pathname.startsWith('/blog/')) { u.pathname = u.pathname.replace(/\/+$/, ''); return Response.redirect(u.toString(), 301); }
    const res = await env.ASSETS.fetch(request);
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(SEC)) h.set(k, v);
    if (STATIC_ICON.test(u.pathname)) h.set('cache-control', 'public, max-age=604800');
    return new Response(res.body, {status: res.status, statusText: res.statusText, headers: h});
  }
};
