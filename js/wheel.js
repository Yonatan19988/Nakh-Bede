// نخ بده — looks for the action-card wheel («گردونه» in the shop).
// Every skin draws the same 11 wedges (angle 0 at the top, clockwise), so the spin and
// landing maths in app.js work for all of them. `NBWheel.svg(id, mini)` returns the
// disc; `mini` drops the text for the small shop preview. «slot» is not a disc.
(function(){
  const ICON = ['⏱️','✋','🛡️','⭐','⚡','🛟','💀','🚫','🔒','🦘','↩️'];
  const SHORT = ['وقت اضافه','زمان دزد','سپر','امتیاز طلایی','پرش برق','نجات','نفرین','رد ممنوع','قفل مسیر','پرش ناگهانی','عقب‌گرد'];
  const N = 11, SEG = 360 / N, C = 150;
  const rad = d => (d - 90) * Math.PI / 180;
  const pt = (r, a) => [C + r * Math.cos(rad(a)), C + r * Math.sin(rad(a))];
  const f = n => n.toFixed(1);
  const wedge = (r0, r1, a0, a1) => {
    const [x0,y0] = pt(r1,a0), [x1,y1] = pt(r1,a1), [x2,y2] = pt(r0,a1), [x3,y3] = pt(r0,a0);
    return `M${f(x3)} ${f(y3)} L${f(x0)} ${f(y0)} A${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)}Z`;
  };
  function label(i, rIcon, rText, fill, mini, o){
    if(mini) return '';
    o = o || {};
    const mid = i * SEG + SEG / 2;
    const [ix, iy] = pt(rIcon, mid), [tx, ty] = pt(rText, mid);
    return `<text x="${f(ix)}" y="${f(iy)}" font-size="${o.is || 18}" text-anchor="middle" dominant-baseline="central" transform="rotate(${f(mid)} ${f(ix)} ${f(iy)})">${ICON[i]}</text>` +
      `<text x="${f(tx)}" y="${f(ty)}" font-size="${o.ts || 10.5}" font-weight="800" fill="${fill}" text-anchor="middle" dominant-baseline="central" direction="rtl" transform="rotate(${f(mid - 90)} ${f(tx)} ${f(ty)})">${SHORT[i]}</text>`;
  }
  const hubStar = (mini, fill) => mini ? '' : `<text x="150" y="151" text-anchor="middle" dominant-baseline="central" font-size="22">⭐</text>`;

  // ---- marquee wheel, one palette per colour way ----
  const LAMP = {
    red:   {bg:'#2a0a12', a:'#b3282f', b:'#16161d', line:'#ffd54a', lamp:'#fff0a8', glow:'#ffd54a', ink:'#fff3c4', hub:'#ffd54a'},
    teal:  {bg:'#05222a', a:'#0b7a80', b:'#07323a', line:'#e9c062', lamp:'#fff0b8', glow:'#ffd25c', ink:'#ffffff', hub:'#e9c062'},
    purple:{bg:'#1a0f33', a:'#6a35b8', b:'#1c1236', line:'#ffd54a', lamp:'#fff4c0', glow:'#ffd54a', ink:'#fff3c4', hub:'#ffd54a'},
    green: {bg:'#0a3a26', a:'#118a52', b:'#f1eddc', line:'#d9b24a', lamp:'#fffbe0', glow:'#ffe58a', ink:'#fffbe0', inkB:'#0a3a26', hub:'#d9b24a'},
    orange:{bg:'#3a1a0a', a:'#f58a0a', b:'#5a2a10', line:'#ffd25c', lamp:'#fff3d0', glow:'#ffb81f', ink:'#fff3d0', hub:'#ffd25c'},
    blue:  {bg:'#0b1632', a:'#2a6fdc', b:'#0e1b3a', line:'#cfd9ee', lamp:'#f3f8ff', glow:'#9cc4ff', ink:'#ffffff', hub:'#cfd9ee'},
    pink:  {bg:'#2a0f1e', a:'#e8458b', b:'#2a0f1e', line:'#ffd0e4', lamp:'#fff0f6', glow:'#ff7ab4', ink:'#ffffff', hub:'#ffd0e4'},
    multi: {bg:'#1b1f3a', multi:['#e63946','#f4a261','#e9c46a','#2a9d8f','#3a86ff','#8338ec'], line:'#ffffff', lamp:'#ffffff', glow:'#ffe58a', ink:'#ffffff', hub:'#ffd54a'}
  };
  function lamp(p, mini){
    let s = `<circle cx="150" cy="150" r="146" fill="${p.bg}" stroke="${p.line}" stroke-width="4"/>`;
    for(let i = 0; i < N; i++){
      const a0 = i * SEG, a1 = a0 + SEG;
      const fill = p.multi ? p.multi[i % p.multi.length] : (i % 2 ? p.b : p.a);
      const ink = (!p.multi && p.inkB && i % 2) ? p.inkB : p.ink;
      s += `<path d="${wedge(30,124,a0,a1)}" fill="${fill}" stroke="${p.line}" stroke-width="1.5"/>` + label(i, 106, 70, ink, mini);
    }
    for(let k = 0; k < 22; k++){ const [x,y] = pt(134, k * 360 / 22); s += `<circle class="wh-bulb ${k % 2 ? 'b2' : ''}" cx="${f(x)}" cy="${f(y)}" r="5.5" fill="${p.lamp}" style="filter:drop-shadow(0 0 4px ${p.glow})"/>`; }
    return s + `<circle cx="150" cy="150" r="26" fill="${p.hub}" stroke="rgba(0,0,0,.45)" stroke-width="3"/>` + hubStar(mini);
  }

  const DRAW = {
    classic: null,   // the original wheel is drawn by app.js
    tile(mini){
      let s = `<circle cx="150" cy="150" r="146" fill="#0b5e63" stroke="#e9c062" stroke-width="5"/>`;
      for(let i = 0; i < N; i++){ const a0 = i * SEG; s += `<path d="${wedge(26,136,a0,a0 + SEG)}" fill="${i % 2 ? '#0b5e63' : '#f3e8cc'}" stroke="#e9c062" stroke-width="2"/>` + label(i, 118, 78, i % 2 ? '#ffe3a1' : '#07323a', mini); }
      for(let i = 0; i < N; i++){ const [x,y] = pt(141, i * SEG); s += `<circle cx="${f(x)}" cy="${f(y)}" r="3" fill="#ffe3a1"/>`; }
      let star = ''; for(let k = 0; k < 16; k++){ const [x,y] = pt(k % 2 ? 13 : 26, k * 22.5); star += `${f(x)},${f(y)} `; }
      return s + `<polygon points="${star}" fill="#e9c062" stroke="#07323a" stroke-width="2"/><circle cx="150" cy="150" r="7" fill="#07323a"/>`;
    },
    minimal(mini){
      let s = `<circle cx="150" cy="150" r="146" fill="#123f50" stroke="#2c6a82" stroke-width="3"/>`;
      for(let i = 0; i < N; i++){ const a0 = i * SEG; s += `<path d="${wedge(34,142,a0,a0 + SEG)}" fill="${i % 2 ? '#154757' : '#123f50'}" stroke="rgba(255,255,255,.18)" stroke-width="1"/>` + label(i, 118, 78, '#cfe6ef', mini, {is:21}); }
      return s + `<circle cx="150" cy="150" r="30" fill="#0a2330" stroke="#ffd25c" stroke-width="3"/><circle cx="150" cy="150" r="6" fill="#ffd25c"/>`;
    },
    neon(mini){
      const NEON = ['#7df9ff','#ff5fd2','#ffe94d','#8dff6a','#b28dff','#ff9a4d'];
      let s = `<circle cx="150" cy="150" r="146" fill="#0f0a24" stroke="#7df9ff" stroke-width="3" style="filter:drop-shadow(0 0 5px #7df9ff)"/>`;
      for(let i = 0; i < N; i++){ const a0 = i * SEG, c = NEON[i % NEON.length]; s += `<path d="${wedge(30,136,a0 + 1,a0 + SEG - 1)}" fill="${c}22" stroke="${c}" stroke-width="2" style="filter:drop-shadow(0 0 4px ${c})"/>` + label(i, 116, 76, c, mini); }
      return s + `<circle cx="150" cy="150" r="24" fill="#0f0a24" stroke="#ff5fd2" stroke-width="3" style="filter:drop-shadow(0 0 5px #ff5fd2)"/>`;
    },
    yarn(mini){
      const cols = ['#ffb81f','#f9a416','#ffd25c'];
      let s = `<defs><pattern id="whKnit" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0 L4 8 L8 0" stroke="rgba(120,45,0,.28)" stroke-width="1.6" fill="none"/></pattern></defs><circle cx="150" cy="150" r="146" fill="#f58a0a" stroke="#4a1f08" stroke-width="5"/>`;
      for(let i = 0; i < N; i++){ const a0 = i * SEG, d = wedge(26,138,a0,a0 + SEG); s += `<path d="${d}" fill="${cols[i % 3]}" stroke="#4a1f08" stroke-width="2.4"/><path d="${d}" fill="url(#whKnit)"/>` + label(i, 118, 78, '#3a1606', mini); }
      return s + `<circle cx="150" cy="150" r="24" fill="#fff3d0" stroke="#4a1f08" stroke-width="3"/><path d="M138 150 q12 -14 24 0 q-12 14 -24 0" fill="none" stroke="#f58a0a" stroke-width="3"/>`;
    },
    petal(mini){
      let s = `<circle cx="150" cy="150" r="146" fill="#143a42" stroke="#ffe3a1" stroke-width="3"/>`;
      for(let i = 0; i < N; i++){
        const mid = i * SEG + SEG / 2, [bx,by] = pt(24,mid), [tx,ty] = pt(134,mid), [lx,ly] = pt(76,mid - SEG * .62), [rx,ry] = pt(76,mid + SEG * .62);
        s += `<path d="M${f(bx)} ${f(by)} Q${f(lx)} ${f(ly)} ${f(tx)} ${f(ty)} Q${f(rx)} ${f(ry)} ${f(bx)} ${f(by)}Z" fill="hsl(${(i * 32 + 150) % 360} 60% 55%)" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/>` + label(i, 110, 70, '#10272c', mini, {ts:10});
      }
      return s + `<circle cx="150" cy="150" r="24" fill="#ffe3a1" stroke="#143a42" stroke-width="3"/><circle cx="150" cy="150" r="9" fill="#d4493a"/>`;
    }
  };

  // id, name, price (0 = free), draw key, pointer colour
  const SKINS = [
    {id:'wh_lamp_red',    name:'لامپی قرمز',        price:0,   key:'lamp', pal:'red',    ptr:'#ffd54a', free:true},
    {id:'wh_classic',     name:'گردونه‌ی کلاسیک',    price:0,   key:'classic',            ptr:'#F3D37A', free:true},
    {id:'wh_lamp_teal',   name:'لامپی فیروزه‌ای',    price:60,  key:'lamp', pal:'teal',   ptr:'#e9c062'},
    {id:'wh_lamp_purple', name:'لامپی بنفش',        price:70,  key:'lamp', pal:'purple', ptr:'#ffd54a'},
    {id:'wh_lamp_green',  name:'لامپی زمردی',       price:70,  key:'lamp', pal:'green',  ptr:'#d9b24a'},
    {id:'wh_lamp_orange', name:'لامپی نارنجی',      price:70,  key:'lamp', pal:'orange', ptr:'#ffd25c'},
    {id:'wh_lamp_blue',   name:'لامپی آبی',         price:70,  key:'lamp', pal:'blue',   ptr:'#cfd9ee'},
    {id:'wh_lamp_pink',   name:'لامپی صورتی',       price:70,  key:'lamp', pal:'pink',   ptr:'#ffd0e4'},
    {id:'wh_lamp_multi',  name:'لامپی چندرنگ',      price:90,  key:'lamp', pal:'multi',  ptr:'#ffffff'},
    {id:'wh_minimal',     name:'مینیمال',           price:80,  key:'minimal',            ptr:'#ffd25c'},
    {id:'wh_tile',        name:'کاشی هشت‌پر',       price:100, key:'tile',               ptr:'#ffe3a1'},
    {id:'wh_petal',       name:'گلبرگ',             price:100, key:'petal',              ptr:'#ffe3a1'},
    {id:'wh_neon',        name:'نئون',              price:110, key:'neon',               ptr:'#ff5fd2'},
    {id:'wh_yarn',        name:'کلاف نخ',           price:120, key:'yarn',               ptr:'#5a1e0a'},
    {id:'wh_slot',        name:'ماشین اسلات',       price:130, key:'slot',               ptr:'#ffd25c'}
  ];

  function svg(id, mini){
    const sk = SKINS.find(s => s.id === id) || SKINS[0];
    let body;
    if(sk.key === 'lamp') body = lamp(LAMP[sk.pal], mini);
    else if(DRAW[sk.key]) body = DRAW[sk.key](mini);
    else return '';
    return `<svg viewBox="0 0 300 300" width="100%" height="100%">${body}</svg>`;
  }
  window.NBWheel = { SKINS, ICON, SHORT, svg, get: id => SKINS.find(s => s.id === id) || SKINS[0] };
})();
