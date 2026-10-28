// Shared behaviour for every page: navbar, mobile menu, scroll reveal.
(() => {
    const navbar = document.getElementById('navbar');
    const navLinks = document.getElementById('navLinks');
    const mobileToggle = document.getElementById('mobileToggle');

    // Navbar scroll effect
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // Mobile menu (aria-expanded keeps screen readers in sync with the open state)
    if (mobileToggle && navLinks) {
        const setMenu = (open) => {
            navLinks.classList.toggle('open', open);
            mobileToggle.setAttribute('aria-expanded', String(open));
        };
        mobileToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMenu(false));
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('open')) {
                setMenu(false);
                mobileToggle.focus();
            }
        });
    }

    // Scroll reveal
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Language picker: remember the choice and open the same page in that language
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        const meta = (name) => (document.querySelector(`meta[name="${name}"]`) || {}).content;
        langSelect.value = document.documentElement.lang;
        langSelect.addEventListener('change', () => {
            const lang = langSelect.value;
            try { localStorage.setItem('lang', lang); } catch (e) { /* storage blocked: still switch */ }
            location.href = meta('site-root') + (lang === 'es' ? '' : lang + '/') + meta('page-rel') + location.hash;
        });
    }
})();
