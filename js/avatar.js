// Avatar parts and drawing. A look is a plain object of indexes into the lists below.
(function(){
'use strict';
var SKIN=['#F6D3B3','#EBB98F','#D79B6C','#B97A4E','#8A5634','#5E3A22'];
var HAIRC=['#1B1410','#4A2E1B','#8B5A2B','#C9A15A','#B23A2E','#7B8794'];
var BG=['#F2B134','#2FA8A0','#E8603C','#7C5CBF','#3E86D6','#58A55C','#D96A9A','#2B2F3A'];
var CLOTH=['#0E7C7B','#C0392B','#2C3E7A','#E2A63A','#6B3FA0','#2F8F4E','#444','#F2EAD8'];
var RING=[['#FFFFFF','سفید',0],['#E2A63A','طلایی',0],['#3FB8B2','فیروزه‌ای',0],['#C0392B','یاقوتی',40],['#7C5CBF','ارغوانی',60],['#2B2F3A','شب',0]];
// part definitions: draw functions return svg strings
var HEAD=[['گرد',function(){return '<ellipse cx="50" cy="45" rx="19" ry="20"/>'}],['کشیده',function(){return '<ellipse cx="50" cy="46" rx="17" ry="22"/>'}],['چهارگوش',function(){return '<rect x="31" y="25" width="38" height="42" rx="14"/>'}]];
var HAIR=[
['بدون مو',0,function(){return ''}],
['کوتاه',0,function(c){return '<path d="M30 42c-2-16 8-24 20-24s22 8 20 24c-3-7-8-11-14-12-8 3-18 2-26 12z" fill="'+c+'"/>'}],
['فر',0,function(c){var s='';[[34,30],[42,24],[50,22],[58,24],[66,30],[30,40],[70,40]].forEach(function(p){s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="8" fill="'+c+'"/>'});return s}],
['بلند',30,function(c){return '<path d="M28 46c-6-26 6-32 22-32s28 6 22 32l2 30H26z" fill="'+c+'" transform="translate(0 0)"/>'}],
['جمع‌شده',0,function(c){return '<circle cx="50" cy="15" r="7" fill="'+c+'"/><path d="M30 42c-2-14 8-22 20-22s22 8 20 22c-4-6-9-9-14-10-8 2-18 2-26 10z" fill="'+c+'"/>'}],
['فرق کج',0,function(c){return '<path d="M29 44c-3-18 8-27 22-27 12 0 21 8 20 27-3-9-8-13-15-14-2 5-10 9-27 14z" fill="'+c+'"/>'}]];
var EYES=[['ساده',function(){return '<circle cx="42" cy="46" r="2.2"/><circle cx="58" cy="46" r="2.2"/>'}],['خندان',function(){return '<path d="M38.5 47q3.5-5 7 0M54.5 47q3.5-5 7 0" fill="none" stroke="#2a1d14" stroke-width="2" stroke-linecap="round"/>'}],['درشت',function(){return '<ellipse cx="42" cy="46" rx="4" ry="4.6" fill="#fff"/><ellipse cx="58" cy="46" rx="4" ry="4.6" fill="#fff"/><circle cx="42.5" cy="46.5" r="2.4"/><circle cx="58.5" cy="46.5" r="2.4"/>'}],['خواب‌آلود',function(){return '<path d="M38 46h8M54 46h8" stroke="#2a1d14" stroke-width="2.2" stroke-linecap="round"/>'}]];
var MOUTH=[['لبخند',function(){return '<path d="M43 56q7 7 14 0" fill="none" stroke="#7a2e2e" stroke-width="2.2" stroke-linecap="round"/>'}],['خنده',function(){return '<path d="M42 54h16q-1 10-8 10t-8-10z" fill="#7a2e2e"/><path d="M44 54h12v3H44z" fill="#fff"/>'}],['خنثی',function(){return '<path d="M44 58h12" stroke="#7a2e2e" stroke-width="2.2" stroke-linecap="round"/>'}],['شیطون',function(){return '<path d="M43 58q8 3 15-3" fill="none" stroke="#7a2e2e" stroke-width="2.2" stroke-linecap="round"/>'}]];
var BEARD=[['بدون ریش',0,function(){return ''}],['کم‌پشت',0,function(c){return '<path d="M33 54q17 24 34 0q-2 14-17 16q-15-2-17-16z" fill="'+c+'" opacity=".55"/>'}],['پرپشت',40,function(c){return '<path d="M31 50q2 26 19 27q17-1 19-27q-4 8-9 10q-5-4-10-4t-10 4q-5-2-9-10z" fill="'+c+'"/>'}],['سبیل',0,function(c){return '<path d="M40 55q5-4 10 0q5-4 10 0q-5 4-10 1q-5 3-10-1z" fill="'+c+'"/>'}]];
var GLASS=[['بدون عینک',0,function(){return ''}],['گرد',0,function(){return '<g fill="rgba(255,255,255,.25)" stroke="#222" stroke-width="1.8"><circle cx="42" cy="46" r="6.5"/><circle cx="58" cy="46" r="6.5"/><path d="M48.5 46h3"/></g>'}],['چهارگوش',0,function(){return '<g fill="rgba(255,255,255,.25)" stroke="#222" stroke-width="1.8"><rect x="35" y="40" width="14" height="11" rx="3"/><rect x="51" y="40" width="14" height="11" rx="3"/><path d="M49 45h2"/></g>'}],['آفتابی',30,function(){return '<g fill="#111" stroke="#111" stroke-width="1.5"><rect x="34" y="40" width="15" height="10" rx="4"/><rect x="51" y="40" width="15" height="10" rx="4"/><path d="M49 44h2"/></g>'}]];
var HAT=[['بدون کلاه',0,function(){return ''}],['کلاه کپ',0,function(c){return '<path d="M30 36c0-14 9-20 20-20s20 6 20 20z" fill="'+c+'"/><path d="M28 36h46q-2 5-10 5H30z" fill="'+c+'" opacity=".8"/>'}],['کلاه نمدی',40,function(c){return '<path d="M32 34c0-12 7-20 18-20s18 8 18 20z" fill="#cdbf9b"/><path d="M30 34h40" stroke="#8c7d58" stroke-width="3"/>'}],['تاج',80,function(){return '<path d="M32 28l4-14 7 9 7-12 7 12 7-9 4 14z" fill="#E2A63A" stroke="#a87a1e" stroke-width="1.4"/><circle cx="50" cy="13" r="2" fill="#C0392B"/>'}],['گل',0,function(){return '<g transform="translate(66 28)"><circle r="3" fill="#F6C945"/>'+[0,72,144,216,288].map(function(a){return '<ellipse cx="'+(6*Math.cos(a*Math.PI/180))+'" cy="'+(6*Math.sin(a*Math.PI/180))+'" rx="4" ry="3" fill="#E8603C" transform="rotate('+a+' '+(6*Math.cos(a*Math.PI/180))+' '+(6*Math.sin(a*Math.PI/180))+')"/>'}).join('')+'</g>'}]];
var COVERS=[
['کاشی فیروزه‌ای',0,function(){var s='<rect width="360" height="120" fill="#0E7C7B"/>';for(var y=0;y<4;y++)for(var x=0;x<8;x++){var cx=22+x*46+(y%2)*23,cy=16+y*30;s+='<g transform="translate('+cx+' '+cy+')"><rect x="-9" y="-9" width="18" height="18" fill="#F3D98A" opacity=".85"/><rect x="-9" y="-9" width="18" height="18" fill="#F3D98A" opacity=".85" transform="rotate(45)"/><circle r="4" fill="#0E7C7B"/></g>'}return s}],
['برج آزادی',0,function(){return '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4C7FD6"/><stop offset="1" stop-color="#F6C98C"/></linearGradient></defs><rect width="360" height="120" fill="url(#g1)"/><path d="M0 120V104h360v16z" fill="#2c3a4a"/><path d="M130 104c20-8 28-34 30-52h40c2 18 10 44 30 52z" fill="#F2EEE4"/><path d="M165 104c8-4 12-22 15-34 3 12 7 30 15 34z" fill="#4C7FD6"/><rect x="156" y="30" width="48" height="26" rx="6" fill="#F2EEE4"/>'}],
['میدان نقش جهان',0,function(){return '<rect width="360" height="120" fill="#F3C98B"/><circle cx="290" cy="30" r="16" fill="#FFF1C9"/><path d="M0 120V92h360v28z" fill="#C9A36C"/><path d="M110 92v-26q0-18 20-18t20 18v26z" fill="#2B8FA8"/><path d="M130 48v-14" stroke="#2B8FA8" stroke-width="3"/><circle cx="130" cy="32" r="3" fill="#E2A63A"/><rect x="200" y="62" width="60" height="30" fill="#E3B987"/><path d="M200 62h60l-8-12h-44z" fill="#C9885A"/>'}],
['موج خلیج فارس',0,function(){var s='<rect width="360" height="120" fill="#7CD3E8"/><circle cx="60" cy="28" r="18" fill="#FFE9A8"/>';for(var i=0;i<4;i++)s+='<path d="M0 '+(70+i*14)+'q30-12 60 0t60 0t60 0t60 0t60 0t60 0v'+(50-i*14)+'H0z" fill="'+['#3AAFCB','#1F93B8','#157BA3','#0E6489'][i]+'"/>';return s+'<path d="M250 66l30 0-6 10h-18z" fill="#6B4A2B"/><path d="M265 66V40l18 22z" fill="#F4EBD9"/>'}],
['جنگل گیلان',0,function(){var s='<rect width="360" height="120" fill="#BFE3B4"/><path d="M0 120V80q60-30 120-8t120-10 120 14v44z" fill="#6DAF62"/>';[30,90,170,250,320].forEach(function(x,i){s+='<path d="M'+x+' 100l-14 0 14-40 14 40z" fill="'+['#2E7A4A','#3E8F5A'][i%2]+'"/><path d="M'+x+' 82l-12 0 12-34 12 34z" fill="'+['#2E7A4A','#3E8F5A'][i%2]+'"/>'});return s}],
['باغ شب شیراز',0,function(){var s='<rect width="360" height="120" fill="#1F1B4B"/>';for(var i=0;i<30;i++)s+='<circle cx="'+((i*97)%360)+'" cy="'+((i*53)%70)+'" r="'+(1+(i%3)*.5)+'" fill="#FFF4C9"/>';s+='<path d="M0 120V92h360v28z" fill="#133B3A"/>';[40,110,250,320].forEach(function(x){s+='<ellipse cx="'+x+'" cy="78" rx="7" ry="26" fill="#0E4D3A"/>'});return s+'<circle cx="300" cy="26" r="12" fill="#FFF4C9"/><circle cx="306" cy="22" r="11" fill="#1F1B4B"/>'}],
['کویر و شتر',0,function(){return '<rect width="360" height="120" fill="#F6CE8F"/><circle cx="300" cy="34" r="20" fill="#FFB347"/><path d="M0 120V84q80-30 160 0t200-4v40z" fill="#E7A95C"/><path d="M0 120V102q90-24 180 0t180-6v24z" fill="#D18A44"/><path d="M60 98c0-12 4-18 10-18 6-4 10 4 12 10l8-2 2 10z" fill="#7A4B22"/>'}],
['غروب ساده',60,function(){return '<defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8603C"/><stop offset="1" stop-color="#7C5CBF"/></linearGradient></defs><rect width="360" height="120" fill="url(#g2)"/>'}]];

var PRICES={hair:{3:30},beard:{2:40},glass:{3:30},hat:{2:40,3:80},cover:{7:60},ring:{3:40,4:60}};
var DEFAULT_LOOK={skin:1,head:0,hair:1,hairC:1,eyes:0,mouth:0,beard:0,glass:0,hat:0,cloth:0,bg:0};
var LISTS={skin:SKIN,head:HEAD,hair:HAIR,hairC:HAIRC,eyes:EYES,mouth:MOUTH,beard:BEARD,glass:GLASS,hat:HAT,cloth:CLOTH,bg:BG,cover:COVERS,ring:RING};
function avatarSvg(s){
  var sk=SKIN[s.skin], hc=HAIRC[s.hairC], dk='#2a1d14';
  var back=HAIR[s.hair][1]?'':'';
  var out='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="'+BG[s.bg]+'"/>';
  out+='<path d="M8 100q4-28 42-30q38 2 42 30z" fill="'+CLOTH[s.cloth]+'"/><path d="M40 70q10 8 20 0" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/>';
  if(s.hair===3) out+=HAIR[3][2](hc);
  out+='<rect x="43" y="58" width="14" height="16" fill="'+sk+'"/><rect x="43" y="64" width="14" height="6" fill="rgba(0,0,0,.14)"/>';
  out+='<g fill="'+sk+'">'+HEAD[s.head][1]()+'</g><ellipse cx="31.5" cy="48" rx="3" ry="4.5" fill="'+sk+'"/><ellipse cx="68.5" cy="48" rx="3" ry="4.5" fill="'+sk+'"/>';
  out+='<ellipse cx="38" cy="54" rx="4" ry="2.4" fill="#e8806a" opacity=".28"/><ellipse cx="62" cy="54" rx="4" ry="2.4" fill="#e8806a" opacity=".28"/>';
  out+='<g fill="'+dk+'">'+EYES[s.eyes][1]()+'</g>';
  out+='<path d="M37 40q5-3 10 0M53 40q5-3 10 0" fill="none" stroke="'+(s.hair===0?dk:hc)+'" stroke-width="2" stroke-linecap="round"/>';
  if(s.beard) out+=BEARD[s.beard][2](hc);
  out+=MOUTH[s.mouth][1]();
  if(s.hair!==3) out+=HAIR[s.hair][2](hc); else out+='<path d="M29 44c-2-14 8-22 21-22s23 8 21 22c-4-7-9-10-15-11-8 3-19 3-27 11z" fill="'+hc+'"/>';
  out+=GLASS[s.glass][2]();
  out+=HAT[s.hat][2](CLOTH[(s.cloth+3)%8]);
  return out+'</svg>';
}
function thumb(fn){return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+fn+'</svg>'}
function coverSvg(i){return '<svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'+COVERS[i][2]()+'</svg>'}

window.NBAvatar={SKIN:SKIN,HAIRC:HAIRC,BG:BG,CLOTH:CLOTH,RING:RING,HEAD:HEAD,HAIR:HAIR,EYES:EYES,MOUTH:MOUTH,BEARD:BEARD,GLASS:GLASS,HAT:HAT,COVERS:COVERS,PRICES:PRICES,DEFAULT_LOOK:DEFAULT_LOOK,LISTS:LISTS,
  svg:avatarSvg,
  cover:function(i){return '<svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'+COVERS[i][2]()+'</svg>'}};
})();
