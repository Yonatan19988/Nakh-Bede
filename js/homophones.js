// «کدوم درسته؟» — words that sound the same but are spelt differently (هم‌آواها), like حیاط and حیات.
// A sentence with a gap comes up with the two spellings under it; pick the right one before the time runs out.
// After every answer Nakhi says what both words mean. Ten sentences a round.
// Needs: app.js (el, LS, faNum, state, render, loadProfile, saveProfile, sfx*, goBack, accountTouch)
// and daily.js (wgIcon, wgRibbonText, wgConfetti, wgReduced).

// [word, its meaning, the other word, its meaning, sentence for the first, sentence for the second]
const HOMO_PAIRS = [
  ['حیاط', 'محوطه‌ی باز خانه', 'حیات', 'زندگی', 'بچه‌ها توی ___ فوتبال بازی می‌کنن.', 'آب مایه‌ی ___ است.'],
  ['خار', 'تیغ گیاه', 'خوار', 'پست و بی‌ارزش', 'گل بی ___ دنیا نیست.', 'آدم دروغگو پیش همه ___ می‌شه.'],
  ['سد', 'دیواری که جلوی آب را می‌گیرد', 'صد', 'عدد ۱۰۰', 'آب پشت ___ جمع شد.', 'این کتاب ___ صفحه داره.'],
  ['سفر', 'رفتن به جای دیگر', 'صفر', 'عدد ۰', 'تابستون رفتیم ___ شمال.', 'نمره‌ی امتحانش ___ شد!'],
  ['اساس', 'پایه و بنیاد', 'اثاث', 'وسایل خانه', 'اعتماد ___ هر دوستیه.', 'موقع اسباب‌کشی ___ خونه رو بار کامیون کردیم.'],
  ['خاست', 'بلند شد (از «خاستن»)', 'خواست', 'میل داشت (از «خواستن»)', 'پیرمرد آهسته از جا ___ و راه افتاد.', 'بچه از مادرش یه لیوان آب ___.'],
  ['ثواب', 'پاداش کار نیک', 'صواب', 'درست و بجا', 'کمک به دیگران ___ داره.', 'به نظرم کار ___ اینه که صبر کنیم.'],
  ['قریب', 'نزدیک', 'غریب', 'ناآشنا، دور از وطن', '___ یک ساعت منتظرش موندیم.', 'توی این شهر ___ هستم و کسی رو نمی‌شناسم.'],
  ['خان', 'ارباب و بزرگ', 'خوان', 'سفره؛ مرحله‌ی سخت', '___ روستا به همه دستور می‌داد.', 'رستم از هفت ___ گذشت.'],
  ['غذا', 'خوراک', 'قضا', 'سرنوشت؛ کاری که وقتش گذشته', 'مامان برای ناهار ___ پخته.', 'خواب موند و نمازش ___ شد.'],
  ['خویش', 'خود', 'خیش', 'ابزار شخم زدن', 'هر کس مسئول کار ___ است.', 'کشاورز با ___ زمین رو شخم زد.'],
  ['خرد', 'ریز و شکسته', 'خورد', 'از «خوردن»', 'لیوان از دستم افتاد و ___ شد.', 'علی ناهارش رو کامل ___.'],
  ['عرض', 'پهنا', 'ارز', 'پول کشورهای دیگر', '___ این میز یک متره.', 'قیمت ___ دوباره بالا رفت.'],
  ['اسرار', 'رازها', 'اصرار', 'پافشاری', 'دوست خوب ___ آدم رو نگه می‌داره.', 'هرچی ___ کردم، باهامون نیومد.'],
  ['حال', 'احوال، وضعیت', 'هال', 'سالن خانه', 'امروز ___ من خیلی خوبه.', 'مهمونا توی ___ نشسته بودن.'],
  ['قالب', 'شکل، ظرف شکل‌دادن', 'غالب', 'پیروز', 'کیک رو توی ___ ریختیم.', 'تیم ما بر حریف ___ شد.'],
  ['نذر', 'عهد برای انجام کار خیر', 'نظر', 'دیدگاه', 'مادربزرگ ___ کرده بود شله‌زرد بپزه.', '___ تو درباره‌ی این فیلم چیه؟'],
  ['فراق', 'جدایی', 'فراغ', 'آسودگی', 'شاعر از ___ یار شعر گفته.', 'بعد از امتحان‌ها با ___ بال استراحت کردیم.'],
  ['منسوب', 'نسبت داده‌شده', 'منصوب', 'گماشته‌شده به یک مقام', 'این شعر به حافظ ___ است.', 'او به مدیریت مدرسه ___ شد.'],
  ['علم', 'پرچم (عَلَم)', 'الم', 'درد و رنج', 'سرباز ___ کشور رو بالا برد.', 'بیمار از درد و ___ می‌نالید.'],
  ['هوا', 'هوای اطراف ما', 'حوا', 'همسر آدم', 'امروز ___ خیلی سرده.', 'آدم و ___ اولین انسان‌ها بودن.'],
  ['ثنا', 'ستایش', 'سنا', 'نام یکی از مجلس‌ها', 'حمد و ___ مخصوص خداست.', 'در آمریکا مجلس ___ وجود داره.'],
  ['سفیر', 'نماینده‌ی یک کشور', 'صفیر', 'صدای تیز و سوت‌مانند', '___ ایران در فرانسه کار می‌کنه.', '___ باد از لای پنجره میومد.'],
  ['نصب', 'کار گذاشتن', 'نسب', 'نژاد و تبار', 'کولر رو روی دیوار ___ کردیم.', '___ این خانواده به یه خاندان قدیمی می‌رسه.'],
  ['غاز', 'پرنده‌ی آبی', 'قاز', 'پول خیلی کم', 'توی برکه یه ___ سفید شنا می‌کرد.', 'این وسیله یه ___ هم نمی‌ارزه.'],
  ['انتصاب', 'گماشتن به یک مقام', 'انتساب', 'نسبت دادن', 'خبر ___ مدیر جدید اعلام شد.', '___ این نقاشی به اون هنرمند درست نیست.'],
  ['حلال', 'جایز و روا', 'هلال', 'ماه نو', 'این غذا ___ است.', '___ ماه توی آسمون پیدا شد.'],
  ['حول', 'اطراف، درباره', 'هول', 'ترس و عجله', 'صحبت‌ها ___ همین موضوع بود.', 'با ___ و عجله از خونه زد بیرون.'],
  ['راضی', 'خشنود', 'رازی', 'زکریای رازی، دانشمند ایرانی', 'از نتیجه‌ی کار ___ بودیم.', 'زکریای ___ الکل رو کشف کرد.'],
  ['غدیر', 'نام یک عید', 'قدیر', 'توانا', 'عید ___ رو جشن گرفتیم.', 'خداوند ___ و تواناست.'],
  ['غربت', 'دوری از وطن', 'قربت', 'نزدیکی', 'سال‌ها در ___ زندگی کرد و دلش برای وطن تنگ بود.', 'نماز رو به قصد ___ به خدا می‌خونن.'],
  ['قرض', 'وام', 'غرض', 'منظور، قصد', 'ازش پول ___ گرفتم.', '___ از این حرف چی بود؟'],
  ['سلاح', 'جنگ‌افزار', 'صلاح', 'خیر و مصلحت', 'سربازها ___ به دست گرفتن.', '___ نیست این وقت شب تنها بری بیرون.'],
  ['نغز', 'زیبا و دلپذیر', 'نقض', 'شکستن قانون یا قول', 'این شعر خیلی ___ و دلنشینه.', '___ قانون جریمه داره.'],
  ['سوت', 'صدای سوتک', 'صوت', 'صدا', 'داور ___ پایان بازی رو زد.', 'کیفیت ___ این بلندگو عالیه.'],
  ['تهدید', 'ترساندن', 'تحدید', 'محدود کردن', 'دزد صاحب‌خونه رو ___ کرد.', 'دولت برای ___ مصرف آب قانون گذاشت.'],
];
// every sentence as a question: [pair, which word is right (0 or 1)]
const HOMO_QS = HOMO_PAIRS.flatMap((_, i) => [[i, 0], [i, 1]]);
const HOMO_ROUND = 10, HOMO_SECS = 12;

