// Static-site builder: src/pages/**/*.html + layouts + partials -> generated pages at the repo root.
//
//   Spanish (default)  ->  <rel>            e.g. fe/oracion.html
//   Other languages    ->  <lang>/<rel>     e.g. en/fe/oracion.html
//
// Spanish is the source language. Every visible text unit is looked up in src/i18n/<lang>/*.json by a
// stable id (see src/i18n/catalog.json, regenerated on every build). Missing translations fall back to Spanish.
//
// Usage:
//   npm run build                    build everything, print a translation report
//   node build.mjs --missing fr      print {id: spanish} for every unit not yet translated into French
//   node build.mjs --strict          fail the build if any translation is missing
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'node-html-parser';

const SRC = 'src';
const SITE_URL = 'https://www.buscacristo.org';
const DEFAULT_LANG = 'es';
const LANGS = ['es', 'en', 'fr', 'pt', 'ca'];
const OG_LOCALE = { es: 'es_ES', en: 'en_US', fr: 'fr_FR', pt: 'pt_PT', ca: 'ca_ES' };
const OG_IMAGE = `${SITE_URL}/img/hero-poster.jpg`; // 1280x720

const read = (p) => fs.readFileSync(p, 'utf8');
const site = JSON.parse(read(path.join(SRC, 'site.json')));
const layout = read(path.join(SRC, 'layouts', 'base.html'));

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const missingFlag = args.indexOf('--missing');
const missingLang = missingFlag >= 0 ? args[missingFlag + 1] : null;

// ---------- translation files ----------
const translations = {};
for (const lang of LANGS.filter((l) => l !== DEFAULT_LANG)) {
    // src/i18n/<lang>/*.json are merged, so translations can be kept in small files
    const dir = path.join(SRC, 'i18n', lang);
    translations[lang] = {};
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) Object.assign(translations[lang], JSON.parse(read(path.join(dir, f))));
}
const jsFile = path.join(SRC, 'i18n', 'js.json');
const jsStrings = fs.existsSync(jsFile) ? JSON.parse(read(jsFile)) : {};

const collapse = (s) => s.replace(/\s+/g, ' ').trim();
const idOf = (key) => 'k' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 8);

// ---------- template expansion ----------
// expand: partial includes and {{#if}} blocks. Plain {{vars}} are substituted last, after translation.
function expand(tpl, vars) {
    return tpl
        .replace(/\{\{> (\w+)\}\}/g, (_, name) => expand(read(path.join(SRC, 'partials', `${name}.html`)).trimEnd(), vars))
        .replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => (vars[key] ? expand(body, vars) : ''));
}

const lookup = (vars, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), vars);
function substitute(tpl, vars) {
    return tpl.replace(/\{\{([\w.]+)\}\}/g, (m, key) => {
        const v = lookup(vars, key);
        if (v === undefined) throw new Error(`Undefined template variable: ${m}`);
        return v;
    });
}

function parsePage(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!m) return { data: {}, body: text };
    const data = {};
    for (const line of m[1].split(/\r?\n/)) {
        const i = line.indexOf(':');
        if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return { data, body: text.slice(m[0].length) };
}

function* walkFiles(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walkFiles(p);
        else if (e.name.endsWith('.html')) yield p;
    }
}

// ---------- translatable units ----------
const INLINE = new Set(['a', 'strong', 'em', 'b', 'i', 'span', 'br', 'small', 'abbr', 'sup', 'sub', 'u', 'mark', 's', 'cite', 'q', 'time', 'code']);
const VOID = new Set(['br', 'img', 'hr', 'input', 'wbr']);
const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'head', 'title', 'meta', 'link']);
const ATTRS = ['alt', 'placeholder', 'aria-label', 'title'];
const hasLetters = (t) => /\p{L}/u.test(t);

const hasBlockDescendant = (el) => el.querySelectorAll('*').some((d) => !INLINE.has(d.tagName.toLowerCase()));
const isUnit = (el) => hasLetters(el.text) && !hasBlockDescendant(el);

