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


// Address validation
const direccionInput = document.getElementById('direccion');
const direccionError = document.getElementById('direccionError');

function validateDireccion(val) {
    val = val.trim();
    if (!val) return ''; // optional field
    if (val.length < 5) return 'La dirección parece demasiado corta.';
    if (!/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(val)) return 'Ingresa una dirección con nombre de calle.';
    if (!/\d/.test(val) && val.split(/\s+/).length < 3) return 'Incluye el número o localidad (ej: Calle Mayor 5, Madrid).';
    return '';
}

function showDireccionState(err) {
    if (err) {
        direccionError.textContent = err;
        direccionError.classList.add('show');
        direccionInput.classList.add('field-invalid');
        direccionInput.classList.remove('field-valid');
    } else if (direccionInput.value.trim()) {
        direccionError.classList.remove('show');
        direccionInput.classList.remove('field-invalid');
        direccionInput.classList.add('field-valid');
    } else {
        direccionError.classList.remove('show');
        direccionInput.classList.remove('field-invalid', 'field-valid');
    }
}

direccionInput.addEventListener('blur', () => showDireccionState(validateDireccion(direccionInput.value)));
direccionInput.addEventListener('input', () => {
    if (direccionInput.classList.contains('field-invalid')) showDireccionState(validateDireccion(direccionInput.value));
});

// Geolocation button
document.getElementById('geoBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
    const btn = document.getElementById('geoBtn');
    btn.classList.add('loading'); btn.disabled = true;
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`, {
                headers: { 'Accept-Language': 'es' }
            });
            const data = await res.json();
            const a = data.address || {};
            const parts = [
                a.road || a.pedestrian || a.footway || a.street,
                a.house_number,
                a.city || a.town || a.village || a.municipality || a.county
            ].filter(Boolean);
            direccionInput.value = parts.join(', ');
            showDireccionState('');
        } catch { alert('No se pudo obtener la dirección. Inténtalo manualmente.'); }
        finally { btn.classList.remove('loading'); btn.disabled = false; }
    }, () => {
        alert('No se pudo acceder a tu ubicación. Verifica los permisos del navegador.');
        btn.classList.remove('loading'); btn.disabled = false;
    }, { timeout: 8000 });
});

// Form submission
const API_URL = 'https://script.google.com/macros/s/AKfycbwD1ysXRGNrelXhj9-x9vKqTwU6I0HqaN7OQa453uz0gnO3dlbc2PQwME-ysfiCfsSo/exec';

// Email / phone cross-validation
const emailInput = document.getElementById('email');
const telefonoInput = document.getElementById('telefono');
const contactError = document.getElementById('contactError');

function validateContact() {
    const hasEmail = emailInput.value.trim() !== '';
    const hasPhone = telefonoInput.value.trim() !== '';
    if (!hasEmail && !hasPhone) {
        contactError.classList.add('show');
        emailInput.classList.add('field-invalid');
        telefonoInput.classList.add('field-invalid');
        return false;
    }
    contactError.classList.remove('show');
    emailInput.classList.remove('field-invalid');
    telefonoInput.classList.remove('field-invalid');
    return true;
}
[emailInput, telefonoInput].forEach(el => el.addEventListener('input', validateContact));

document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Validate email/phone — at least one required
    if (!validateContact()) { emailInput.focus(); return; }
    // Validate address if provided
    const dirErr = validateDireccion(direccionInput.value);
    if (dirErr) { showDireccionState(dirErr); direccionInput.focus(); return; }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const formData = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        direccion: direccionInput.value,
        interes: document.getElementById('interes').value,
        mensaje: document.getElementById('mensaje').value,
        fecha: new Date().toISOString(),
        idioma: document.getElementById('langSelect').value
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
        direccionInput.classList.remove('field-valid');
        document.getElementById('formSuccess').style.display = 'block';
        setTimeout(() => { document.getElementById('formSuccess').style.display = 'none'; }, 5000);
    } catch (err) {
        alert('Hubo un error al enviar el mensaje. Inténtalo de nuevo.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar mensaje';
    }
});

// Language switcher (basic placeholder)
document.getElementById('langSelect').addEventListener('change', (e) => {
    const lang = e.target.value;
    console.log('Language changed to:', lang);
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
