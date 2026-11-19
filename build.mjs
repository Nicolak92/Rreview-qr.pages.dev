// Toolzweb site builder. Reads tools.json + tools/*.html + pages/*.html and writes the finished site into public/.
// Run on every Cloudflare deploy (build command: node build.mjs). No installs needed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const cfg = JSON.parse(read('tools.json'));
const S = cfg.site;
const OUT = path.join(root, 'public');
const today = new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ld = o => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
const byCat = Object.fromEntries(cfg.categories.map(c => [c.id, c]));
const bySlug = Object.fromEntries(cfg.tools.map(t => [t.slug, t]));
const live = cfg.tools.filter(t => t.status === 'live');

fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(path.join(OUT, 'assets'), {recursive: true});
const write = (f, c) => { fs.mkdirSync(path.dirname(path.join(OUT, f)), {recursive: true}); fs.writeFileSync(path.join(OUT, f), c); };

// ---- shared assets
fs.writeFileSync(path.join(OUT, 'assets/site.css'), read('assets/site-base.css') + '\n' + read('assets/site-extra.css'));
write('assets/site.js', read('assets/site.js'));
write('favicon.svg', read('assets/favicon.svg'));

// ---- shared pieces
const head = ({title, desc, p, extra = ''}) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${S.url}${p}">
<meta name="theme-color" content="#07142e">
${S.googleVerification ? `<meta name="google-site-verification" content="${esc(S.googleVerification)}">\n` : ''}<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(S.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${S.url}${p}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/site.css">
${extra}
</head>
<body>`;

const nav = () => `<nav class="top" aria-label="Main">
  <a class="brand" href="/"><img src="${esc(S.logo)}" alt="" width="32" height="32"><span>${esc(S.name)}</span></a>
  <div class="links">
    <details class="mm"><summary>All tools</summary><div class="mmp">${cfg.categories.map(c => `<div><h3><a href="/${c.id}">${esc(c.name)}</a></h3><ul>${cfg.tools.filter(t => t.category === c.id).map(t => t.status === 'live' ? `<li><a href="/${t.slug}">${esc(t.name)}</a></li>` : `<li class="soon">${esc(t.name)} <small>soon</small></li>`).join('')}</ul></div>`).join('')}</div></details>
    <a href="${esc(S.blogUrl)}" rel="noopener">Blog</a>
  </div>
</nav>`;

const footer = () => `<footer class="sitefoot">
  <div class="fr">${cfg.categories.map(c => `<a href="/${c.id}">${esc(c.name)}</a>`).join('')}</div>
  <div class="fr">${cfg.pages.map(p => `<a href="/${p.slug}">${esc(p.title)}</a>`).join('')}<a href="${esc(S.blogUrl)}" rel="noopener">Blog</a></div>
  <p>&copy; ${new Date().getFullYear()} ${esc(S.name)}. Not affiliated with Google or any other brand named on this site. Brand names belong to their owners.</p>
</footer>`;

const analytics = S.analyticsToken ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(S.analyticsToken)}"}'></script>` : '';
const tail = '<script src="/assets/site.js" defer></script>' + analytics + '\n</body>\n</html>\n';
const hero = (pill, h1, lead, wide) => `<header class="hero"><span class="pill">${pill}</span><h1>${h1}</h1><p>${lead}</p></header>\n<main class="wrap${wide ? ' wide' : ''}">`;
const card = t => t.status === 'live'
  ? `<a class="tc" href="/${t.slug}"><span class="tn">${esc(t.name)}</span><span class="td">${esc(t.description)}</span></a>`
  : `<div class="tc off"><span class="tn">${esc(t.name)} <em>Coming soon</em></span><span class="td">${esc(t.description)}</span></div>`;

const sitemap = [];

// ---- home
{
  const sections = cfg.categories.map(c => `<section class="card cat"><div class="sec"><h2><a href="/${c.id}">${esc(c.name)}</a></h2><a class="more" href="/${c.id}">View category</a></div><p>${esc(c.description)}</p><div class="tg">${cfg.tools.filter(t => t.category === c.id).map(card).join('')}</div></section>`).join('\n');
  const title = `${S.name}: Free Online Tools for Business, Design and Creators`;
  const desc = 'Free online tools that run in your browser: review QR codes and signs, color palettes, seller and supply chain calculators, creator tools and marketing helpers. No sign-up.';
  write('index.html', head({title, desc, p: '/', extra: ld({'@context': 'https://schema.org', '@type': 'WebSite', name: S.name, url: S.url + '/', description: desc})})
    + nav() + hero('Free · No sign-up', 'Free online tools for business, design and creators', 'Simple, fast tools that run in your browser. Pick a category or search.', true)
    + `<section class="card"><label for="q">Search tools</label><input id="q" class="field" type="search" placeholder="Try: QR code, color, calculator..." autocomplete="off" style="width:100%"></section>\n${sections}\n<p class="sm" id="none" style="display:none;text-align:center">No tools match that search.</p>\n</main>\n${footer()}
<script>(function(){var q=document.getElementById('q');q.addEventListener('input',function(){var v=q.value.toLowerCase().trim(),any=false;document.querySelectorAll('.tc').forEach(function(c){var m=!v||c.textContent.toLowerCase().indexOf(v)>-1;c.style.display=m?'':'none'});document.querySelectorAll('.cat').forEach(function(s){var n=[].some.call(s.querySelectorAll('.tc'),function(c){return c.style.display!=='none'});s.style.display=n?'':'none';if(n)any=true});document.getElementById('none').style.display=any?'none':'block'})})();</script>\n` + tail);
  sitemap.push('/');
}

// ---- category pages
for (const c of cfg.categories) {
  const list = cfg.tools.filter(t => t.category === c.id);
  const title = `${c.name}: Free Tools | ${S.name}`;
  write(`${c.id}.html`, head({title, desc: `${c.description} Free ${c.name.toLowerCase()} tools that run in your browser.`, p: '/' + c.id})
    + nav() + hero('Category', esc(c.name), esc(c.description), true)
    + `<section class="card"><div class="tg">${list.map(card).join('')}</div><p class="sm">More tools are added here regularly.</p></section>\n</main>\n${footer()}\n` + tail);
  sitemap.push('/' + c.id);
}

// ---- tool pages (live tools only)
function parseTool(slug) {
  const t = read(`tools/${slug}.html`);
  const get = (a, b) => {
    const i = t.indexOf(`<!--${a}-->`); if (i < 0) return '';
    const s = i + a.length + 7, j = b ? t.indexOf(`<!--${b}-->`, s) : -1;
    return t.slice(s, j < 0 ? t.length : j).trim();
  };
  return {css: get('CSS', 'MARKUP'), markup: get('MARKUP', 'GUIDE'), guide: get('GUIDE', 'FAQ'), faq: get('FAQ', 'TAIL'), tail: get('TAIL')};
}
for (const t of live) {
  const p = parseTool(t.slug), c = byCat[t.category], seo = t.seo || {};
  const faqs = [...p.faq.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)].map(m => [strip(m[1]), strip(m[2])]);
  const schema = [{'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    {'@type': 'ListItem', position: 1, name: S.name, item: S.url + '/'},
    {'@type': 'ListItem', position: 2, name: c.name, item: `${S.url}/${c.id}`},
    {'@type': 'ListItem', position: 3, name: t.name, item: `${S.url}/${t.slug}`}]}];
  if (faqs.length) schema.push({'@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}}))});
  const extra = (p.css ? `<style>${p.css}</style>\n` : '') + schema.map(ld).join('\n');
  const items = (t.affiliate && t.affiliate.items) || [], raw = (t.affiliate && t.affiliate.html) || '';
  const aff = (items.length || raw) ? `<section class="card aff"><h2>Recommended for you</h2><p class="sm">This section contains affiliate links. If you buy through them we may earn a commission at no extra cost to you. <a href="/affiliate-disclosure">Details</a></p>${raw}<div class="ag">${items.map(i => `<a class="ai" href="${esc(i.url)}" target="_blank" rel="sponsored noopener">${i.image ? `<img src="${esc(i.image)}" alt="" loading="lazy">` : ''}<b>${esc(i.title)}</b><span>${esc(i.text || '')}</span><em>${esc(i.button || 'Learn more')}</em></a>`).join('')}</div></section>` : '';
  const kit = t.kit ? `<section class="card signup"><h2>${esc((t.signup && t.signup.heading) || 'Get new free tools by email')}</h2><p>${esc((t.signup && t.signup.text) || 'New free tools and templates, sent now and then. No spam, unsubscribe any time.')}</p><script async data-uid="${esc(t.kit)}" src="https://${S.kitHost}/${esc(t.kit)}/index.js"></script></section>` : '';
  const guide = p.guide ? `<section class="card prose">${p.guide}</section>` : '';
  const faq = p.faq ? `<section class="card"><h2 class="fh">Frequently asked questions</h2>${p.faq}</section>` : '';
  let rel = (t.related || []).map(s => bySlug[s]).filter(x => x && x.status === 'live' && x.slug !== t.slug);
  if (!rel.length) rel = [...live.filter(x => x.category === t.category && x.slug !== t.slug), ...live.filter(x => x.category !== t.category && x.slug !== t.slug)];
  rel = rel.slice(0, 3);
  const related = rel.length ? `<section class="card"><h2 class="fh">More free tools</h2><div class="tg">${rel.map(card).join('')}</div></section>` : '';
  write(`${t.slug}.html`, head({title: seo.title || t.name, desc: seo.description || t.description, p: '/' + t.slug, extra})
    + nav() + hero(`<a href="/${c.id}" style="color:inherit;text-decoration:none">${esc(c.name)}</a>`, seo.h1 || esc(t.name), seo.lead || esc(t.description), false)
    + `\n${p.markup}\n${aff}\n${kit}\n${guide}\n${faq}\n${related}\n</main>\n${footer()}\n${p.tail}\n` + tail);
  sitemap.push('/' + t.slug);
}

// ---- info pages
for (const pg of cfg.pages) {
  const body = read(`pages/${pg.slug}.html`).replace(/{{CONTACT}}/g, S.contactEmail ? `<a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>` : `the contact options on <a href="${esc(S.blogUrl)}" rel="noopener">our blog</a>`).replace(/{{NAME}}/g, esc(S.name)).replace(/{{URL}}/g, esc(S.url));
  write(`${pg.slug}.html`, head({title: `${pg.title} | ${S.name}`, desc: pg.description, p: '/' + pg.slug})
    + nav() + hero(esc(S.name), esc(pg.title), esc(pg.description), false)
    + `<section class="card prose">${body}</section>\n</main>\n${footer()}\n` + tail);
  sitemap.push('/' + pg.slug);
}
// ---- blog (copied from the blog/ folder)
if (fs.existsSync(path.join(root, 'blog'))) {
  fs.cpSync(path.join(root, 'blog'), path.join(OUT, 'blog'), {recursive: true});
  sitemap.push('/blog/');
  for (const f of fs.readdirSync(path.join(root, 'blog'))) if (f.endsWith('.html') && f !== 'index.html') sitemap.push('/blog/' + f.slice(0, -5));
}
// ---- 404, sitemap, robots
write('404.html', head({title: `Page not found | ${S.name}`, desc: 'This page could not be found.', p: '/404', extra: '<meta name="robots" content="noindex">'})
  + nav() + hero('404', 'Page not found', 'That page does not exist. Pick a tool below.', true)
  + `<section class="card">${cfg.categories.map(c => `<h2 class="fh"><a href="/${c.id}">${esc(c.name)}</a></h2><div class="tg">${cfg.tools.filter(t => t.category === c.id && t.status === 'live').map(card).join('')}</div>`).join('')}</section>\n</main>\n${footer()}\n` + tail);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(p => `  <url><loc>${S.url}${p === '/' ? '/' : p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${S.url}/sitemap.xml\n`);
console.log(`Built ${sitemap.length} pages (${live.length} live tools, ${cfg.tools.length - live.length} coming soon).`);
