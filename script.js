const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('data')) {
    document.getElementById('view-result').style.display = 'block';
    loadSurprise();
} else {
    document.getElementById('view-creator').style.display = 'block';
}

function addInput(containerId, className, placeholderTxt) {
    const container = document.getElementById(containerId);
    if(containerId === 'photos-container' && container.children.length >= 6) {
        alert("Máximo 6 fotos permitidas."); return;
    }
    const input = document.createElement('input');
    input.type = containerId === 'photos-container' ? 'url' : 'text';
    input.className = `dynamic-input ${className}`;
    input.placeholder = placeholderTxt;
    container.appendChild(input);
}

function getValuesByClass(className) {
    let values = [];
    document.querySelectorAll(`.${className}`).forEach(input => {
        if (input.value.trim() !== '') values.push(input.value.trim());
    });
    return values;
}

function generateLink() {
    const names = document.getElementById('in-names').value;
    const date = document.getElementById('in-date').value;
    const letter = document.getElementById('in-letter').value;
    const youtube = document.getElementById('in-youtube').value;
    const photos = getValuesByClass('in-photo');
    const reasons = getValuesByClass('in-reason');
    const coupons = getValuesByClass('in-coupon');

    if(!names || !date || photos.length === 0) {
        alert("Faltan datos clave: Nombres, Fecha o al menos 1 Foto."); return;
    }

    const payload = { n: names, d: date, l: letter, y: youtube, p: photos, r: reasons, c: coupons };
    const jsonString = JSON.stringify(payload);
    const encodedData = btoa(unescape(encodeURIComponent(jsonString)));

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


function loadSurprise() {
    try {
        const jsonString = decodeURIComponent(escape(atob(urlParams.get('data'))));
        const data = JSON.parse(jsonString);

        // 1. Textos
        document.getElementById('out-names').innerText = data.n;
        document.getElementById('out-letter').innerText = data.l;
        
        // 2. Extractor de YouTube
        if(data.y) {
            let videoId = "";
            if (data.y.includes('youtu.be/')) videoId = data.y.split('youtu.be/')[1].split('?')[0];
            else if (data.y.includes('youtube.com/watch')) videoId = new URLSearchParams(data.y.split('?')[1]).get('v');
            
            if(videoId) {
                // Añadimos autoplay
                document.getElementById('out-youtube').src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0`;
            } else {
                document.getElementById('youtube-card').style.display = 'none';
            }
        } else {
            document.getElementById('youtube-card').style.display = 'none';
        }

        // 3. Distribución de Fotos hacia abajo
        if (data.p.length > 0) {
            document.getElementById('out-photo-main').src = data.p[0]; // La foto 1 va arriba con el contador
            
            // Si hay más fotos, se crean tarjetas nuevas hacia abajo
            const extraPhotosContainer = document.getElementById('extra-photos');
            for(let i = 1; i < data.p.length; i++) {
                extraPhotosContainer.innerHTML += `
                    <div class="card" data-aos="fade-up" data-aos-duration="1000">
                        <div class="polaroid-img-container">
                            <img src="${data.p[i]}">
                        </div>
                    </div>
                `;
            }
        }

        // 4. Razones
        const reasonsList = document.getElementById('out-reasons');
        data.r.forEach(reason => { reasonsList.innerHTML += `<li>✨ ${reason}</li>`; });

        // 5. Vales
        const couponsContainer = document.getElementById('out-coupons');
        data.c.forEach(coupon => {
            couponsContainer.innerHTML += `
                <div class="coupon">
                    <span style="font-weight: 600;">🤍 ${coupon}</span>
                    <button class="btn-redeem" onclick="redeemCoupon(this)">Canjear</button>
                </div>
            `;
        });

        startCounter(data.d);

        // Iniciar animaciones AOS al terminar de inyectar todo
        setTimeout(() => { AOS.init({ once: false }); }, 300);

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
    const randomY = Math.floor(Math.random() * 80) - 40;
    btnRunaway.style.transform = `translate(${randomX}px, ${randomY}px)`;
}
btnRunaway.addEventListener('mouseover', moveButton);
btnRunaway.addEventListener('touchstart', (e) => { e.preventDefault(); moveButton(); });

function triggerConfetti() {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    document.querySelector('.btn-yes').innerText = "¡Sabía que dirías que sí! ❤️";
    btnRunaway.style.display = "none";
}
