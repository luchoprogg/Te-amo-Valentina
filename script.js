// === RUTEO: VERIFICAR SI HAY DATOS EN LA URL ===
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('data')) {
    document.getElementById('view-result').style.display = 'block';
    loadSurprise();
} else {
    document.getElementById('view-creator').style.display = 'block';
}

// === FUNCIONES DEL CREADOR (BACKOFFICE) ===

// Permite agregar más inputs infinitos para fotos, listas y vales
function addInput(containerId, className, placeholderTxt) {
    const container = document.getElementById(containerId);
    // Limitar a 6 fotos máximo para no saturar
    if(containerId === 'photos-container' && container.children.length >= 6) {
        alert("Máximo 6 fotos permitidas.");
        return;
    }
    const input = document.createElement('input');
    input.type = containerId === 'photos-container' ? 'url' : 'text';
    input.className = `dynamic-input ${className}`;
    input.placeholder = placeholderTxt;
    container.appendChild(input);
}

// Extrae todos los valores de una clase de inputs
function getValuesByClass(className) {
    const inputs = document.querySelectorAll(`.${className}`);
    let values = [];
    inputs.forEach(input => {
        if (input.value.trim() !== '') values.push(input.value.trim());
    });
    return values;
}

function generateLink() {
    const names = document.getElementById('in-names').value;
    const date = document.getElementById('in-date').value;
    const letter = document.getElementById('in-letter').value;
    const map = document.getElementById('in-map').value;
    
    const photos = getValuesByClass('in-photo');
    const reasons = getValuesByClass('in-reason');
    const coupons = getValuesByClass('in-coupon');

    if(!names || !date || photos.length === 0) {
        alert("Faltan datos clave: Nombres, Fecha o al menos 1 Foto.");
        return;
    }

    // Creamos un Objeto con toda la información
    const payload = { n: names, d: date, l: letter, m: map, p: photos, r: reasons, c: coupons };

    // Convertimos a Texto, encriptamos para soportar emojis/tildes y lo hacemos Base64
    const jsonString = JSON.stringify(payload);
    const encodedData = btoa(unescape(encodeURIComponent(jsonString)));

    // Generamos la URL Final
    const baseURL = window.location.origin + window.location.pathname;
    const finalURL = `${baseURL}?data=${encodedData}`;
    
    document.getElementById('generated-url').value = finalURL;
    document.getElementById('link-box').style.display = 'block';
}

function copyLink() {
    const copyText = document.getElementById('generated-url');
    copyText.select();
    document.execCommand('copy');
    alert("¡Link copiado con éxito!");
}


// === FUNCIONES DE LA SORPRESA (PARA ELLA) ===

function loadSurprise() {
    try {
        // Desencriptar datos
        const encodedData = urlParams.get('data');
        const jsonString = decodeURIComponent(escape(atob(encodedData)));
        const data = JSON.parse(jsonString);

        // Inyectar Básicos
        document.getElementById('out-names').innerText = data.n;
        document.getElementById('out-letter').innerText = data.l;
        
        // Inyectar Mapa
        if(data.m) {
            document.getElementById('out-map').src = data.m;
        } else {
            document.getElementById('map-card').style.display = 'none';
        }

        // Inyectar Galería de Fotos (Slider Horizontal)
        const gallery = document.getElementById('out-gallery');
        data.p.forEach(photoUrl => {
            gallery.innerHTML += `<div class="photo-item"><img src="${photoUrl}"></div>`;
        });

        // Inyectar "Cosas que amo"
        const reasonsList = document.getElementById('out-reasons');
        data.r.forEach(reason => {
            reasonsList.innerHTML += `<li>✨ ${reason}</li>`;
        });

        // Inyectar Vales
        const couponsContainer = document.getElementById('out-coupons');
        data.c.forEach(coupon => {
            couponsContainer.innerHTML += `
                <div class="coupon">
                    <span style="font-weight: 600;">🤍 ${coupon}</span>
                    <button class="btn-redeem" onclick="redeemCoupon(this)">Canjear</button>
                </div>
            `;
        });

        // Iniciar Contador
        startCounter(data.d);

    } catch(e) {
        alert("El enlace parece estar roto o incompleto.");
    }
}

function startCounter(dateString) {
    const startDate = new Date(dateString + "T00:00:00");
    setInterval(() => {
        const now = new Date();
        const diff = now - startDate;
        
        const daysTotal = Math.floor(diff / (1000 * 60 * 60 * 24));
        const months = Math.floor(daysTotal / 30.44); 
        const days = Math.floor(daysTotal % 30.44);
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);

        document.getElementById("out-counter-numbers").innerHTML = `${months} meses <br> y ${days} días`;
        document.getElementById("out-counter-time").innerText = `${hours}h ${mins}m ${secs}s`;
    }, 1000);
}

// Interacciones
function redeemCoupon(btn) {
    if(btn.classList.contains('used')) return;
    alert("¡Vale canjeado! Prepárate para cumplirlo 😉");
    btn.innerText = "Canjeado";
    btn.classList.add('used');
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#db2777', '#fbcfe8'] });
}

// Botón que huye
const btnRunaway = document.getElementById('btn-runaway');
function moveButton() {
    const container = document.querySelector('.buttons-container').getBoundingClientRect();
    const maxX = container.width - btnRunaway.offsetWidth;
    const randomX = Math.floor(Math.random() * maxX) - (maxX/2);
    const randomY = Math.floor(Math.random() * 100) - 50;
    btnRunaway.style.transform = `translate(${randomX}px, ${randomY}px)`;
}
btnRunaway.addEventListener('mouseover', moveButton);
btnRunaway.addEventListener('touchstart', (e) => { e.preventDefault(); moveButton(); });

// Confeti Final
function triggerConfetti() {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    document.querySelector('.btn-yes').innerText = "¡Sabía que dirías que sí! ❤️";
    btnRunaway.style.display = "none";
}