// a shuffled order of the questions for this phone, so a sentence does not come back until all were asked
function homoNextQs(n){
  let o = LS.get('homoOrder', null);
  const out = [];
  while(out.length < n){
    if(!o || !Array.isArray(o.ix) || o.len !== HOMO_QS.length || o.at >= o.ix.length){
      const ix = HOMO_QS.map((_, i) => i);
      for(let i = ix.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; }
      o = { len: HOMO_QS.length, ix, at: 0 };
    }
    out.push(o.ix[o.at++]);
  }
  LS.set('homoOrder', o);
  return out;
}
function homoStats(){ return Object.assign({ best: 0, played: 0, streak: 0 }, LS.get('homoStats', null) || {}); }

let ho = null;     // the round being played
function homoNewRound(){
  ho = { qs: homoNextQs(HOMO_ROUND), i: 0, right: 0, points: 0, run: 0, bestRun: 0, picked: -1, t0: 0, flip: Math.random() < .5, done: false, coins: 0 };
}
function homoQ(){ const [p, ans] = HOMO_QS[ho.qs[ho.i]]; return { p: HOMO_PAIRS[p], ans }; }

let homoTimer = null;
function homoStopTimer(){ clearTimeout(homoTimer); homoTimer = null; }
function homoStartTimer(){
  homoStopTimer();
  ho.t0 = Date.now();
  homoTimer = setTimeout(() => { if(state.screen === 'homo' && ho && ho.picked < 0) homoPick(-2); }, HOMO_SECS * 1000);
}
// -2: the time ran out
function homoPick(k){
  if(!ho || ho.picked !== -1 || ho.done) return;
  homoStopTimer();
  const { ans } = homoQ();
  ho.picked = k;
  if(k === ans){
    const left = Math.max(0, HOMO_SECS - (Date.now() - ho.t0) / 1000);
    ho.right++; ho.run++; ho.bestRun = Math.max(ho.bestRun, ho.run);
    ho.points += 10 + Math.ceil(left);
    sfxWin();
  } else {
    ho.run = 0;
    sfxWrong();
  }
  render();
}
function homoNext(){
  if(!ho) return;
  if(ho.i + 1 >= HOMO_ROUND){
    ho.done = true;
    ho.coins = ho.right * 2 + (ho.right === HOMO_ROUND ? 10 : 0);
    try{ const p = loadProfile(); p.coins += ho.coins; saveProfile(p); }catch(e){}
    const st = homoStats();
    st.played++; ho.newBest = ho.points > st.best; st.best = Math.max(st.best, ho.points);
    LS.set('homoStats', st);
    if(typeof accountTouch === 'function') accountTouch();
    ho.celebrate = true;
  } else {
    ho.i++; ho.picked = -1; ho.flip = Math.random() < .5;
  }
  render();
}

