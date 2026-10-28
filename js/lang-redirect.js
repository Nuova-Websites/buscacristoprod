// Runs in <head> before the page paints, so a visitor is sent to their language without a flash of Spanish.
//   - a saved choice (set with the language picker) always wins
//   - otherwise, on the Spanish (default) pages only, the browser language decides
//   - explicit links to another language (e.g. a shared /en/ link) are left alone
(() => {
    const LANGS = ['es', 'en', 'fr', 'pt', 'ca'];
    const meta = (name) => (document.querySelector(`meta[name="${name}"]`) || {}).content;
    const pageLang = document.documentElement.lang;
    const siteRoot = meta('site-root');
    const rel = meta('page-rel');
    if (siteRoot === undefined || !rel) return;

    let saved = null;
    try { saved = localStorage.getItem('lang'); } catch (e) { /* storage blocked */ }
    if (!LANGS.includes(saved)) saved = null;

    let target = saved;
    if (!target && pageLang === 'es' && !/bot|crawl|spider|slurp|facebookexternalhit/i.test(navigator.userAgent)) {
        const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'es'];
        for (const p of prefs) {
            const code = String(p).toLowerCase().split('-')[0];
            if (LANGS.includes(code)) { target = code; break; }
        }
    }
    if (target && target !== pageLang) {
        location.replace(siteRoot + (target === 'es' ? '' : target + '/') + rel + location.search + location.hash);
    }
})();
