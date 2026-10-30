// Translate a Spanish UI string into the page language (window.T is injected by the build for non-Spanish pages)
const t = (s) => (window.T && window.T[s]) || s;
const pageLang = document.documentElement.lang || 'es';

// Video fallback — the poster covers loading; if the video errors, show the still image instead
const vid = document.querySelector('.hero-video');
const fallback = document.getElementById('heroFallback');

// Visitors who asked their device to reduce motion get the still poster instead of the video
if (vid && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    vid.pause();
    vid.removeAttribute('autoplay');
    vid.querySelectorAll('source').forEach(s => s.remove());
    vid.load();
}

if (vid && fallback) {
    vid.addEventListener('error', () => { vid.hidden = true; fallback.classList.add('is-visible'); }, true);
}


// Address: optional free text, no validation
const direccionInput = document.getElementById('direccion');

// Geolocation button
document.getElementById('geoBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { alert(t('Tu navegador no soporta geolocalización.')); return; }
    const btn = document.getElementById('geoBtn');
    btn.classList.add('loading'); btn.disabled = true;
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${pageLang}`, {
                headers: { 'Accept-Language': pageLang }
            });
            const data = await res.json();
            const a = data.address || {};
            const parts = [
                a.road || a.pedestrian || a.footway || a.street,
                a.house_number,
                a.city || a.town || a.village || a.municipality || a.county
            ].filter(Boolean);
            direccionInput.value = parts.join(', ');
        } catch { alert(t('No se pudo obtener la dirección. Inténtalo manualmente.')); }
        finally { btn.classList.remove('loading'); btn.disabled = false; }
    }, () => {
        alert(t('No se pudo acceder a tu ubicación. Verifica los permisos del navegador.'));
        btn.classList.remove('loading'); btn.disabled = false;
    }, { timeout: 8000 });
});

// Form submission
const API_URL = 'https://script.google.com/macros/s/AKfycbwD1ysXRGNrelXhj9-x9vKqTwU6I0HqaN7OQa453uz0gnO3dlbc2PQwME-ysfiCfsSo/exec';

// Contact validation: at least ONE of email / phone must be valid; the other may be empty or invalid
const emailInput = document.getElementById('email');
const telefonoInput = document.getElementById('telefono');
const contactError = document.getElementById('contactError');

const isValidEmail = (v) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v.trim());
const isValidPhone = (v) => {
    v = v.trim();
    const digits = v.replace(/\D/g, '').length;
    return /^\+?[\d\s().-]+$/.test(v) && digits >= 9 && digits <= 15;
};

function validateContact() {
    if (isValidEmail(emailInput.value) || isValidPhone(telefonoInput.value)) {
        contactError.classList.remove('show');
        emailInput.classList.remove('field-invalid');
        telefonoInput.classList.remove('field-invalid');
        return true;
    }
    contactError.classList.add('show');
    emailInput.classList.add('field-invalid');
    telefonoInput.classList.add('field-invalid');
    return false;
}
// Only re-check live once the error is showing, so typing a valid value clears it without nagging early
[emailInput, telefonoInput].forEach(el => el.addEventListener('input', () => {
    if (contactError.classList.contains('show')) validateContact();
}));

document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Need a valid email or a valid phone number
    if (!validateContact()) { emailInput.focus(); return; }
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    const sendLabel = btn.textContent;
    btn.textContent = t('Enviando...');

    const formData = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        // an invalid one is dropped so the sheet only holds contact details that work
        email: isValidEmail(emailInput.value) ? emailInput.value.trim() : '',
        telefono: isValidPhone(telefonoInput.value) ? telefonoInput.value.trim() : '',
        direccion: direccionInput.value,
        interes: document.getElementById('interes').value,
        mensaje: document.getElementById('mensaje').value,
        fecha: new Date().toISOString(),
        idioma: pageLang
    };

    try {
        // text/plain avoids a CORS preflight, which Apps Script doesn't answer
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(formData)
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');
        document.getElementById('contactForm').reset();
        document.getElementById('formSuccess').style.display = 'block';
        setTimeout(() => { document.getElementById('formSuccess').style.display = 'none'; }, 5000);
    } catch (err) {
        alert(t('Hubo un error al enviar el mensaje. Inténtalo de nuevo.'));
    } finally {
        btn.disabled = false;
        btn.textContent = sendLabel;
    }
});

// Infinite-loop carousel
function initCarousel(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const track = wrapper.querySelector('.carousel-track');
    const cards = Array.from(track.children);
    const total = cards.length;
    let transitioning = false;

    function getVisible() {
        const w = window.innerWidth;
        if (w <= 600) return 1;
        if (w <= 900) return 2;
        return parseInt(track.dataset.visible);
    }

    function getCardWidth() {
        const visible = getVisible();
        const gap = 32;
        const trackWidth = track.parentElement.offsetWidth;
        return (trackWidth - gap * (visible - 1)) / visible;
    }

    function getOffset() {
        const visible = getVisible();
        const gap = 32;
        const cardW = getCardWidth();
        return cardW + gap;
    }

    const prevBtn = wrapper.querySelector('.carousel-btn.prev');
    const nextBtn = wrapper.querySelector('.carousel-btn.next');

    nextBtn.addEventListener('click', () => {
        if (transitioning) return;
        transitioning = true;
        const offset = getOffset();
        track.style.transition = 'transform .4s ease';
        track.style.transform = 'translateX(-' + offset + 'px)';
        track.addEventListener('transitionend', function handler() {
            track.removeEventListener('transitionend', handler);
            track.style.transition = 'none';
            track.style.transform = 'translateX(0)';
            track.appendChild(track.firstElementChild);
            transitioning = false;
        });
    });

    prevBtn.addEventListener('click', () => {
        if (transitioning) return;
        transitioning = true;
        const offset = getOffset();
        track.insertBefore(track.lastElementChild, track.firstElementChild);
        track.style.transition = 'none';
        track.style.transform = 'translateX(-' + offset + 'px)';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                track.style.transition = 'transform .4s ease';
                track.style.transform = 'translateX(0)';
                track.addEventListener('transitionend', function handler() {
                    track.removeEventListener('transitionend', handler);
                    transitioning = false;
                });
            });
        });
    });
}

initCarousel('servicesCarousel');
initCarousel('faithCarousel');