function homoSay(){
  const { p, ans } = homoQ();
  if(ho.picked === -1) return ho.i === 0 ? 'مواظب باش، شبیه همن!' : (ho.run >= 3 ? `${faNum(ho.run)} تا پشت‌هم! ادامه بده…` : 'کدومش درسته؟');
  if(ho.picked === ans) return ['آفرین!', 'دقیقاً همینه!', 'ایول، درسته!', 'حرف نداری!'][ho.i % 4];
  if(ho.picked === -2) return `وقت تموم شد! درستش «${p[ans * 2]}» بود.`;
  return `اِی… درستش «${p[ans * 2]}» بود.`;
}

function renderHomo(){
  if(!ho) homoNewRound();
  const wrap = el(`<div class="wg hm"><div class="wg-bg" aria-hidden="true"></div></div>`);
  const hud = el(`<div class="wg-hud"><span class="wg-coin">${wgIcon('coin')}<b></b></span>${wgRibbonText('کدوم درسته؟')}<button type="button" class="wg-back" aria-label="بازگشت">${wgIcon('back')}</button></div>`);
  hud.querySelector('.wg-coin b').textContent = faNum(loadProfile().coins);
  hud.querySelector('.wg-back').addEventListener('click', () => { homoStopTimer(); ho = null; goBack(); });
  wrap.appendChild(hud);
  if(ho.done){ wrap.appendChild(homoResult()); return wrap; }

  const { p, ans } = homoQ();
  const answered = ho.picked !== -1;
  // progress, the time left, the run of right answers
  const top = el(`<div class="hm-top"><span class="hm-n"></span><span class="hm-time"><i></i></span><span class="wg-streak">${wgIcon('flame')}<span></span></span></div>`);
  top.querySelector('.hm-n').textContent = `${faNum(ho.i + 1)} از ${faNum(HOMO_ROUND)}`;
  top.querySelector('.wg-streak span').textContent = faNum(ho.run);
  wrap.appendChild(top);

  const stage = el(`<div class="hm-stage"></div>`);
  // the sentence, with the gap filled once answered
  const card = el(`<div class="hm-sent"><span class="hm-lbl">جای خالی رو پر کن</span><p></p></div>`);
  const [before, after] = p[4 + ans].split('___');
  const pp = card.querySelector('p');
  pp.append(before);
  const gap = el(`<span class="hm-gap${answered ? ' is-fill' : ''}"></span>`);
  if(answered) gap.textContent = p[ans * 2];
  pp.append(gap, after || '');
  stage.appendChild(card);

  const say = el(`<div class="hm-say"><img src="assets/${answered && ho.picked === ans ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true" decoding="async"><div class="wg-bub hm-bub" role="status" aria-live="polite"></div></div>`);
  say.querySelector('.hm-bub').textContent = homoSay();
  stage.appendChild(say);

  // the two spellings, in a random order
  const opts = el(`<div class="hm-opts"></div>`);
  const order = ho.flip ? [1, 0] : [0, 1];
  order.forEach(k => {
    const b = el(`<button type="button" class="hm-opt"><b></b><small></small></button>`);
    b.querySelector('b').textContent = p[k * 2];
    if(answered){
      b.disabled = true;
      b.querySelector('small').textContent = p[k * 2 + 1];
      if(k === ans) b.classList.add('is-ok');
      else if(k === ho.picked) b.classList.add('is-bad');
    }
    b.addEventListener('click', () => homoPick(k));
    opts.appendChild(b);
  });
  stage.appendChild(opts);

  if(answered){
    const mean = el(`<div class="hm-mean"></div>`);
    mean.innerHTML = '<b></b> <span></span>';
    mean.querySelector('b').textContent = `«${p[0]}»`;
    mean.querySelector('span').textContent = `یعنی ${p[1]}؛ «${p[2]}» یعنی ${p[3]}.`;
    stage.appendChild(mean);
  }
  wrap.appendChild(stage);

  const foot = el(`<div class="hm-foot"></div>`);
  if(answered){
    const next = el(`<button type="button" class="wg-btn wg-btn--next"><b>${ho.i + 1 >= HOMO_ROUND ? 'نتیجه' : 'بعدی'}</b></button>`);
    next.addEventListener('click', homoNext);
    foot.appendChild(next);
  }
  wrap.appendChild(foot);

  if(!answered){
    // the bar empties over the seconds left; a redraw keeps the time already used
    const used = ho.t0 ? (Date.now() - ho.t0) / 1000 : 0;
    if(!ho.t0 || !homoTimer) homoStartTimer();
    const bar = top.querySelector('.hm-time i');
    const left = Math.max(0, HOMO_SECS - (ho.t0 && homoTimer ? used : 0));
    bar.style.width = (left / HOMO_SECS * 100) + '%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `width ${left}s linear`; bar.style.width = '0%'; }));
  } else {
    ho.t0 = 0;
    top.querySelector('.hm-time i').style.width = '0%';
  }
  return wrap;
}

