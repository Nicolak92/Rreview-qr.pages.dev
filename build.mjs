// Toolzweb site builder. Reads tools.json + tools/*.html + pages/*.html and writes the finished site into public/.
// Run on every Cloudflare deploy (build command: node build.mjs). No installs needed.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const cfg = JSON.parse(read('tools.json'));
const S = cfg.site;
// A tool whose file is missing is shown as coming soon, so a missing upload never breaks the build.
for (const t of cfg.tools) if (t.status === 'live' && !fs.existsSync(path.join(root, `tools/${t.slug}.html`))) { console.warn(`WARNING: tools/${t.slug}.html is missing. Showing "${t.name}" as coming soon.`); t.status = 'soon'; }
const OUT = path.join(root, 'public');
const today = new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ld = o => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
const byCat = Object.fromEntries(cfg.categories.map(c => [c.id, c]));
const bySlug = Object.fromEntries(cfg.tools.map(t => [t.slug, t]));
const live = cfg.tools.filter(t => t.status === 'live');

const PINS_TMP = path.join(root, 'pins-tmp');
if (fs.existsSync(path.join(OUT, 'pins'))) fs.cpSync(path.join(OUT, 'pins'), PINS_TMP, {recursive: true});
fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(path.join(OUT, 'assets'), {recursive: true});
const write = (f, c) => { fs.mkdirSync(path.dirname(path.join(OUT, f)), {recursive: true}); fs.writeFileSync(path.join(OUT, f), c); };

// ---- shared assets
fs.writeFileSync(path.join(OUT, 'assets/site.css'), read('assets/site-base.css') + '\n' + read('assets/site-extra.css'));
write('assets/site.js', read('assets/site.js'));
write('favicon.svg', read('assets/favicon.svg'));
// optional self-hosted brand logo: put assets/logo.png (or .svg/.webp) in the repo and set "logo": "/assets/logo.png" in tools.json
for (const f of fs.readdirSync(path.join(root, 'assets')).filter(f => /^logo\./.test(f))) fs.copyFileSync(path.join(root, 'assets', f), path.join(OUT, 'assets', f));
for (const f of ['og-image.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon.ico']) fs.copyFileSync(path.join(root, 'assets', f), path.join(OUT, f));

