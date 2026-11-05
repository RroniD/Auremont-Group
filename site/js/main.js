/* Auremont Group: page behaviour */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t * t;
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  const YELLOW = '#FFC21A', PAPER = '#EEECE6';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scrolling ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Language ---------- */
  const DICT = window.I18N || { sq: {} };
  // each language has its own page (/ and /en/); the single-file preview switches in place instead
  const PREVIEW = !!window.AUREMONT_PREVIEW;
  let lang = html.lang === 'en' ? 'en' : 'sq';
  if (PREVIEW) { try { const saved = localStorage.getItem('auremont-lang'); if (saved && DICT[saved]) lang = saved; } catch (e) { /* storage blocked */ } }
  const tr = k => (DICT[lang] && DICT[lang][k]) || (DICT.sq[k]) || '';
  const CITY = {
    sq: { peje: 'Pejë', prishtine: 'Prishtinë', prizren: 'Prizren', mitrovice: 'Mitrovicë', gjakove: 'Gjakovë', ferizaj: 'Ferizaj', gjilan: 'Gjilan' },
    en: { peje: 'Peja', prishtine: 'Pristina', prizren: 'Prizren', mitrovice: 'Mitrovica', gjakove: 'Gjakova', ferizaj: 'Ferizaj', gjilan: 'Gjilan' }
  };
  const listeners = [];
  function applyLang(next) {
    lang = DICT[next] ? next : 'sq';
    html.lang = lang;
    $$('[data-i18n]').forEach(el => { const v = tr(el.dataset.i18n); if (v) el.textContent = v; });
    $$('[data-i18n-html]').forEach(el => { const v = tr(el.dataset.i18nHtml); if (v) el.innerHTML = v; });
    $$('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => { const [attr, key] = pair.split(':'); const v = tr(key); if (v) el.setAttribute(attr, v); });
    });
    document.title = tr('meta.title') || document.title;
    const md = $('meta[name="description"]'); if (md) md.setAttribute('content', tr('meta.desc'));
    $$('[data-lang]').forEach(b => { if (b.dataset.lang === lang) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (PREVIEW) { try { localStorage.setItem('auremont-lang', lang); } catch (e) { /* storage blocked */ } }
    listeners.forEach(fn => fn());
    if (applyLang.done) ScrollTrigger.refresh();
    applyLang.done = true;
  }
  $$('[data-lang]').forEach(b => b.addEventListener('click', e => {
    if (b.dataset.lang === lang) { e.preventDefault(); return; }
    if (PREVIEW) { e.preventDefault(); applyLang(b.dataset.lang); if (mmenu && !mmenu.hidden) setMenu(false); return; }
    // keep the visitor at the same section on the other language's page
    if (location.hash) { e.preventDefault(); location.href = b.href.split('#')[0] + location.hash; }
  }));

  /* ---------- Mobile menu ---------- */
  const burger = $('.nav__burger'), mmenu = $('#mmenu');
  function setMenu(open) {
    if (!burger) return;
    burger.setAttribute('aria-expanded', String(open));
    mmenu.hidden = !open;
    if (open) { lenis && lenis.stop(); gsap.fromTo($$('#mmenu li, .mmenu__lang'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power3.out' }); }
    else if (!html.classList.contains('is-intro')) { lenis && lenis.start(); }
  }
  burger && burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mmenu && !mmenu.hidden) setMenu(false); });

  /* ---------- Anchor links ---------- */
  const anchorTarget = { '#fields': ['.card', () => -96], '#top': ['#top', () => 0], '#kosovo': ['#kosovo', () => innerHeight * 1.15] };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    const [sel, offFn] = anchorTarget[hash] || [hash, () => 0];
    const offset = offFn();
    const el = $(sel);
    if (!el) return;
    e.preventDefault();
    setMenu(false);
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.8 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- Hero grid ---------- */
  const gridCanvas = $('.hero__grid');
  if (gridCanvas && window.HeroGrid) window.HeroGrid(gridCanvas);

  /* ---------- Kosovo stages ---------- */
  const K = window.KOSOVO;
  function Stage(sec, mode) {
    const sticky = $('.stage__sticky', sec), svg = $('.stage__svg', sec);
    const shape = $('.stage__shape', sec), fill = $('.stage__fill', sec), gridP = $('.stage__grid', sec);
    const pinsG = $('.stage__pins', sec), cover = $('.stage__cover', sec);
    const disp = $('feDisplacementMap', sec), filterId = $('filter', sec).id;
    const textL = $('.stage__text--l', sec), textR = $('.stage__text--r', sec);
    // the circle-to-Kosovo morph is built the first time it is needed, not at page load
    let morphFn = null;
    const morphAt = t => (morphFn || (morphFn = flubber.interpolate(K.circle, K.path, { maxSegmentLength: 6 })))(t);
    const F = { x: 330, y: 470 }; // zoom focus, between Peja and the centre
    const NS = 'http://www.w3.org/2000/svg';
    let W = 0, H = 0, sb = 1, last = -1, cityEls = [];

    function buildPins() {
      pinsG.textContent = '';
      cityEls = [];
      const names = CITY[lang] || CITY.sq;
      const keys = mode === 'open' ? Object.keys(K.cities) : ['peje'];
      keys.forEach(key => {
        const g = document.createElementNS(NS, 'g');
        const hq = key === 'peje';
        if (hq) {
          const ring = document.createElementNS(NS, 'circle'); ring.setAttribute('r', '15'); ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#0F0F0D'); ring.setAttribute('stroke-width', '1.5');
          ring.setAttribute('class', 'pin-ring'); g.appendChild(ring);
        }
        const dot = document.createElementNS(NS, hq ? 'rect' : 'circle');
        if (hq) { dot.setAttribute('x', '-6'); dot.setAttribute('y', '-6'); dot.setAttribute('width', '12'); dot.setAttribute('height', '12'); }
        else dot.setAttribute('r', '3.5');
        dot.setAttribute('fill', '#0F0F0D'); g.appendChild(dot);
        const t = document.createElementNS(NS, 'text');
        const east = K.cities[key][0] > 700;
        t.setAttribute('x', hq ? '24' : east ? '-9' : '9'); t.setAttribute('y', hq ? '-2' : '4');
        if (east && !hq) t.setAttribute('text-anchor', 'end');
        if (hq) t.setAttribute('class', 'pin-hq-label');
        t.textContent = names[key]; g.appendChild(t);
        if (hq) {
          const s = document.createElementNS(NS, 'text'); s.setAttribute('x', '24'); s.setAttribute('y', '14');
          s.textContent = tr('ks.hq'); g.appendChild(s);
        }
        pinsG.appendChild(g);
        cityEls.push({ g, x: K.cities[key][0], y: K.cities[key][1] });
      });
      if (last >= 0) { const p = last; last = -1; render(p); }
    }

    function resize() {
      W = sticky.clientWidth; H = sticky.clientHeight;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      sb = (W < 700 ? Math.min(W * 1.0, H * 0.55) : Math.min(W * 0.5, H * 0.74)) / 1000;
      const p = last; last = -1; render(p < 0 ? 0 : p);
    }

    function render(p) {
      if (p === last) return; last = p;
      let morph, k, z, ink, cov, pinsA, textA;
      if (mode === 'open') {
        // the about text starts sliding in at p ~ 0.67, so the zoom is finished by then
        const grow = easeOut(clamp(p / 0.16));
        const m = easeInOut(clamp((p - 0.1) / 0.26));
        const zz = easeIn(clamp((p - 0.48) / 0.17));
        morph = m; k = 0.55 * grow + 0.45 * m; z = Math.pow(18, zz);
        ink = 85 * (1 - m);
        cov = clamp((zz - 0.65) / 0.35);
        pinsA = clamp((p - 0.32) / 0.05) * (1 - clamp((p - 0.47) / 0.03));
        textA = clamp((p - 0.3) / 0.06) * (1 - clamp((p - 0.46) / 0.04));
      } else {
        const zz = 1 - easeOut(clamp(p / 0.32));
        const m = easeInOut(clamp((p - 0.52) / 0.2));
        const shrink = easeIn(clamp((p - 0.62) / 0.3));
        morph = 1 - m; z = Math.pow(18, zz);
        k = (1 - 0.5 * m) * (1 - shrink);
        ink = 75 * m;
        cov = 1 - clamp(p / 0.05);
        pinsA = clamp((p - 0.3) / 0.05) * (1 - clamp((p - 0.5) / 0.04));
        textA = clamp((p - 0.28) / 0.06) * (1 - clamp((p - 0.6) / 0.06));
      }
      const d = morph <= 0.001 ? K.circle : morph >= 0.999 ? K.path : morphAt(morph);
      fill.setAttribute('d', d); gridP.setAttribute('d', d);
      const s = Math.max(sb * k, 0.00001);
      const cx = W / 2 + (F.x - 500) * s, cy = H * 0.5 + (F.y - 500) * s;
      shape.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${(s * z).toFixed(5)}) translate(${-F.x} ${-F.y})`);
      if (ink > 0.6) { shape.setAttribute('filter', `url(#${filterId})`); disp.setAttribute('scale', ink.toFixed(1)); }
      else shape.removeAttribute('filter');
      cover.setAttribute('opacity', cov.toFixed(3));
      pinsG.setAttribute('opacity', pinsA.toFixed(3));
      if (pinsA > 0) {
        cityEls.forEach((c, i) => {
          const x = cx + (c.x - F.x) * s * z, y = cy + (c.y - F.y) * s * z;
          c.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          const local = clamp(pinsA * 1.4 - i * 0.06);
          c.g.style.opacity = local;
        });
      }
      textL.style.opacity = textA; textR.style.opacity = textA;
      textL.style.transform = `translateY(${(1 - textA) * 16}px)`;
      textR.style.transform = `translateY(${(1 - textA) * 16}px)`;
    }

    buildPins();
    resize();
    window.addEventListener('resize', resize);
    listeners.push(buildPins);
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: self => render(self.progress), onRefresh: self => render(self.progress) });
  }
  if (K && window.flubber) {
    Stage($('.stage--open'), 'open');
    Stage($('.stage--close'), 'close');
  }

  /* ---------- Tint behind the light sections ---------- */
  // --tint colours the fixed backdrop and the yellow cover at the end of the map zoom
  gsap.fromTo(html, { '--tint': YELLOW }, { '--tint': PAPER, ease: 'none', scrollTrigger: { trigger: '#about', start: 'top 45%', end: 'top top', scrub: true } });
  gsap.fromTo(html, { '--tint': PAPER }, { '--tint': YELLOW, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '#fields', start: 'top 70%', end: 'top 5%', scrub: true } });

  /* ---------- About: word by word ---------- */
  const aboutText = $('.about__text');
  let words = [], aboutP = 0;
  function splitAbout() {
    const txt = aboutText.textContent.trim();
    aboutText.innerHTML = txt.split(/\s+/).map(w => `<span class="w">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
    words = $$('.w', aboutText);
    paintAbout();
  }
  function paintAbout() {
    const n = Math.round(clamp(aboutP * 1.2) * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }
  splitAbout();
  listeners.push(splitAbout);
  ScrollTrigger.create({ trigger: '#about', start: 'top 90%', end: 'bottom bottom', onUpdate: self => { aboutP = self.progress; paintAbout(); } });

  /* ---------- Fields: card in, one field at a time, card out ---------- */
  const rows = $$('.row');
  const idx = $('.card__idx');
  let active = -1;
  function setActive(i) {
    if (i === active) return;
    active = i;
    rows.forEach((r, j) => r.classList.toggle('on', j === i));
    idx.textContent = String(i + 1).padStart(2, '0');
  }
  setActive(0, true);
  // the active field is the last row whose top has passed 60% of the screen
  const pickRow = () => {
    const line = innerHeight * 0.6;
    let i = 0;
    rows.forEach((r, j) => { if (r.getBoundingClientRect().top <= line) i = j; });
    setActive(i);
  };
  ScrollTrigger.create({ trigger: '.rows', start: 'top 60%', end: 'bottom 60%', onUpdate: pickRow, onLeave: pickRow, onLeaveBack: () => setActive(0), onRefresh: pickRow });
  const narrow = () => innerWidth < 700;
  if (!reduce) {
    gsap.fromTo('.card', { rotate: () => (narrow() ? 5 : 8), y: () => (narrow() ? 60 : 140) }, {
      rotate: 0, y: 0, ease: 'none',
      scrollTrigger: { trigger: '.card', start: 'top bottom', end: 'top 12%', scrub: true, invalidateOnRefresh: true }
    });
    gsap.fromTo('.card-wrap', { rotate: 0, y: 0 }, {
      rotate: () => (narrow() ? -4 : -7), y: -80, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: '.card', start: 'bottom 90%', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
    });
  }

  // "Që nga 1990" appears behind the card as it leaves
  if (!reduce) {
    gsap.fromTo('.fields__since', { opacity: 0, y: 90 }, {
      opacity: 1, y: 0, ease: 'none',
      scrollTrigger: { trigger: '.card', start: 'bottom 85%', end: 'bottom 20%', scrub: true }
    });
  }

  /* ---------- Gallery: two rows drifting in opposite directions, click to enlarge ---------- */
  const shots = $$('.shot');
  const marquees = $$('.marquee').map(m => {
    const track = $('.marquee__track', m);
    return { m, track, originals: Array.from(track.children), dir: Number(m.dataset.dir) || -1, x: 0, setW: 0, speed: 1, hover: false, visible: true };
  });
  // one original set plus enough copies to keep the row filled while it loops
  function layoutMarquee(q) {
    Array.from(q.track.children).forEach(c => { if (!q.originals.includes(c)) q.track.removeChild(c); });
    const cloneSet = () => q.originals.forEach(o => {
      const c = o.cloneNode(true);
      c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1;
      q.track.appendChild(c);
    });
    cloneSet();
    q.setW = q.track.children[q.originals.length].offsetLeft - q.originals[0].offsetLeft;
    while (q.track.scrollWidth < q.setW + innerWidth * 1.5) cloneSet();
  }
  function relayoutMarquees() { marquees.forEach(q => { if (q.originals[0].offsetHeight) layoutMarquee(q); }); }
  relayoutMarquees();
  let relayoutT = 0;
  $$('.shot img').forEach(img => {
    if (!img.complete) img.addEventListener('load', () => { clearTimeout(relayoutT); relayoutT = setTimeout(relayoutMarquees, 150); }, { once: true });
  });
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; relayoutMarquees(); } });
  marquees.forEach(q => {
    q.m.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') q.hover = true; });
    q.m.addEventListener('pointerleave', () => { q.hover = false; });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { q.visible = es[0].isIntersecting; }).observe(q.m);
  });
  if (!reduce) {
    let boost = 0;
    gsap.ticker.add((t, dt) => {
      // drifts slowly, speeds up a little while the page scrolls, eases to a stop under the mouse
      const v = lenis ? Math.abs(lenis.velocity || 0) : 0;
      boost += (Math.min(v * 0.08, 3) - boost) * 0.06;
      marquees.forEach(q => {
        q.speed += ((q.hover ? 0 : 1) - q.speed) * 0.08;
        if (!q.visible || !q.setW) return;
        q.x += q.dir * 0.04 * (q.speed + boost * q.speed) * Math.min(dt, 50);
        q.x = -(((-q.x % q.setW) + q.setW) % q.setW);
        q.track.style.transform = `translate3d(${q.x.toFixed(2)}px,0,0)`;
      });
    });
  }

  const lb = $('.lb'), lbImg = $('.lb__img'), lbCount = $('.lb__count');
  let lbIndex = 0;
  function showShot(i, dir) {
    lbIndex = (i + shots.length) % shots.length;
    const src = $('img', shots[lbIndex]);
    const swap = () => {
      lbImg.src = src.dataset.full || src.currentSrc || src.src; lbImg.alt = src.alt;
      lbCount.textContent = `${String(lbIndex + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
    };
    if (!dir || reduce) { swap(); return; }
    gsap.timeline()
      .to(lbImg, { x: -dir * 40, opacity: 0, duration: 0.18, ease: 'power2.in' })
      .add(swap)
      .fromTo(lbImg, { x: dir * 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  }
  function openLb(i) {
    showShot(i);
    if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
    lenis && lenis.stop();
    if (!reduce) gsap.fromTo(lbImg, { scale: 0.94, opacity: 0, x: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' });
  }
  const closeLb = () => {
    if (lb.close) lb.close();
    else { lb.removeAttribute('open'); lenis && lenis.start(); }
  };
  lb.addEventListener('close', () => { lenis && lenis.start(); });
  $('.gallery__rows').addEventListener('click', e => {
    const b = e.target.closest('.shot');
    if (b) openLb(Number(b.dataset.i));
  });
  $('.lb__close').addEventListener('click', closeLb);
  $('.lb__prev').addEventListener('click', () => showShot(lbIndex - 1, -1));
  $('.lb__next').addEventListener('click', () => showShot(lbIndex + 1, 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb__fig')) closeLb(); });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') showShot(lbIndex + 1, 1);
    if (e.key === 'ArrowLeft') showShot(lbIndex - 1, -1);
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 50) showShot(lbIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  /* ---------- Contact: map + form ---------- */
  // the rendered street map of Peja sits underneath; the live Google map loads on top of it
  // Google Maps can set cookies, so it loads only after the visitor allows it (cookie banner or the button on the map)
  const mapFrame = $('.map__frame'), mapConsent = $('.map__consent');
  const consent = window.AuremontConsent;
  if (PREVIEW || !consent) {
    mapFrame.remove();
  } else {
    let io = null;
    const loadMap = () => {
      if (mapFrame.firstChild) return;
      const f = document.createElement('iframe');
      f.src = mapFrame.dataset.src; f.loading = 'lazy'; f.title = 'Google Maps · Auremont Group';
      f.referrerPolicy = 'no-referrer-when-downgrade'; f.setAttribute('allowfullscreen', '');
      mapFrame.appendChild(f);
    };
    const syncMap = () => {
      const ok = consent.has('maps');
      mapConsent.hidden = ok;
      if (!ok) { mapFrame.textContent = ''; if (io) { io.disconnect(); io = null; } return; }
      if (mapFrame.firstChild || io) return;
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { loadMap(); io.disconnect(); } }, { rootMargin: '800px 0px' });
        io.observe(mapFrame);
      } else loadMap();
    };
    $('.map__load').addEventListener('click', () => consent.allow('maps'));
    document.addEventListener('auremont:consent', syncMap);
    syncMap();
  }
  if (!reduce) {
    gsap.fromTo('.map', { '--r': '6%' }, { '--r': '80%', ease: 'none', scrollTrigger: { trigger: '.map', start: 'top 95%', end: 'top 30%', scrub: true } });
  }

  const form = $('#form'), note = $('.form__note');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const req = ['#f-name', '#f-contact', '#f-msg'].map(s => $(s));
    let ok = true;
    req.forEach(el => { const bad = !el.value.trim(); el.setAttribute('aria-invalid', String(bad)); if (bad) ok = false; });
    if (!ok) { note.textContent = tr('form.err'); req.find(el => !el.value.trim()).focus(); return; }
    const field = $('#f-field');
    const body = [
      `${tr('form.name')}: ${$('#f-name').value.trim()}`,
      `${tr('form.contact')}: ${$('#f-contact').value.trim()}`,
      field.value || field.selectedIndex > 0 ? `${tr('form.field')}: ${field.options[field.selectedIndex].text}` : '',
      '',
      $('#f-msg').value.trim()
    ].filter((l, i) => l !== '' || i === 3).join('\n');
    const href = `mailto:info@auremont-group.com?subject=${encodeURIComponent(tr('form.subject') + ' · ' + $('#f-name').value.trim())}&body=${encodeURIComponent(body)}`;
    note.textContent = tr('form.ok');
    if (window.AuremontConsent) AuremontConsent.track('generate_lead', { form: 'contact', field: field.selectedIndex > 0 ? field.options[field.selectedIndex].text : '' });
    window.location.href = href;
  });
  $$('#form input, #form textarea').forEach(el => el.addEventListener('input', () => el.removeAttribute('aria-invalid')));

  /* ---------- Active nav link ---------- */
  ['about', 'fields', 'gallery', 'contact'].forEach(id => {
    const links = $$(`.nav__links a[href="#${id}"]`);
    ScrollTrigger.create({ trigger: '#' + id, start: 'top 50%', end: 'bottom 50%', onToggle: self => links.forEach(a => a.classList.toggle('is-active', self.isActive)) });
  });

  const fy = $('.foot__year'); if (fy) fy.textContent = new Date().getFullYear();
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (a && window.AuremontConsent) AuremontConsent.track('contact_click', { method: a.protocol === 'tel:' ? 'phone' : 'email' });
  });

  /* ---------- Intro: wordmark big, then into the menu ---------- */
  function runIntro() {
    const intro = $('.intro'), bm = $('.intro__mark'), bw = $('.intro__word');
    const nav = $('.nav'), nb = $('.nav__brand'), nm = $('.nav__mark'), nw = $('.nav__word'), nbg = $('.nav__bg');
    const links = $$('.nav__links a, .nav__burger'), langEl = $('.lang');
    const heroBits = $$('.hero__title, .hero__cue');
    let finished = false, flyTl = null;
    function finish() {
      if (finished) return; finished = true;
      html.classList.remove('is-intro');
      gsap.set([nb, nbg, langEl].concat(links, heroBits), { clearProps: 'opacity,transform,visibility' });
      gsap.set(nav, { opacity: 1 });
      if (intro) intro.remove();
      lenis && lenis.start();
      ScrollTrigger.refresh();
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => window.removeEventListener(ev, skip));
    }
    function skip() { tl.timeScale(5); if (flyTl) flyTl.timeScale(3); }
    if (reduce || !intro) { finish(); return; }
    lenis && lenis.stop();
    gsap.set(nav, { opacity: 1 });
    gsap.set(nb, { opacity: 0 });
    gsap.set(nbg, { opacity: 0, scaleX: 0.35 });
    gsap.set(links, { opacity: 0, y: -8 });
    gsap.set(langEl, { opacity: 0 });
    gsap.set(heroBits, { opacity: 0 });
    function fly() {
      const r1 = bm.getBoundingClientRect(), r2 = nm.getBoundingClientRect();
      const r3 = bw.getBoundingClientRect(), r4 = nw.getBoundingClientRect();
      flyTl = gsap.timeline({ onComplete: () => { gsap.set(nb, { opacity: 1 }); finish(); } });
      flyTl
        .to(bm, { x: r2.left - r1.left, y: r2.top - r1.top, scale: r2.width / r1.width, transformOrigin: '0 0', duration: 1.25, ease: 'expo.inOut' }, 0)
        .to(bw, { x: r4.left - r3.left, y: r4.top - r3.top, scale: r4.width / r3.width, transformOrigin: '0 0', duration: 1.25, ease: 'expo.inOut' }, 0.05)
        .to(nbg, { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power3.out' }, 0.75)
        .to(links, { opacity: 1, y: 0, stagger: 0.05, duration: 0.6, ease: 'power3.out' }, 0.9)
        .to(langEl, { opacity: 1, duration: 0.6 }, 0.95)
        .fromTo('.hero__title', { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.55)
        .fromTo('.hero__cue', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.05);
    }
    const tl = gsap.timeline();
    tl.fromTo(bm, { opacity: 0, y: 30, clipPath: 'inset(100% 0% 0% 0%)' }, { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.out' }, 0.15)
      .fromTo(bw, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power3.inOut' }, 0.4)
      .fromTo('.hero__grid', { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.3)
      .add(fly, '+=0.15');
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(ev => window.addEventListener(ev, skip, { passive: true }));
    setTimeout(finish, 8000);
  }

  applyLang(lang);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  runIntro();
})();
