/* Hero background: a welded rebar mesh across the whole screen.
   Around the pointer (or a slowly wandering point on touch screens) the mesh bulges
   towards the viewer and lights up yellow. */
window.HeroGrid = function (canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ANGLE = -0.36;              // mesh rotation (radians)
  const LEVELS = 8;
  let W = 0, H = 0, dpr = 1, S = 64, cols = 0, rows = 0, ox = 0, oy = 0;
  let base = null, pts = null, running = false, raf = 0;
  const t0 = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, last: -1e9 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S = Math.max(46, Math.min(70, Math.min(W, H) / 11));
    const diag = Math.hypot(W, H) * 1.15;
    cols = Math.ceil(diag / S) + 2; rows = cols;
    ox = W / 2; oy = H / 2;
    base = new Float32Array((cols + 1) * (rows + 1) * 2);
    pts = new Float32Array((cols + 1) * (rows + 1) * 3);
    const c = Math.cos(ANGLE), s = Math.sin(ANGLE);
    let n = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const u = (i - cols / 2) * S, v = (j - rows / 2) * S;
        base[n++] = ox + u * c - v * s;
        base[n++] = oy + u * s + v * c;
      }
    }
    if (!pointer.x) { pointer.x = pointer.tx = W * 0.5; pointer.y = pointer.ty = H * 0.42; }
    if (!running) draw(performance.now());
  }

  function compute(t) {
    const sigma = Math.max(110, Math.min(W, H) * 0.21);
    const s2 = 2 * sigma * sigma, l2 = 2 * (sigma * 0.95) * (sigma * 0.95);
    const A = 0.45;
    let n = 0, b = 0;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        let x = base[b++], y = base[b++];
        // slow breathing so the mesh never looks frozen
        x += Math.sin(y * 0.006 + t * 0.5) * 3;
        y += Math.cos(x * 0.006 + t * 0.4) * 3;
        const dx = x - pointer.x, dy = y - pointer.y, r2 = dx * dx + dy * dy;
        const m = 1 + A * Math.exp(-r2 / s2);
        pts[n++] = pointer.x + dx * m;
        pts[n++] = pointer.y + dy * m;
        pts[n++] = Math.exp(-r2 / l2);
      }
    }
  }

  const styles = [];
  for (let l = 0; l < LEVELS; l++) {
    const a = l / (LEVELS - 1);
    const mix = Math.min(1, a * 1.5);
    const g = Math.round(255 - 61 * mix), bl = Math.round(255 - 229 * mix);
    styles.push({ c: `rgba(255,${g},${bl},${(0.12 + a * 0.83).toFixed(3)})`, w: 1 + a * 1.3 });
  }

  function draw(now) {
    const t = reduce ? 0 : (now - t0) / 1000;
    if (now - pointer.last > 2600 && !reduce) {
      pointer.tx = W * (0.5 + 0.22 * Math.sin(t * 0.21));
      pointer.ty = H * (0.42 + 0.14 * Math.sin(t * 0.33 + 1));
    }
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    compute(t);
    ctx.clearRect(0, 0, W, H);
    const buckets = Array.from({ length: LEVELS }, () => []);
    const stride = cols + 1;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const a = (j * stride + i) * 3;
        if (i < cols) { const b = a + 3; buckets[Math.min(LEVELS - 1, Math.floor(((pts[a + 2] + pts[b + 2]) / 2) * LEVELS))].push(a, b); }
        if (j < rows) { const b = a + stride * 3; buckets[Math.min(LEVELS - 1, Math.floor(((pts[a + 2] + pts[b + 2]) / 2) * LEVELS))].push(a, b); }
      }
    }
    for (let l = 0; l < LEVELS; l++) {
      const list = buckets[l]; if (!list.length) continue;
      ctx.beginPath();
      for (let m = 0; m < list.length; m += 2) {
        const a = list[m], b = list[m + 1];
        ctx.moveTo(pts[a], pts[a + 1]); ctx.lineTo(pts[b], pts[b + 1]);
      }
      ctx.strokeStyle = styles[l].c; ctx.lineWidth = styles[l].w; ctx.stroke();
    }
    for (let n = 0; n < pts.length; n += 3) {
      const x = pts[n], y = pts[n + 1];
      if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
      const k = pts[n + 2];
      if (k > 0.08) {
        const s = 3 + k * 5;
        ctx.fillStyle = `rgba(255,194,26,${Math.min(1, 0.25 + k).toFixed(3)})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
  }

  function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const move = (x, y) => {
    const r = canvas.getBoundingClientRect();
    pointer.tx = x - r.left; pointer.ty = y - r.top; pointer.last = performance.now();
    if (reduce) { pointer.x = pointer.tx; pointer.y = pointer.ty; draw(performance.now()); }
  };
  window.addEventListener('pointermove', e => move(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => { if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('resize', resize);
  resize();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop()))).observe(canvas);
  } else start();
  return { start, stop, resize };
};
