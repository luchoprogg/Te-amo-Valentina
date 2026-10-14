'use strict';
/* ==========================================================================
   Sorpresa de amor · script.js
   Módulos: Utils · Store · ImageTools · DynamicList · Modal · Effects ·
            Counter · CreatorView · ResultView · Ask · App
   Los textos del usuario se insertan SIEMPRE con textContent (sin innerHTML).
   ========================================================================== */

/* ---------- Utils: helpers compartidos ---------- */
const $ = (s, r = document) => r.querySelector(s);
/** Crea un elemento: h('div', {className:'x'}, hijo1, hijo2) */
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

const Utils = {
  /** 'YYYY-MM-DD' → Date local (new Date('YYYY-MM-DD') usa UTC y puede desfasar un día) */
  parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  /** Acepta el <iframe> completo o solo la URL. Devuelve la URL únicamente si es de Google Maps. */
  parseMap(raw) {
    const url = ((raw.match(/src\s*=\s*["']([^"']+)["']/i) || [])[1] || raw).trim().replace(/&amp;/g, '&');
    return /^https:\/\/(www\.|maps\.)?google\.(com|com\.[a-z]{2}|[a-z]{2,3})\/maps/i.test(url) ? url : '';
  },
  /** Imagen de reemplazo si no se subió foto */
  PLACEHOLDER: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23fbd0e2'/%3E%3Cpath transform='translate(140 140) scale(5)' fill='%23d6247a' d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E",
};

/* ---------- Store: localStorage con manejo de errores ---------- */
const Store = {
  KEY: 'sorpresa-amor:v1',
  /** Devuelve los datos guardados o null (JSON corrupto, vacío o almacenamiento bloqueado) */
  load() {
    try { const d = JSON.parse(localStorage.getItem(this.KEY)); return d && d.n1 && d.n2 && d.date ? d : null; }
    catch { return null; }
  },
  /** @returns {{ok:boolean,error?:string}} */
  save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); return { ok: true }; }
    catch (e) {
      return { ok: false, error: /quota/i.test(e && e.name)
        ? 'No hay espacio suficiente en el navegador. Prueba con una foto más ligera.'
        : 'No se pudo guardar (¿modo privado o almacenamiento bloqueado?).' };
    }
  },
  clear() { try { localStorage.removeItem(this.KEY); } catch { /* sin acceso: nada que borrar */ } },
};

/* ---------- ImageTools: FileReader → Base64 reducido ---------- */
const ImageTools = {
  MAX_BYTES: 10 * 1024 * 1024, // rechaza archivos de origen enormes
  MAX_SIDE: 900,               // lado máximo tras reducir (px)
  /** File → Promise<string> con un JPEG en Base64 de poco peso (suele ser < 250 KB) */
  async process(file) {
    if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
    if (file.size > this.MAX_BYTES) throw new Error('La imagen pesa más de 10 MB. Elige una más ligera.');
    const src = await new Promise((ok, fail) => {
      const r = new FileReader();
      r.onload = () => ok(r.result);
      r.onerror = () => fail(new Error('No se pudo leer la imagen.'));
      r.readAsDataURL(file);
    });
    const img = await new Promise((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error('Formato de imagen no compatible. Usa JPG o PNG.'));
      i.src = src;
    });
    const k = Math.min(1, this.MAX_SIDE / Math.max(img.width, img.height));
    const c = h('canvas', { width: Math.round(img.width * k), height: Math.round(img.height * k) });
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // fondo blanco para PNG transparentes
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  },
};

/* ---------- DynamicList: inputs que se añaden/quitan (mín. y máx.) ---------- */
class DynamicList {
  constructor(box, addBtn, { min, max, hint }) {
    Object.assign(this, { box, addBtn, min, max, hint });
    addBtn.addEventListener('click', () => { this.add(); this.box.lastElementChild.firstChild.focus(); });
    box.addEventListener('click', e => {
      const x = e.target.closest('.rm');
      if (x && box.children.length > min) { x.parentElement.remove(); this.sync(); }
    });
    this.set([]);
  }
  add(value = '') {
    if (this.box.children.length >= this.max) return;
    const rm = h('button', { type: 'button', className: 'rm', textContent: '×' });
    rm.setAttribute('aria-label', 'Quitar');
    this.box.append(h('div', { className: 'dyn-row' },
      h('input', { value, maxLength: 80, placeholder: this.hint, autocomplete: 'off' }), rm));
    this.sync();
  }
  /** Reemplaza el contenido; siempre muestra al menos `min` filas */
  set(values) {
    this.box.replaceChildren();
    for (let i = 0; i < Math.max(this.min, values.length); i++) this.add(values[i] || '');
  }
  sync() {
    const n = this.box.children.length;
    this.addBtn.hidden = n >= this.max;
    this.box.classList.toggle('locked', n <= this.min);
  }
  get values() { return [...this.box.querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean); }
}

