// نخ بده — live touches on the board (fountains, water, smoke, flags, light, clouds, gulls).
// Pure overlay: nothing here changes the map picture. Every position is a percentage of
// the board image, and every size is in cqw (a percent of the board width), so the layer
// scales with the camera. Zones only animate while they are on screen.
(function(){
  // [name, top %, height %] — a zone's children are placed relative to it
  const ZONES = {
    sea:   [93.5, 6.5],
    shiraz:[66, 11],
    isf:   [50, 10],
    mosque:[46.5, 4],
    rasht: [30, 8],
    gilan: [21, 9],
    tehran:[0, 15],
    sky:   [0, 100]
  };

  function rng(seed){
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const R = rng(20241);
  const f2 = n => n.toFixed(2);
  const pos = (z, x, y) => `left:${f2(x)}%;top:${f2((y - ZONES[z][0]) / ZONES[z][1] * 100)}%;`;
  const inside = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];

  // twinkles and drifting streaks scattered over a patch of water
  function water(z, rect, n, skip, streaks){
    let out = '';
    const pick = () => {
      for(let i = 0; i < 12; i++){
        const x = rect[0] + R() * (rect[2] - rect[0]), y = rect[1] + R() * (rect[3] - rect[1]);
        if(!(skip || []).some(r => inside(x, y, r))) return [x, y];
      }
      return null;
    };
    for(let i = 0; i < n; i++){
      const p = pick(); if(!p) continue;
      out += `<i class="fx-sp" style="${pos(z, p[0], p[1])}--d:${f2(R() * 4)}s;--t:${f2(2.2 + R() * 2.4)}s;--s:${f2(.8 + R() * 1)}cqw"></i>`;
    }
    for(let i = 0; i < (streaks || 0); i++){
      const p = pick(); if(!p) continue;
      out += `<i class="fx-fl" style="${pos(z, p[0], p[1])}--d:${f2(R() * 6)}s;--t:${f2(5 + R() * 3)}s"></i>`;
    }
    return out;
  }

  function fount(z, x, y, h){
    let d = '';
    for(let i = 0; i < 7; i++){
      const dx = (R() - .5) * h * .9;
      d += `<i class="d" style="--dx:${f2(dx)}cqw;--dl:${f2(i * .17)}s"></i>`;
    }
    return `<div class="fx-fount" style="${pos(z, x, y)}--h:${h}cqw"><i class="j"></i>${d}<i class="r"></i><i class="r" style="animation-delay:1s"></i></div>`;
  }
  const smoke = (z, x, y) => `<div class="fx-smoke" style="${pos(z, x, y)}">${[0, 1, 2, 3].map(i => `<i style="--dl:${i}s"></i>`).join('')}</div>`;
  const flag = (z, x, y, w) => `<i class="fx-flag" style="${pos(z, x, y)}width:${w}cqw;height:${f2(w * .56)}cqw;margin-top:-${f2(w * .28)}cqw"></i>`;
  const rip = (z, x, y, w, dl) => `<i class="fx-rip" style="${pos(z, x, y)}--w:${w}cqw;animation-delay:${dl}s"></i>`;
  const zone = (name, inner) => `<div class="fx-z${name === 'sky' ? ' is-live' : ''}" data-z="${name}" style="top:${ZONES[name][0]}%;height:${ZONES[name][1]}%">${inner}</div>`;
  const bird = (y, t, dl, s) => `<svg class="fx-bird" style="top:${y}%;--t:${t}s;--dl:${dl}s;width:${s}cqw" viewBox="0 0 20 10"><path d="M1 6 Q5 0 10 5 Q15 0 19 6 Q15 4 10 8 Q5 4 1 6Z" fill="#fff" stroke="rgba(40,40,40,.45)" stroke-width=".6"/></svg>`;

  let cached = '';
  function html(){
    if(cached) return cached;
    let h = '';

    // ---- sea (Bandar Abbas) ----
    const seaSkip = [[19, 95.8, 40, 97.9], [7, 97, 14, 100], [73, 97, 98, 99.8]];
    let s = water('sea', [1, 95.6, 41, 99.8], 18, seaSkip, 7) + water('sea', [61, 95.6, 99, 99.8], 12, seaSkip, 5);
    s += rip('sea', 43.5, 97.9, 5, 0) + rip('sea', 43.5, 99.3, 5, 1.1) + rip('sea', 22.4, 97.4, 6, .5) + rip('sea', 12, 99.6, 7, 1.7) + rip('sea', 76, 99.3, 6, .8) + rip('sea', 93, 98.9, 5, 1.4);
    s += flag('sea', 20.55, 96.58, 1.8) + flag('sea', 84.8, 97.47, 1.8);
    s += `<i class="fx-beam" style="${pos('sea', 16.7, 98.05)}"></i><i class="fx-glow" style="${pos('sea', 16.7, 98.05)}"></i>`;
    h += zone('sea', s);

    // ---- Shiraz garden pools ----
    h += zone('shiraz', fount('shiraz', 40.7, 74.2, 4.2) + fount('shiraz', 50, 74.1, 5) + fount('shiraz', 59, 74.2, 4.2) +
                        fount('shiraz', 36.9, 68.8, 3.6) + fount('shiraz', 46, 68.9, 4));

    // ---- Isfahan river ----
    h += zone('isf', water('isf', [41, 52, 90, 53.6], 12, null, 5) + water('isf', [8, 57, 52, 58.8], 12, null, 5));

    // ---- mosque pool ----
    h += zone('mosque', fount('mosque', 50, 47.85, 2.8) + fount('mosque', 50, 48.45, 3) + fount('mosque', 50, 49.15, 3.2));

    // ---- Rasht river + chimney ----
    h += zone('rasht', water('rasht', [19, 33.9, 28, 35.4], 3, null, 2) + water('rasht', [53, 34, 66, 35.3], 6, null, 3) + water('rasht', [86, 34, 99, 35.3], 5, null, 2) +
                       smoke('rasht', 12.1, 32.7));

    // ---- Gilan: paddies, clock-tower chimney and flag ----
    h += zone('gilan', water('gilan', [1, 26.3, 21, 29.6], 9, null, 0) + smoke('gilan', 57.1, 22.3) + flag('gilan', 56.9, 23.18, 2.2));

    // ---- Tehran: reflecting pool, finish ring, tower beacon ----
    h += zone('tehran',
      `<div class="fx-pool" style="${pos('tehran', 47, 11.1)}height:${f2(3.2 / 15 * 100)}%"><i></i></div>` +
      `<i class="fx-fin" style="${pos('tehran', 50, 8.42)}"></i><i class="fx-fin" style="${pos('tehran', 50, 8.42)}animation-delay:1s"></i>` +
      `<i class="fx-blink" style="${pos('tehran', 94.4, 2.65)}"></i>`);

    // ---- sky: cloud shadows and birds (always on, transform-only) ----
    let sky = '';
    [[6, 90], [20, 74], [33, 100], [48, 82], [62, 110], [76, 78], [90, 96]].forEach((c, i) => {
      sky += `<i class="fx-cloud" style="top:${c[0]}%;--t:${c[1]}s;--dl:-${f2(R() * c[1])}s"></i>`;
    });
    sky += bird(95.3, 26, -4, 2.2) + bird(90.5, 34, -17, 1.9) + bird(70, 42, -9, 1.9) + bird(41, 48, -30, 1.8);
    h += zone('sky', sky);

    cached = `<div class="mapfx" aria-hidden="true">${h}</div>`;
    return cached;
  }

  let io = null;
  function mount(root){
    if(io){ io.disconnect(); io = null; }
    const zs = root.querySelectorAll('.fx-z');
    if(!('IntersectionObserver' in window)){ zs.forEach(z => z.classList.add('is-live')); return; }
    io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '80px' });
    zs.forEach(z => io.observe(z));
  }

  window.NBMapFx = { html, mount };
})();
