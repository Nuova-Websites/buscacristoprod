// Tiny static-site builder: src/pages/**/*.html + layouts + partials -> same paths at the repo root.
// Usage: npm run build
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src';
const read = (p) => fs.readFileSync(p, 'utf8');
const site = JSON.parse(read(path.join(SRC, 'site.json')));
const layout = read(path.join(SRC, 'layouts', 'base.html'));

const lookup = (vars, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), vars);

function render(tpl, vars) {
    return tpl
        .replace(/\{\{> (\w+)\}\}/g, (_, name) => render(read(path.join(SRC, 'partials', `${name}.html`)).trimEnd(), vars))
        .replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, body) => (vars[key] ? render(body, vars) : ''))
        .replace(/\{\{([\w.]+)\}\}/g, (m, key) => {
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

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else if (e.name.endsWith('.html')) yield p;
    }
}

const pagesDir = path.join(SRC, 'pages');
let count = 0;
for (const file of walk(pagesDir)) {
    const rel = path.relative(pagesDir, file).split(path.sep).join('/');
    const depth = rel.split('/').length - 1;
    const root = '../'.repeat(depth);
    const { data, body } = parsePage(read(file));
    const vars = { ...site, ...data, root, home: rel === 'index.html' ? '' : `${root}index.html`, srcPath: rel, content: '{{content}}' };
    const content = render(body.trim(), vars);
    const html = render(layout, vars).replace('{{content}}', () => content);
    fs.mkdirSync(path.dirname(rel), { recursive: true });
    fs.writeFileSync(rel, html);
    count++;
}
console.log(`Built ${count} pages.`);