/* ---------- Modal: ventana limpia reutilizable ---------- */
const Modal = {
  el: $('#modal'),
  open(emoji, title, text) {
    $('#m-emoji').textContent = emoji; $('#m-title').textContent = title; $('#m-text').textContent = text;
    this.el.classList.add('show'); $('#m-close').focus();
  },
  close() { this.el.classList.remove('show'); },
  init() {
    $('#m-close').addEventListener('click', () => this.close());
    this.el.addEventListener('click', e => e.target === this.el && this.close());
    addEventListener('keydown', e => e.key === 'Escape' && this.close());
  },
};

/* ---------- Effects: confeti (canvas-confetti) ---------- */
const Effects = {
  /** big = false → ráfaga corta (vales) · big = true → lluvia masiva (botón "Sí") */
  confetti(big = false) {
    if (typeof confetti !== 'function') return; // la CDN no cargó: la app sigue funcionando
    const o = { colors: ['#d6247a', '#ff7eb6', '#ffc2dc', '#ffd166', '#ffffff'], disableForReducedMotion: true };
    if (!big) return confetti({ ...o, particleCount: 80, spread: 75, origin: { y: .7 } });
    confetti({ ...o, particleCount: 180, spread: 120, startVelocity: 45, origin: { y: .6 } });
    const end = Date.now() + 2500;
    (function frame() {
      confetti({ ...o, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: .8 } });
      confetti({ ...o, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: .8 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  },
};

/* ---------- Counter: tiempo transcurrido (meses de calendario exactos) ---------- */
const Counter = {
  timer: null,
  addMonths(f, n) { // suma meses sin desbordar (31 ene + 1 mes = 28/29 feb)
    const r = new Date(f); r.setDate(1); r.setMonth(r.getMonth() + n);
    r.setDate(Math.min(f.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
    return r;
  },
  start(since) {
    const boxes = [...document.querySelectorAll('.count b')];
    const tick = () => {
      const now = new Date(Math.max(Date.now(), since));
      let m = (now.getFullYear() - since.getFullYear()) * 12 + now.getMonth() - since.getMonth();
      if (this.addMonths(since, m) > now) m--;
      let ms = now - this.addMonths(since, m);
      const v = [m];
      for (const u of [864e5, 36e5, 6e4, 1e3]) { v.push(Math.floor(ms / u)); ms %= u; } // días, h, min, s
      boxes.forEach((b, i) => b.textContent = i < 2 ? v[i] : String(v[i]).padStart(2, '0'));
    };
    this.stop(); tick(); this.timer = setInterval(tick, 1000);
  },
  stop() { clearInterval(this.timer); },
};

/* ---------- CreatorView: Vista 1 (formulario) ---------- */
const CreatorView = {
  photo: '', // Base64 de la foto ya reducida
  init() {
    this.loves = new DynamicList($('#loves'), $('#add-love'), { min: 4, max: 5, hint: 'Ej.: Tu risa cuando despiertas' });
    this.vouchers = new DynamicList($('#vouchers'), $('#add-voucher'), { min: 3, max: 5, hint: 'Ej.: Vale por una cena romántica' });
    $('#photo').addEventListener('change', e => this.onPhoto(e.target.files[0]));
    $('#form').addEventListener('submit', e => { e.preventDefault(); this.submit(); });
    $('#reset').addEventListener('click', () => { if (confirm('¿Borrar todo y empezar de cero?')) { Store.clear(); this.reset(); } });
  },
  async onPhoto(file) {
    if (!file) return;
    try {
      this.photo = await ImageTools.process(file);
      $('#thumb img').src = this.photo; $('#thumb').hidden = false; this.error('');
    } catch (err) {
      this.photo = ''; $('#thumb').hidden = true; $('#photo').value = ''; this.error(err.message);
    }
  },
  collect() {
    const v = s => $(s).value.trim();
    return { n1: v('#n1'), n2: v('#n2'), date: $('#date').value, photo: this.photo, letter: v('#letter'),
             loves: this.loves.values, vouchers: this.vouchers.values, map: Utils.parseMap(v('#map')) };
  },
  /** @returns {string} mensaje de error, o '' si todo está bien */
  validate(d) {
    if (!d.n1 || !d.n2) return 'Escribe los dos nombres.';
    if (!d.date) return 'Elige la fecha de inicio de la relación.';
    if (Utils.parseDate(d.date) > new Date()) return 'La fecha no puede estar en el futuro.';
    if (d.letter.length < 10) return 'Escribe tu carta (aunque sea corta).';
    if (d.loves.length < 4) return 'Escribe al menos 4 cosas que amas de esa persona.';
    if (d.vouchers.length < 3) return 'Crea al menos 3 vales de amor.';
    if ($('#map').value.trim() && !d.map) return 'El mapa no es válido. Pega el código <iframe> de Google Maps.';
    return '';
  },
  submit() {
    const d = this.collect(), msg = this.validate(d);
    if (msg) return this.error(msg);
    const r = Store.save(d);
    if (!r.ok) return this.error(r.error);
    App.show('result', d);
  },
  /** Rellena el formulario con datos guardados (para poder editar) */
  fill(d) {
    [['#n1', d.n1], ['#n2', d.n2], ['#date', d.date], ['#letter', d.letter], ['#map', d.map]].forEach(([s, val]) => $(s).value = val);
    this.photo = d.photo; $('#thumb').hidden = !d.photo;
    if (d.photo) $('#thumb img').src = d.photo;
    this.loves.set(d.loves); this.vouchers.set(d.vouchers);
  },
  reset() {
    $('#form').reset(); this.photo = ''; $('#thumb').hidden = true;
    this.loves.set([]); this.vouchers.set([]); this.error('');
  },
  error(msg) {
    const e = $('#error'); e.textContent = msg; e.hidden = !msg;
    if (msg) e.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
};

/* ---------- ResultView: Vista 2 (la sorpresa) ---------- */
const ResultView = {
  render(d) {
    const since = Utils.parseDate(d.date);
    $('#r-title').textContent = `${d.n1} & ${d.n2}`;
    $('#r-photo').src = d.photo || Utils.PLACEHOLDER;
    $('#r-since').textContent = 'Juntos desde el ' + since.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
    $('#r-letter').textContent = d.letter;
    $('#r-sign').textContent = `Con amor, ${d.n1}`;
    $('#r-loves').replaceChildren(...d.loves.map(t => h('li', { textContent: t })));

    // Mapa: el iframe se construye aquí con la URL ya validada (nunca se inyecta HTML pegado)
    $('#r-map-box').hidden = !d.map;
    $('#r-map').replaceChildren(...(d.map ? [h('iframe', {
      src: d.map, title: 'Mapa de nuestro lugar especial', loading: 'lazy',
      referrerPolicy: 'no-referrer-when-downgrade', allowFullscreen: true })] : []));

    // Vales: al canjear → confeti + botón gris deshabilitado + modal
    $('#r-vouchers').replaceChildren(...d.vouchers.map(text => {
      const btn = h('button', { type: 'button', className: 'cta', textContent: 'Canjear' });
      const card = h('div', { className: 'voucher' }, h('span', { textContent: text }), btn);
      btn.addEventListener('click', () => {
        btn.disabled = true; btn.textContent = 'Canjeado'; card.classList.add('used');
        Effects.confetti(); Modal.open('🎟️', '¡Vale canjeado!', text);
      });
      return card;
    }));
    Counter.start(since);
  },
};

/* ---------- Ask: pregunta final (el "No" huye) ---------- */
const Ask = {
  init() {
    const yes = $('#yes'), no = $('#no');
    yes.addEventListener('click', () => {
      Effects.confetti(true);
      Modal.open('💖', '¡Sabía que dirías que sí!', 'Gracias por hacerme tan feliz. Te amo.');
    });
    const dodge = e => {
      e.preventDefault(); // en táctil evita el click fantasma tras touchstart
      const w = no.offsetWidth, hgt = no.offsetHeight, m = 16, s = yes.getBoundingClientRect();
      let x, y, n = 0;
      do { // posición fija aleatoria dentro de la pantalla, sin tapar al "Sí"
        x = m + Math.random() * (innerWidth - w - 2 * m);
        y = m + Math.random() * (innerHeight - hgt - 2 * m);
      } while (++n < 25 && x < s.right + 12 && x + w > s.left - 12 && y < s.bottom + 12 && y + hgt > s.top - 12);
      no.classList.add('run'); no.style.left = x + 'px'; no.style.top = y + 'px';
    };
    ['mouseover', 'touchstart', 'click'].forEach(ev => no.addEventListener(ev, dodge, { passive: false }));
    // Al salir de la sección, el botón vuelve a su sitio
    new IntersectionObserver(([en]) => { if (!en.isIntersecting) no.classList.remove('run'); }).observe($('#ask'));
  },
};

/* ---------- App: controlador de vistas ---------- */
const App = {
  /** Muestra una sola vista: 'creator' | 'result' */
  show(name, data) {
    document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== `view-${name}`);
    const view = $(`#view-${name}`);
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); // reinicia el fade-in
    scrollTo(0, 0);
    if (name === 'result') { ResultView.render(data); window.AOS && AOS.refreshHard(); }
    else Counter.stop();
  },
  init() {
    Modal.init(); CreatorView.init(); Ask.init();
    window.AOS && AOS.init({ duration: 800, once: true, offset: 50,
      disable: () => matchMedia('(prefers-reduced-motion: reduce)').matches });
    $('#edit').addEventListener('click', () => { const d = Store.load(); if (d) CreatorView.fill(d); this.show('creator'); });
    const saved = Store.load();
    if (saved) { CreatorView.fill(saved); this.show('result', saved); } else this.show('creator');
  },
};

App.init(); // el script usa "defer": el DOM ya está listo