function* contentUnits(el) {
    for (const c of el.childNodes) {
        if (c.nodeType !== 1) continue;
        if (SKIP.has(c.tagName.toLowerCase())) continue;
        if (isUnit(c)) yield c;
        else yield* contentUnits(c);
    }
}

// Elements with their own text that are neither a unit nor inside one: a sign we'd silently miss a string.
function* orphanText(el) {
    for (const c of el.childNodes) {
        if (c.nodeType === 3 && hasLetters(c.rawText) && !SKIP.has(el.tagName.toLowerCase())) yield el;
        if (c.nodeType === 1 && !SKIP.has(c.tagName.toLowerCase()) && !isUnit(c)) yield* orphanText(c);
    }
}

// Mask inline tags as <t1>…</t1> so translators never touch hrefs/classes; unmask restores the originals by number.
function mask(el) {
    const tags = [];
    let n = 0;
    const ser = (node) => {
        let out = '';
        for (const c of node.childNodes) {
            if (c.nodeType === 3) out += c.rawText;
            else if (c.nodeType === 1) {
                const i = ++n;
                const tag = c.rawTagName;
                const open = `<${tag}${c.rawAttrs ? ' ' + c.rawAttrs : ''}>`;
                if (VOID.has(tag.toLowerCase())) { tags[i] = { open }; out += `<t${i}/>`; }
                else { tags[i] = { open, close: `</${tag}>` }; out += `<t${i}>${ser(c)}</t${i}>`; }
            }
        }
        return out;
    };
    return { key: collapse(ser(el)), tags };
}
const unmask = (str, tags) => str
    .replace(/<t(\d+)\/>/g, (_, i) => tags[i].open)
    .replace(/<t(\d+)>/g, (_, i) => tags[i].open)
    .replace(/<\/t(\d+)>/g, (_, i) => tags[i].close);

const parseDoc = (html) => parse(html, { comment: true });

// Collect every unit (id -> Spanish key) from a Spanish template-expanded page.
function collectKeys(html, fm, into) {
    const root = parseDoc(html);
    const body = root.querySelector('body');
    for (const el of contentUnits(body)) { const { key } = mask(el); into[idOf(key)] = key; }
    for (const el of body.querySelectorAll('*')) {
        if (SKIP.has(el.tagName.toLowerCase())) continue;
        for (const a of ATTRS) {
            const v = el.getAttribute(a);
            if (v && hasLetters(v)) { const key = collapse(v); into[idOf(key)] = key; }
        }
    }
    for (const k of ['title', 'description']) if (fm[k]) { const key = collapse(fm[k]); into[idOf(key)] = key; }
    return [...orphanText(body)].map((el) => `${el.tagName.toLowerCase()}: ${collapse(el.text).slice(0, 60)}`);
}

// Translate a Spanish template-expanded page into `lang`.
function translateHtml(html, lang, missing) {
    const dict = translations[lang];
    const root = parseDoc(html);
    const body = root.querySelector('body');
    const lookupKey = (key) => {
        const t = dict[idOf(key)];
        if (t === undefined) missing.add(idOf(key));
        return t;
    };
    for (const el of [...contentUnits(body)]) {
        const { key, tags } = mask(el);
        const t = lookupKey(key);
        if (t !== undefined) el.set_content(unmask(t, tags));
    }
    for (const el of body.querySelectorAll('*')) {
        if (SKIP.has(el.tagName.toLowerCase())) continue;
        for (const a of ATTRS) {
            const v = el.getAttribute(a);
            if (!v || !hasLetters(v)) continue;
            const t = lookupKey(collapse(v));
            if (t !== undefined) el.setAttribute(a, t);
        }
    }
    return root.toString();
}

function translateText(text, lang, missing) {
    if (!text) return text;
    const key = collapse(text);
    const t = translations[lang][idOf(key)];
    if (t === undefined) { missing.add(idOf(key)); return text; }
    return t;
}

// ---------- build ----------
const pagesDir = path.join(SRC, 'pages');
const catalog = {};
const orphans = [];
const missingByLang = Object.fromEntries(LANGS.filter((l) => l !== DEFAULT_LANG).map((l) => [l, new Set()]));
let count = 0;
const pageRels = [];