function homoResult(){
  const st = homoStats();
  const box = el(`<div class="hm-res">
    <img class="hm-res__nk" src="assets/${ho.right >= 7 ? 'mascot-laugh' : 'mascot'}.webp" alt="" aria-hidden="true" decoding="async">
    <div class="hm-res__card">
      <div class="wg-res__t"></div>
      <div class="hm-res__big"></div>
      <div class="wg-res__sub"><span class="wg-res__coin">${wgIcon('coin')}<b></b></span><span class="wg-res__st">${wgIcon('flame')}<span></span></span></div>
      <div class="hm-res__best"></div>
    </div>
    <div class="wg-res__btns"></div>
  </div>`);
  box.querySelector('.wg-res__t').textContent = ho.right >= 9 ? 'استاد املا!' : ho.right >= 7 ? 'آفرین، خیلی خوب بود!' : ho.right >= 4 ? 'بد نبود!' : 'دفعه‌ی بعد بهتر می‌شه!';
  box.querySelector('.hm-res__big').textContent = `${faNum(ho.right)} از ${faNum(HOMO_ROUND)} درست`;
  box.querySelector('.wg-res__coin b').textContent = `+${faNum(ho.coins)} سکه`;
  box.querySelector('.wg-res__st span').textContent = `${faNum(ho.bestRun)} پشت‌هم`;
  box.querySelector('.hm-res__best').textContent = ho.newBest ? `رکورد تازه: ${faNum(ho.points)} امتیاز!` : `امتیاز ${faNum(ho.points)} · رکورد ${faNum(st.best)}`;
  const again = el(`<button type="button" class="wg-btn wg-btn--next"><b>یه دور دیگه</b></button>`);
  again.addEventListener('click', () => { homoNewRound(); render(); });
  const home = el(`<button type="button" class="wg-btn wg-btn--share" aria-label="برگشت به خانه">${wgIcon('back')}</button>`);
  home.addEventListener('click', () => { ho = null; goBack(); });
  box.querySelector('.wg-res__btns').append(again, home);
  if(ho.celebrate){
    ho.celebrate = false;
    if(ho.right >= 7) setTimeout(() => { const w = document.querySelector('.wg'); if(w) wgConfetti(w); }, 60);
  }
  return box;
}

function openHomo(){
  homoStopTimer();
  homoNewRound();
  state.screen = 'homo';
  render();
}