// ---- shared pieces
const head = ({title, desc, p, extra = '', noindex = false}) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta name="p:domain_verify" content="130697f401f10d3da9f63bd9ddd64e0a"/>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${S.url}${p}">
<meta name="theme-color" content="#07142e">
${S.googleVerification ? `<meta name="google-site-verification" content="${esc(S.googleVerification)}">\n` : ''}<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:site_name" content="${esc(S.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${S.url}${p}">
<meta property="og:image" content="${S.url}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(S.name)}: free online tools for business, design and creators">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${S.url}/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"></noscript>
<link rel="stylesheet" href="/assets/site.css">
${extra}
</head>
<body>`;

const nav = () => `<nav class="top" aria-label="Main">
  <a class="brand" href="/"><img src="${esc(S.logo)}" alt="" width="32" height="32"><span>${esc(S.name)}</span></a>
  <div class="links">
    <details class="mm"><summary>All tools</summary><div class="mmp">${cfg.categories.map(c => `<div><h3><a href="/${c.id}">${esc(c.name)}</a></h3><ul>${cfg.tools.filter(t => t.category === c.id).map(t => t.status === 'live' ? `<li><a href="/${t.slug}">${esc(t.name)}</a></li>` : `<li class="soon">${esc(t.name)} <small>soon</small></li>`).join('')}</ul></div>`).join('')}</div></details>
    <a href="/blog/">Blog</a>
  </div>
</nav>`;

const footer = () => `<footer class="sitefoot">
  <div class="fr">${cfg.categories.map(c => `<a href="/${c.id}">${esc(c.name)}</a>`).join('')}</div>
  <div class="fr">${cfg.pages.map(p => `<a href="/${p.slug}">${esc(p.title)}</a>`).join('')}<a href="/blog/">Blog</a><a href="${esc(S.blogUrl)}" rel="noopener">${esc(S.blogName)}</a></div>
  <p>&copy; ${new Date().getFullYear()} ${esc(S.name)}. Not affiliated with Google or any other brand named on this site. Brand names belong to their owners.</p>
</footer>`;

const analytics = S.analyticsToken ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(S.analyticsToken)}"}'></script>` : '';
const tail = '<script src="/assets/site.js" defer></script>' + analytics + '\n</body>\n</html>\n';
const hero = (pill, h1, lead, wide) => `<header class="hero"><span class="pill">${pill}</span><h1>${h1}</h1><p>${lead}</p></header>\n<main class="wrap${wide ? ' wide' : ''}">`;
const card = t => t.status === 'live'
  ? `<a class="tc" href="/${t.slug}"><span class="tn">${esc(t.name)}</span><span class="td">${esc(t.description)}</span></a>`
  : `<div class="tc off"><span class="tn">${esc(t.name)} <em>Coming soon</em></span><span class="td">${esc(t.description)}</span></div>`;

const ORG = {'@context': 'https://schema.org', '@type': 'Organization', name: S.name, url: S.url + '/', logo: S.url + '/icon-512.png', sameAs: [S.blogUrl]};
const APPCAT = {'local-business-reviews': 'BusinessApplication', 'design-branding': 'DesignApplication', 'sellers-supply-chain': 'BusinessApplication', 'content-creators': 'MultimediaApplication', 'marketing-freelancers': 'BusinessApplication'};
const crumbLd = items => ({'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({'@type': 'ListItem', position: i + 1, name: x[0], item: S.url + x[1]}))});
const sitemap = [];

// ---- home
{
  const sections = cfg.categories.map(c => `<section class="card cat"><div class="sec"><h2><a href="/${c.id}">${esc(c.name)}</a></h2><a class="more" href="/${c.id}">View category</a></div><p>${esc(c.description)}</p><div class="tg">${cfg.tools.filter(t => t.category === c.id).map(card).join('')}</div></section>`).join('\n');
  const title = `${S.name}: Free Online Tools for Business, Design and Creators`;
  const desc = 'Free online tools that run in your browser: review QR codes, color palettes, seller calculators, creator and marketing tools. No sign-up.';
  write('index.html', head({title, desc, p: '/', extra: ld(ORG) + '\n' + ld({'@context': 'https://schema.org', '@type': 'WebSite', name: S.name, url: S.url + '/', description: desc, publisher: {'@type': 'Organization', name: S.name}})})
    + nav() + hero('Free · No sign-up', 'Free online tools for business, design and creators', 'Simple, fast tools that run in your browser. Pick a category or search.', true)
    + `<section class="card"><label for="q">Search tools</label><input id="q" class="field" type="search" placeholder="Try: QR code, color, calculator..." autocomplete="off" style="width:100%"></section>\n${sections}\n<p class="sm" id="none" style="display:none;text-align:center">No tools match that search.</p>\n</main>\n${footer()}
<script>(function(){var q=document.getElementById('q');q.addEventListener('input',function(){var v=q.value.toLowerCase().trim(),any=false;document.querySelectorAll('.tc').forEach(function(c){var m=!v||c.textContent.toLowerCase().indexOf(v)>-1;c.style.display=m?'':'none'});document.querySelectorAll('.cat').forEach(function(s){var n=[].some.call(s.querySelectorAll('.tc'),function(c){return c.style.display!=='none'});s.style.display=n?'':'none';if(n)any=true});document.getElementById('none').style.display=any?'none':'block'})})();</script>\n` + tail);
  sitemap.push('/');
}

// ---- category pages
for (const c of cfg.categories) {
  const list = cfg.tools.filter(t => t.category === c.id);
  const title = `${c.name}: Free Tools | ${S.name}`;
  write(`${c.id}.html`, head({title, desc: `${c.description} Free ${c.name.toLowerCase()} tools that run in your browser.`, p: '/' + c.id, extra: ld({'@context': 'https://schema.org', '@type': 'CollectionPage', name: c.name, description: c.description, url: `${S.url}/${c.id}`, isPartOf: {'@type': 'WebSite', name: S.name, url: S.url + '/'}, mainEntity: {'@type': 'ItemList', itemListElement: list.filter(t => t.status === 'live').map((t, i) => ({'@type': 'ListItem', position: i + 1, url: `${S.url}/${t.slug}`, name: t.name}))}}) + '\n' + ld(crumbLd([[S.name, '/'], [c.name, '/' + c.id]]))})
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
  schema.push({'@context': 'https://schema.org', '@type': 'WebApplication', name: t.name, description: seo.description || t.description, url: `${S.url}/${t.slug}`, applicationCategory: APPCAT[t.category] || 'UtilitiesApplication', operatingSystem: 'Any (web browser)', browserRequirements: 'Requires JavaScript', isAccessibleForFree: true, inLanguage: 'en', offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'}, publisher: {'@type': 'Organization', name: S.name, url: S.url + '/'}});
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
  const related = `<section class="card"><h2 class="fh">More free tools</h2>${rel.length ? `<div class="tg">${rel.map(card).join('')}</div>` : ''}<p class="sm" style="margin:12px 0 0"><a href="/${c.id}">See all ${esc(c.name)} tools</a> &middot; <a href="/">All ${esc(S.name)} tools</a></p></section>`;
  write(`${t.slug}.html`, head({title: seo.title || t.name, desc: seo.description || t.description, p: '/' + t.slug, extra})
    + nav() + hero(`<a href="/${c.id}" style="color:inherit;text-decoration:none">${esc(c.name)}</a>`, seo.h1 || esc(t.name), seo.lead || esc(t.description), false)
    + `\n${p.markup}\n${aff}\n${kit}\n${guide}\n${faq}\n${related}\n</main>\n${footer()}\n${p.tail}\n` + tail);
  sitemap.push('/' + t.slug);
}

// ---- info pages
for (const pg of cfg.pages) {
  const body = read(`pages/${pg.slug}.html`).replace(/{{CONTACT}}/g, S.contactEmail ? `<a href="mailto:${esc(S.contactEmail)}">${esc(S.contactEmail)}</a>` : `the contact options on <a href="${esc(S.blogUrl)}" rel="noopener">our blog</a>`).replace(/{{NAME}}/g, esc(S.name)).replace(/{{URL}}/g, esc(S.url));
  write(`${pg.slug}.html`, head({title: pg.seoTitle || `${pg.title} | ${S.name}`, desc: pg.description, p: '/' + pg.slug, extra: ld({'@context': 'https://schema.org', '@type': pg.slug === 'about' ? 'AboutPage' : pg.slug === 'contact' ? 'ContactPage' : 'WebPage', name: pg.title, description: pg.description, url: `${S.url}/${pg.slug}`, isPartOf: {'@type': 'WebSite', name: S.name, url: S.url + '/'}})})
    + nav() + hero(esc(S.name), esc(pg.title), esc(pg.description), false)
    + `<section class="card prose">${body}</section>\n</main>\n${footer()}\n` + tail);
  sitemap.push('/' + pg.slug);
}

// ---- blog (copied from the blog/ folder, so it keeps its own pages)
const hasBlog = fs.existsSync(path.join(root, 'blog'));
if (hasBlog) {
  fs.cpSync(path.join(root, 'blog'), path.join(OUT, 'blog'), {recursive: true});
  sitemap.push('/blog/');
  for (const f of fs.readdirSync(path.join(root, 'blog'))) if (f.endsWith('.html') && f !== 'index.html') sitemap.push('/blog/' + f.slice(0, -5));
}
if (fs.existsSync(PINS_TMP)) { fs.cpSync(PINS_TMP, path.join(OUT, 'pins'), {recursive: true}); fs.rmSync(PINS_TMP, {recursive: true, force: true}); }
// ---- 404, sitemap, robots
write('404.html', head({title: `Page not found | ${S.name}`, desc: 'This page could not be found.', p: '/404', noindex: true})
  + nav() + hero('404', 'Page not found', 'That page does not exist. Pick a tool below.', true)
  + `<section class="card">${cfg.categories.map(c => `<h2 class="fh"><a href="/${c.id}">${esc(c.name)}</a></h2><div class="tg">${cfg.tools.filter(t => t.category === c.id && t.status === 'live').map(card).join('')}</div>`).join('')}</section>\n</main>\n${footer()}\n` + tail);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(p => `  <url><loc>${S.url}${p === '/' ? '/' : p}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `# All crawlers, including search engines and AI tools, may read the public pages.\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${S.url}/sitemap.xml\n`);
const liveNow = cfg.tools.filter(t => t.status === 'live');
const llms = [`# ${S.name}`, '', `> ${S.tagline} ${liveNow.length} free web tools in ${cfg.categories.length} categories. Most tools run entirely in the browser, need no sign-up and do not upload files.`, '',
  `${S.name} is built by the author of the blog "${S.blogName}" (${S.blogUrl}). Each tool has its own page with a short guide and FAQ.`, ''];
for (const c of cfg.categories) { llms.push(`## ${c.name}`, '', c.description, ''); for (const t of liveNow.filter(x => x.category === c.id)) llms.push(`- [${t.name}](${S.url}/${t.slug}): ${t.description}`); llms.push(''); }
llms.push('## About and policies', ''); for (const pg of cfg.pages) llms.push(`- [${pg.title}](${S.url}/${pg.slug}): ${pg.description}`);
llms.push('', '## Optional', '', `- [Sitemap](${S.url}/sitemap.xml): every page on the site`, `- [Full text version of this file](${S.url}/llms-full.txt): descriptions, guides and FAQs for every tool`, ...(fs.existsSync(path.join(root, 'blog')) ? [`- [${S.name} blog](${S.url}/blog/): articles and guides`] : []), `- [${S.blogName}](${S.blogUrl}): the blog behind ${S.name}`, '');
write('llms.txt', llms.join('\n'));
const plain = h => h.replace(/<\/(h2|li|p)>/g, '$&\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
const full = [`# ${S.name}: full tool descriptions`, '', `> ${S.tagline}`, ''];
for (const t of liveNow) { const p = parseTool(t.slug); full.push(`## ${t.name}`, `URL: ${S.url}/${t.slug}`, `Category: ${byCat[t.category].name}`, `Summary: ${t.description}`, '', plain(p.guide), '', 'FAQ:'); for (const m of p.faq.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)) full.push(`Q: ${strip(m[1])}`, `A: ${strip(m[2])}`); full.push(''); }
write('llms-full.txt', full.join('\n'));
console.log(`Built ${sitemap.length} pages (${live.length} live tools, ${cfg.tools.length - live.length} coming soon).`);