for (const file of walkFiles(pagesDir)) {
    const rel = path.relative(pagesDir, file).split(path.sep).join('/');
    const depth = rel.split('/').length - 1;
    const { data, body } = parsePage(read(file));

    pageRels.push(rel);
    const alternates = [...LANGS.map((l) => `    <link rel="alternate" hreflang="${l}" href="${SITE_URL}/${l === DEFAULT_LANG ? '' : l + '/'}${rel}">`),
        `    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/${rel}">`].join('\n');

    for (const lang of LANGS) {
        const isDefault = lang === DEFAULT_LANG;
        const lroot = '../'.repeat(depth);
        const root = isDefault ? lroot : '../'.repeat(depth + 1);
        const vars = { ...site, ...data, lang, root, lroot, rel, srcPath: rel, alternates, content: '{{content}}',
            home: rel === 'index.html' ? '' : `${lroot}index.html`,
            canonical: `${SITE_URL}/${isDefault ? '' : lang + '/'}${rel}`,
            ogLocale: OG_LOCALE[lang],
            ogLocaleAlternates: LANGS.filter((l) => l !== lang).map((l) => `    <meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`).join('\n'),
            ogImage: OG_IMAGE };

        const missing = isDefault ? new Set() : missingByLang[lang];
        if (!isDefault) {
            vars.title = translateText(data.title, lang, missing);
            if (data.description) vars.description = translateText(data.description, lang, missing);
            const jsMap = {};
            for (const [es, tr] of Object.entries(jsStrings)) if (tr[lang]) jsMap[es] = tr[lang];
            if (data.script && Object.keys(jsMap).length) vars.jsStrings = JSON.stringify(jsMap).replace(/</g, '\\u003c');
        }

        const content = expand(body.trim(), vars);
        let html = expand(layout, vars).replace('{{content}}', () => content);

        if (isDefault) {
            orphans.push(...collectKeys(html, data, catalog).map((o) => `${rel}  ${o}`));
        } else {
            html = translateHtml(html, lang, missing);
        }

        const out = isDefault ? rel : `${lang}/${rel}`;
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, substitute(html, vars));
        count++;
    }
}

// catalog: id -> Spanish text, in first-seen order
fs.mkdirSync(path.join(SRC, 'i18n'), { recursive: true });
fs.writeFileSync(path.join(SRC, 'i18n', 'catalog.json'), JSON.stringify(catalog, null, 1) + '\n');

// sitemap: every page in every language, each listing its translations (hreflang)
const urlFor = (lang, rel) => `${SITE_URL}/${lang === DEFAULT_LANG ? '' : lang + '/'}${rel}`;
const sitemapEntries = [];
for (const rel of pageRels) {
    const links = [...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(l, rel)}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LANG, rel)}"/>`].join('\n');
    for (const lang of LANGS) sitemapEntries.push(`  <url>\n    <loc>${urlFor(lang, rel)}</loc>\n${links}\n  </url>`);
}
fs.writeFileSync('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
    + sitemapEntries.join('\n') + '\n</urlset>\n');

// robots.txt: crawlers may visit everything; this just points them to the sitemap
fs.writeFileSync('robots.txt', `User-agent: *\nDisallow:\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Built ${count} pages (${LANGS.length} languages). Catalog: ${Object.keys(catalog).length} text units.`);
if (orphans.length) console.log(`WARNING untranslatable text outside any unit:\n  ${[...new Set(orphans)].slice(0, 15).join('\n  ')}`);

if (missingLang) {
    const out = {};
    for (const id of missingByLang[missingLang] ?? []) if (catalog[id]) out[id] = catalog[id];
    console.log(JSON.stringify(out, null, 1));
}
let totalMissing = 0;
for (const [lang, set] of Object.entries(missingByLang)) {
    const n = [...set].filter((id) => catalog[id]).length;
    totalMissing += n;
    console.log(`  ${lang}: ${Object.keys(catalog).length - n}/${Object.keys(catalog).length} translated${n ? ` (${n} missing)` : ''}`);
}
if (strict && totalMissing) process.exit(1);
