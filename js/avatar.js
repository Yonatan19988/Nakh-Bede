// Avatar parts and drawing. A look is a plain object of indexes into the lists below.
(function(){
'use strict';
var SKIN=['#F6D3B3','#EBB98F','#D79B6C','#B97A4E','#8A5634','#5E3A22'];
var HAIRC=['#1B1410','#4A2E1B','#8B5A2B','#C9A15A','#B23A2E','#7B8794'];
var BG=['#F2B134','#2FA8A0','#E8603C','#7C5CBF','#3E86D6','#58A55C','#D96A9A','#2B2F3A'];
var CLOTH=['#0E7C7B','#C0392B','#2C3E7A','#E2A63A','#6B3FA0','#2F8F4E','#444','#F2EAD8'];
var RING=[['#FFFFFF','سفید',0],['#E2A63A','طلایی',0],['#3FB8B2','فیروزه‌ای',0],['#C0392B','یاقوتی',40],['#7C5CBF','ارغوانی',60],['#2B2F3A','شب',0]];
// part definitions: draw functions return svg strings
var EYE_C=['#5b3a20','#2f6b8a','#4b7a3a','#6b6b6b'];
var COVERS=[
['کاشی فیروزه‌ای',0,function(){var s='<rect width="360" height="120" fill="#0E7C7B"/>';for(var y=0;y<4;y++)for(var x=0;x<8;x++){var cx=22+x*46+(y%2)*23,cy=16+y*30;s+='<g transform="translate('+cx+' '+cy+')"><rect x="-9" y="-9" width="18" height="18" fill="#F3D98A" opacity=".85"/><rect x="-9" y="-9" width="18" height="18" fill="#F3D98A" opacity=".85" transform="rotate(45)"/><circle r="4" fill="#0E7C7B"/></g>'}return s}],
['برج آزادی',0,function(){return '<defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4C7FD6"/><stop offset="1" stop-color="#F6C98C"/></linearGradient></defs><rect width="360" height="120" fill="url(#g1)"/><path d="M0 120V104h360v16z" fill="#2c3a4a"/><path d="M130 104c20-8 28-34 30-52h40c2 18 10 44 30 52z" fill="#F2EEE4"/><path d="M165 104c8-4 12-22 15-34 3 12 7 30 15 34z" fill="#4C7FD6"/><rect x="156" y="30" width="48" height="26" rx="6" fill="#F2EEE4"/>'}],
['میدان نقش جهان',0,function(){return '<rect width="360" height="120" fill="#F3C98B"/><circle cx="290" cy="30" r="16" fill="#FFF1C9"/><path d="M0 120V92h360v28z" fill="#C9A36C"/><path d="M110 92v-26q0-18 20-18t20 18v26z" fill="#2B8FA8"/><path d="M130 48v-14" stroke="#2B8FA8" stroke-width="3"/><circle cx="130" cy="32" r="3" fill="#E2A63A"/><rect x="200" y="62" width="60" height="30" fill="#E3B987"/><path d="M200 62h60l-8-12h-44z" fill="#C9885A"/>'}],
['موج خلیج فارس',0,function(){var s='<rect width="360" height="120" fill="#7CD3E8"/><circle cx="60" cy="28" r="18" fill="#FFE9A8"/>';for(var i=0;i<4;i++)s+='<path d="M0 '+(70+i*14)+'q30-12 60 0t60 0t60 0t60 0t60 0t60 0v'+(50-i*14)+'H0z" fill="'+['#3AAFCB','#1F93B8','#157BA3','#0E6489'][i]+'"/>';return s+'<path d="M250 66l30 0-6 10h-18z" fill="#6B4A2B"/><path d="M265 66V40l18 22z" fill="#F4EBD9"/>'}],
['جنگل گیلان',0,function(){var s='<rect width="360" height="120" fill="#BFE3B4"/><path d="M0 120V80q60-30 120-8t120-10 120 14v44z" fill="#6DAF62"/>';[30,90,170,250,320].forEach(function(x,i){s+='<path d="M'+x+' 100l-14 0 14-40 14 40z" fill="'+['#2E7A4A','#3E8F5A'][i%2]+'"/><path d="M'+x+' 82l-12 0 12-34 12 34z" fill="'+['#2E7A4A','#3E8F5A'][i%2]+'"/>'});return s}],
['باغ شب شیراز',0,function(){var s='<rect width="360" height="120" fill="#1F1B4B"/>';for(var i=0;i<30;i++)s+='<circle cx="'+((i*97)%360)+'" cy="'+((i*53)%70)+'" r="'+(1+(i%3)*.5)+'" fill="#FFF4C9"/>';s+='<path d="M0 120V92h360v28z" fill="#133B3A"/>';[40,110,250,320].forEach(function(x){s+='<ellipse cx="'+x+'" cy="78" rx="7" ry="26" fill="#0E4D3A"/>'});return s+'<circle cx="300" cy="26" r="12" fill="#FFF4C9"/><circle cx="306" cy="22" r="11" fill="#1F1B4B"/>'}],
['کویر و شتر',0,function(){return '<rect width="360" height="120" fill="#F6CE8F"/><circle cx="300" cy="34" r="20" fill="#FFB347"/><path d="M0 120V84q80-30 160 0t200-4v40z" fill="#E7A95C"/><path d="M0 120V102q90-24 180 0t180-6v24z" fill="#D18A44"/><path d="M60 98c0-12 4-18 10-18 6-4 10 4 12 10l8-2 2 10z" fill="#7A4B22"/>'}],
['غروب ساده',60,function(){return '<defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8603C"/><stop offset="1" stop-color="#7C5CBF"/></linearGradient></defs><rect width="360" height="120" fill="url(#g2)"/>'}]];

// ---- colour helpers ----
function hex2(c){c=c.replace('#','');return [parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)];}
function mix(a,b,t){var x=hex2(a),y=hex2(b);return '#'+[0,1,2].map(function(i){var v=Math.round(x[i]+(y[i]-x[i])*t);return (v<16?'0':'')+v.toString(16);}).join('');}
function lite(c,t){return mix(c,'#ffffff',t);} function dark(c,t){return mix(c,'#000000',t);}
var uid=0;
// ---- part names (index 1 is the coin price shown in previews) ----
var HEAD=[['گرد',0],['کشیده',0],['چهارگوش',0]];
var HAIR=[['بدون مو',0],['کوتاه',0],['فر',0],['بلند',30],['جمع‌شده',0],['فرق کج',0]];
var EYES=[['ساده',0],['خندان',0],['درشت',0],['خواب‌آلود',0]];
var MOUTH=[['لبخند',0],['خنده',0],['خنثی',0],['شیطون',0]];
var BEARD=[['بدون ریش',0],['کم‌پشت',0],['پرپشت',40],['سبیل',0]];
var GLASS=[['بدون عینک',0],['گرد',0],['چهارگوش',0],['آفتابی',30]];
var HAT=[['بدون کلاه',0],['کلاه کپ',0],['کلاه نمدی',40],['تاج',80],['گل',0]];
var HEAD_D=[
 'M50 24.5C64.5 24.5 69.5 36 69 47C68.5 60.5 59.5 69.5 50 69.5C40.5 69.5 31.5 60.5 31 47C30.5 36 35.5 24.5 50 24.5Z',
 'M50 22.5C63.5 22.5 68 35 67.5 46C67 61 58.5 72 50 72C41.5 72 33 61 32.5 46C32 35 36.5 22.5 50 22.5Z',
 'M50 24.5C63.5 24.5 69.5 30 69.8 43C70 57 65.5 69.5 50 69.5C34.5 69.5 30 57 30.2 43C30.5 30 36.5 24.5 50 24.5Z'];

function avatarSvg(s){
  var n='a'+(++uid), sk=SKIN[s.skin], hc=HAIRC[s.hairC], bgc=BG[s.bg], cl=CLOTH[s.cloth];
  var skL=lite(sk,.35), skD=dark(sk,.18), skDD=dark(sk,.32);
  var hL=lite(hc,.3), hD=dark(hc,.35), clL=lite(cl,.25), clD=dark(cl,.28);
  var lip=mix(sk,'#b8424f',.55), ink='#2a1710';
  var cy=s.head===1?47:46.5;
  var o='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>'+
   '<radialGradient id="'+n+'b" cx=".35" cy=".25" r=".95"><stop offset="0" stop-color="'+lite(bgc,.35)+'"/><stop offset=".6" stop-color="'+bgc+'"/><stop offset="1" stop-color="'+dark(bgc,.22)+'"/></radialGradient>'+
   '<radialGradient id="'+n+'f" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="'+skL+'"/><stop offset=".55" stop-color="'+sk+'"/><stop offset="1" stop-color="'+skD+'"/></radialGradient>'+
   '<linearGradient id="'+n+'n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+skDD+'"/><stop offset="1" stop-color="'+skD+'"/></linearGradient>'+
   '<linearGradient id="'+n+'c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+clL+'"/><stop offset="1" stop-color="'+clD+'"/></linearGradient>'+
   '<linearGradient id="'+n+'h" gradientUnits="userSpaceOnUse" x1="28" y1="14" x2="72" y2="92"><stop offset="0" stop-color="'+mix(hc,hL,.6)+'"/><stop offset=".4" stop-color="'+hc+'"/><stop offset="1" stop-color="'+mix(hc,hD,.7)+'"/></linearGradient>'+
   '<radialGradient id="'+n+'k"><stop offset="0" stop-color="#ff7a85" stop-opacity=".5"/><stop offset="1" stop-color="#ff7a85" stop-opacity="0"/></radialGradient>'+
   '<radialGradient id="'+n+'i" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="'+lite(EYE_C[s.skin>=3?0:(s.hairC===3?1:0)],.25)+'"/><stop offset="1" stop-color="'+dark(EYE_C[s.skin>=3?0:(s.hairC===3?1:0)],.35)+'"/></radialGradient>'+
   '<linearGradient id="'+n+'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e08a"/><stop offset=".5" stop-color="#e2a63a"/><stop offset="1" stop-color="#a8741c"/></linearGradient>'+
   '<clipPath id="'+n+'p"><circle cx="50" cy="50" r="50"/></clipPath></defs>';
  o+='<g clip-path="url(#'+n+'p)"><rect width="100" height="100" fill="url(#'+n+'b)"/>';
  // soft light spot on the background
  o+='<ellipse cx="30" cy="22" rx="26" ry="16" fill="#fff" opacity=".12"/>';
  // ---- back hair ----
  if(s.hair===3) o+='<path d="M29 47C22 28 34 13.5 50 13.5C66 13.5 78 28 71 47C74.5 58 76.5 70 74 86C66 90 34 90 26 86C23.5 70 25.5 58 29 47Z" fill="url(#'+n+'h)"/><path d="M33 60C32 72 33 80 35 87M67 60C68 72 67 80 65 87" stroke="'+hD+'" stroke-width="1" fill="none" opacity=".35" stroke-linecap="round"/>';
  if(s.hair===4) o+='<circle cx="50" cy="16" r="7.5" fill="url(#'+n+'h)"/><path d="M45 14.5C48 12 52 12 55 14.5" stroke="'+hL+'" stroke-width="1.1" fill="none" opacity=".7" stroke-linecap="round"/>';
  // ---- torso ----
  o+='<path d="M8 101C9 82 26 73 50 73C74 73 91 82 92 101Z" fill="url(#'+n+'c)"/>'+
     '<path d="M8 101C9 82 26 73 50 73" fill="none" stroke="'+clL+'" stroke-width="1" opacity=".55"/>'+
     '<path d="M30 80C28 88 27 94 27 101M70 80C72 88 73 94 73 101" stroke="'+clD+'" stroke-width=".9" opacity=".35" fill="none"/>';
  // neck + chin shadow
  o+='<path d="M42.5 60L42.5 73.5Q50 79.5 57.5 73.5L57.5 60Z" fill="url(#'+n+'n)"/>'+
     '<path d="M41 73C44 78.5 56 78.5 59 73L57.5 71.5Q50 76 42.5 71.5Z" fill="'+clD+'" opacity=".5"/>'+
     '<path d="M44 73.2Q50 81 56 73.2" fill="none" stroke="'+clL+'" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>';
  // ears
  o+='<ellipse cx="31.2" cy="49" rx="3.3" ry="5.2" fill="'+skD+'"/><ellipse cx="68.8" cy="49" rx="3.3" ry="5.2" fill="'+skD+'"/>'+
     '<ellipse cx="31.6" cy="49.4" rx="1.5" ry="3" fill="'+skDD+'" opacity=".5"/><ellipse cx="68.4" cy="49.4" rx="1.5" ry="3" fill="'+skDD+'" opacity=".5"/>';
  // head
  o+='<path d="'+HEAD_D[s.head]+'" fill="url(#'+n+'f)" stroke="'+dark(sk,.3)+'" stroke-width=".55" stroke-opacity=".5"/>';
  // under-hair/forehead shade and chin light
  o+='<ellipse cx="50" cy="63" rx="9" ry="4" fill="'+skL+'" opacity=".22"/>';
  // cheeks
  o+='<ellipse cx="37.5" cy="57" rx="5.2" ry="3.4" fill="url(#'+n+'k)"/><ellipse cx="62.5" cy="57" rx="5.2" ry="3.4" fill="url(#'+n+'k)"/>';
  // beard (under the face features)
  if(s.beard===1) o+='<path d="M31.4 50C32 63 40 70.5 50 70.5C60 70.5 68 63 68.6 50C66 59 59 64 50 64C41 64 34 59 31.4 50Z" fill="'+hc+'" opacity=".42"/>';
  if(s.beard===2) o+='<path d="M30.6 49C30.4 66 39.5 74.5 50 74.5C60.5 74.5 69.6 66 69.4 49C68 55.5 64.5 58.6 60.5 59.4C57 57.6 54 58.4 50 58.4C46 58.4 43 57.6 39.5 59.4C35.5 58.6 32 55.5 30.6 49Z" fill="url(#'+n+'h)"/>'+
     '<path d="M36 66C42 71 58 71 64 66" stroke="'+hL+'" stroke-width="1" opacity=".5" fill="none" stroke-linecap="round"/>';
  // nose
  o+='<ellipse cx="50" cy="51.5" rx="1.1" ry="3" fill="'+skL+'" opacity=".45"/>'+
     '<path d="M47.3 56.4Q50 58.3 52.7 56.4" fill="none" stroke="'+skDD+'" stroke-width="1.15" stroke-linecap="round"/>'+
     '<ellipse cx="50" cy="56.8" rx="3.2" ry="1" fill="'+skDD+'" opacity=".16"/>';
  // mouth
  var my=61.8;
  if(s.beard===2) o+='<ellipse cx="50" cy="'+(my+.4)+'" rx="7.6" ry="4" fill="'+sk+'"/>';
  if(s.mouth===0) o+='<path d="M44.8 '+(my-1)+'Q50 '+(my+4.2)+' 55.2 '+(my-1)+'" fill="none" stroke="'+mix(lip,'#5a1c26',.5)+'" stroke-width="1.5" stroke-linecap="round"/><path d="M46.4 '+(my+1.4)+'Q50 '+(my+4.4)+' 53.6 '+(my+1.4)+'Q50 '+(my+2.2)+' 46.4 '+(my+1.4)+'Z" fill="'+lip+'" opacity=".75"/>';
  if(s.mouth===1) o+='<path d="M43.6 '+(my-1.6)+'Q50 '+(my-.4)+' 56.4 '+(my-1.6)+'Q55 '+(my+6.8)+' 50 '+(my+6.8)+'Q45 '+(my+6.8)+' 43.6 '+(my-1.6)+'Z" fill="#5c1a24"/>'+
     '<path d="M44.5 '+(my-1.1)+'Q50 '+(my+.1)+' 55.5 '+(my-1.1)+'L55 '+(my+1.5)+'Q50 '+(my+2.4)+' 45 '+(my+1.5)+'Z" fill="#fffaf2"/>'+
     '<ellipse cx="50" cy="'+(my+5.2)+'" rx="3.4" ry="1.7" fill="#e0707b"/>'+
     '<path d="M43.6 '+(my-1.6)+'Q50 '+(my-.4)+' 56.4 '+(my-1.6)+'" fill="none" stroke="'+mix(lip,'#5a1c26',.4)+'" stroke-width="1.1" stroke-linecap="round"/>';
  if(s.mouth===2) o+='<path d="M45.6 '+(my+.4)+'Q50 '+(my+1.4)+' 54.4 '+(my+.4)+'" fill="none" stroke="'+mix(lip,'#5a1c26',.5)+'" stroke-width="1.5" stroke-linecap="round"/><path d="M46.6 '+(my+1.2)+'Q50 '+(my+3)+' 53.4 '+(my+1.2)+'Z" fill="'+lip+'" opacity=".6"/>';
  if(s.mouth===3) o+='<path d="M45 '+(my+.8)+'Q50 '+(my+3)+' 56.6 '+(my-1.6)+'" fill="none" stroke="'+mix(lip,'#5a1c26',.5)+'" stroke-width="1.5" stroke-linecap="round"/><path d="M56.6 '+(my-1.6)+'q1.4 -.4 1.8 .6" stroke="'+skDD+'" stroke-width="1" fill="none" stroke-linecap="round"/>';
  // moustache
  if(s.beard===3) o+='<path d="M41.5 '+(my-3.4)+'Q45.5 '+(my-6.2)+' 50 '+(my-4)+'Q54.5 '+(my-6.2)+' 58.5 '+(my-3.4)+'Q54.5 '+(my-1.2)+' 50 '+(my-2.6)+'Q45.5 '+(my-1.2)+' 41.5 '+(my-3.4)+'Z" fill="url(#'+n+'h)"/>';
  // eyes
  [[41.2,-1],[58.8,1]].forEach(function(e){
    var x=e[0],d=e[1],y=47.6;
    if(s.eyes===1){ o+='<path d="M'+(x-4.4)+' '+(y+1.2)+'Q'+x+' '+(y-4.4)+' '+(x+4.4)+' '+(y+1.2)+'" fill="none" stroke="'+ink+'" stroke-width="2" stroke-linecap="round"/>'; return; }
    var rx=s.eyes===2?5.1:4.5, ry=s.eyes===2?4.7:3.9, ir=s.eyes===2?3.5:3;
    o+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#fffdf9"/>'+
       '<ellipse cx="'+x+'" cy="'+(y-.2)+'" rx="'+rx+'" ry="'+ry+'" fill="none" stroke="'+dark(sk,.35)+'" stroke-width=".4" opacity=".5"/>'+
       '<circle cx="'+(x+d*.2)+'" cy="'+(y+.15)+'" r="'+ir+'" fill="url(#'+n+'i)"/>'+
       '<circle cx="'+(x+d*.2)+'" cy="'+(y+.15)+'" r="'+(ir*.48)+'" fill="#0b0605"/>'+
       '<circle cx="'+(x+d*.2-1)+'" cy="'+(y-1.1)+'" r="'+(ir*.34)+'" fill="#fff"/><circle cx="'+(x+d*.2+1.05)+'" cy="'+(y+1.3)+'" r="'+(ir*.16)+'" fill="#fff" opacity=".85"/>';
    // upper lid line and lashes
    var lidY=s.eyes===3?y-.6:y-ry*.6;
    if(s.eyes===3) o+='<path d="M'+(x-rx-.2)+' '+(y-ry-.6)+'L'+(x+rx+.2)+' '+(y-ry-.6)+'L'+(x+rx+.2)+' '+(lidY)+'Q'+x+' '+(lidY+1.3)+' '+(x-rx-.2)+' '+lidY+'Z" fill="'+sk+'"/>';
    o+='<path d="M'+(x-rx-.3)+' '+(s.eyes===3?lidY:y-.4)+'Q'+x+' '+(s.eyes===3?lidY+1.2:y-ry*1.55)+' '+(x+rx+.3)+' '+(s.eyes===3?lidY:y-.4)+'" fill="none" stroke="'+ink+'" stroke-width="1.5" stroke-linecap="round"/>'+
       '<path d="M'+(x+d*(rx+.1))+' '+(y-.8)+'l'+(d*1.6)+' -1.6" stroke="'+ink+'" stroke-width="1.1" stroke-linecap="round"/>'+
       '<path d="M'+(x-rx+.8)+' '+(y+ry-.4)+'Q'+x+' '+(y+ry+.9)+' '+(x+rx-.8)+' '+(y+ry-.4)+'" fill="none" stroke="'+skDD+'" stroke-width=".5" opacity=".5"/>';
  });
  // brows
  [[41.2,-1],[58.8,1]].forEach(function(e){var x=e[0],d=e[1],t=-d,by=s.eyes===2?39.6:40.6,lift=(s.mouth===3&&d===1)?-1.4:0;
    var inX=x+t*5.2,outX=x-t*5.6,mX=x-t*.4;
    o+='<path d="M'+inX+' '+(by+.8)+'Q'+mX+' '+(by-2.8+lift)+' '+outX+' '+(by+1+lift)+'Q'+mX+' '+(by-.9+lift)+' '+inX+' '+(by+3)+'Z" fill="'+(s.hair===0?dark(sk,.5):hD)+'" opacity=".92"/>';});
  // hair (front)
  var hf='fill="url(#'+n+'h)"';
  if(s.hair===1) o+='<path d="M30.4 47C27.6 29 37 19.6 50.4 19.8C64 20 72.4 29.6 69.4 47C67.6 41 65 37.6 61 36C55.5 39.6 44 39.4 37.5 35.4C34.4 38.2 32 42 30.4 47Z" '+hf+'/>'+
     '<path d="M38.5 26C42 23 47 22 52 22.4M33.5 33C34.5 30 36.5 28 39 26.5M58 24.5C62 25.6 65.5 28 67.4 32" stroke="'+hL+'" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".6"/>';
  if(s.hair===2){ var cs=[[33,41,5],[31,34,5.6],[34,27,6],[41,22,6.3],[50,20,6.4],[59,22,6.3],[66,27,6],[69,34,5.6],[67,41,5],[41,33,5],[50,31.5,5.2],[59,33,5],[45,27,5.3],[55,27,5.3]];
    cs.forEach(function(c){o+='<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+c[2]+'" '+hf+' stroke="'+hD+'" stroke-width=".5" stroke-opacity=".5"/>';});
    [[41,21,2.2],[52,19,2.4],[62,24,2],[33,31,1.8]].forEach(function(c){o+='<path d="M'+(c[0]-c[2])+' '+c[1]+'q'+c[2]+' -'+c[2]+' '+(c[2]*2)+' 0" stroke="'+hL+'" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".65"/>';});}
  if(s.hair===3) o+='<path d="M50 19C38 19.4 30.4 28 30.4 47C33 41.6 37 38.2 42 35.8C46.6 33.4 49.4 27.4 50 19Z" '+hf+'/><path d="M50 19C62 19.4 69.6 28 69.6 47C67 41.6 63 38.2 58 35.8C53.4 33.4 50.6 27.4 50 19Z" '+hf+'/>'+
     '<path d="M44.5 21.5C38 23.5 33.6 29 32.4 37M55.5 21.5C62 23.5 66.4 29 67.6 37" stroke="'+hL+'" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".6"/>'+
     '<path d="M36.5 33C40 32 43 30.4 45.6 27M63.5 33C60 32 57 30.4 54.4 27" stroke="'+hD+'" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".4"/>'+
     '<path d="M30.2 49C25.6 58 29.4 64 26.6 73C24.6 79 26.6 84 30.4 87.4C35.2 84.4 37.8 79 36.8 72C36 65 37.2 58.4 33.6 51Z" '+hf+'/><path d="M69.8 49C74.4 58 70.6 64 73.4 73C75.4 79 73.4 84 69.6 87.4C64.8 84.4 62.2 79 63.2 72C64 65 62.8 58.4 66.4 51Z" '+hf+'/>'+
     '<path d="M30.6 55C28.8 62 31 68 29.2 76M69.4 55C71.2 62 69 68 70.8 76" stroke="'+hL+'" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".55"/><path d="M33.4 60C33 68 34.2 75 33 82M66.6 60C67 68 65.8 75 67 82" stroke="'+hD+'" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".4"/>';
  if(s.hair===4) o+='<path d="M30.4 46C28.4 30 38 21.6 50 21.6C62 21.6 71.6 30 69.6 46C67.6 40 64.4 36.4 59.6 34.6C55.6 36.8 44.4 36.8 40.4 34.6C35.6 36.4 32.4 40 30.4 46Z" '+hf+'/>'+
     '<path d="M40 25.5C44 23.4 48 22.8 52 23" stroke="'+hL+'" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".6"/><rect x="45.5" y="19.5" width="9" height="2.6" rx="1.3" fill="'+hD+'"/>';
  if(s.hair===5) o+='<path d="M30.2 47.5C27 29 36.4 19.6 50 19.6C64 19.6 72.8 29 69.6 47.5C68.6 42 66.4 38.4 62.4 36.2C56 33.6 48 36.2 43 41.4C40.4 38.4 37 38.2 34.2 41.6C32.2 43.2 31 45.4 30.2 47.5Z" '+hf+'/>'+
     '<path d="M36 38C43 31 53 28.6 63 32" stroke="'+hL+'" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".55"/><path d="M40.6 23.8C45 21.6 50 21.2 55 22.4" stroke="'+hL+'" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".55"/>';
  // glasses
  if(s.glass){
    var fr=s.glass===3?'#14100e':'#2a2a30';
    [41.2,58.8].forEach(function(x){
      if(s.glass===1) o+='<circle cx="'+x+'" cy="47.8" r="6.6" fill="#cfe6ff" fill-opacity=".14" stroke="'+fr+'" stroke-width="1.5"/><path d="M'+(x-3.8)+' 44.6Q'+(x-2)+' 42.6 '+(x+.4)+' 42.4" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round" opacity=".7"/>';
      if(s.glass===2) o+='<rect x="'+(x-6.9)+'" y="42.4" width="13.8" height="10.8" rx="3.2" fill="#cfe6ff" fill-opacity=".14" stroke="'+fr+'" stroke-width="1.5"/><path d="M'+(x-4.4)+' 45Q'+(x-2.6)+' 43.8 '+(x-.4)+' 43.8" stroke="#fff" stroke-width="1" fill="none" stroke-linecap="round" opacity=".7"/>';
      if(s.glass===3) o+='<rect x="'+(x-7)+'" y="42.2" width="14" height="10.6" rx="4" fill="'+fr+'"/><path d="M'+(x-5)+' 44.6Q'+(x-2.8)+' 43.4 '+(x-.2)+' 43.4" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".5"/>';});
    o+='<path d="M47.8 46.6Q50 45 52.2 46.6" stroke="'+fr+'" stroke-width="1.4" fill="none"/><path d="M34.6 47L31.4 46.2M65.4 47L68.6 46.2" stroke="'+fr+'" stroke-width="1.3" stroke-linecap="round"/>';}
  // hats
  if(s.hat===1){var hcol=CLOTH[(s.cloth+3)%8];o+='<path d="M29.4 38C29 23.6 39 16.4 50.4 16.6C62 16.8 71 24 70.6 38Z" fill="'+hcol+'"/><path d="M29.4 38C29 23.6 39 16.4 50.4 16.6" fill="none" stroke="'+lite(hcol,.4)+'" stroke-width="1.2" opacity=".6"/><path d="M50 16.6L50 38M40 19.4Q42 28 41 38M60 19.4Q58 28 59 38" stroke="'+dark(hcol,.3)+'" stroke-width=".8" fill="none" opacity=".4"/><circle cx="50.4" cy="16.8" r="1.5" fill="'+dark(hcol,.25)+'"/><path d="M26.4 38.6Q50 32 73.6 38.6Q72 44.6 50 43.6Q28 44.6 26.4 38.6Z" fill="'+dark(hcol,.2)+'"/>';}
  if(s.hat===2){o+='<path d="M33 37C33 24 40 18.6 50 18.6C60 18.6 67 24 67 37Z" fill="#d6c8a0"/><path d="M33 37C33 24 40 18.6 50 18.6" fill="none" stroke="#efe3c0" stroke-width="1.2" opacity=".7"/><path d="M33 34.4Q50 38.4 67 34.4L67 37.4Q50 41.4 33 37.4Z" fill="#7a6a44"/><path d="M19 39.6Q50 30.4 81 39.6Q79 46 50 44.4Q21 46 19 39.6Z" fill="#c4b588"/><path d="M19 39.6Q50 30.4 81 39.6" fill="none" stroke="#efe3c0" stroke-width="1" opacity=".6"/>';}
  if(s.hat===3){o+='<path d="M31 35L31 21.6L39 28.4L44.6 15.6L50 27.2L55.4 15.6L61 28.4L69 21.6L69 35Q50 39.4 31 35Z" fill="url(#'+n+'g)" stroke="#8a5d14" stroke-width=".8"/><path d="M31 31.6Q50 36 69 31.6" fill="none" stroke="#fff3c4" stroke-width=".9" opacity=".6"/><circle cx="50" cy="31.6" r="2" fill="#d63a4a" stroke="#fff3c4" stroke-width=".5"/><circle cx="40.2" cy="32.4" r="1.4" fill="#2fb1a6"/><circle cx="59.8" cy="32.4" r="1.4" fill="#2fb1a6"/><circle cx="44.6" cy="16" r="1.4" fill="#d63a4a"/><circle cx="55.4" cy="16" r="1.4" fill="#d63a4a"/>';}
  if(s.hat===4){var cx=66,cy2=29;for(var k=0;k<5;k++){var a=k/5*6.2832;o+='<ellipse cx="'+(cx+Math.cos(a)*4.4)+'" cy="'+(cy2+Math.sin(a)*4.4)+'" rx="3.6" ry="2.7" transform="rotate('+(a*57.3)+' '+(cx+Math.cos(a)*4.4)+' '+(cy2+Math.sin(a)*4.4)+')" fill="#f27a52" stroke="#d2552f" stroke-width=".5"/>';}o+='<circle cx="'+cx+'" cy="'+cy2+'" r="2.6" fill="#f6c945" stroke="#c99a1c" stroke-width=".5"/>';}
  o+='</g></svg>';return o;}
var PRICES={hair:{3:30},beard:{2:40},glass:{3:30},hat:{2:40,3:80},cover:{7:60},ring:{3:40,4:60}};
var DEFAULT_LOOK={skin:1,head:0,hair:1,hairC:1,eyes:0,mouth:0,beard:0,glass:0,hat:0,cloth:0,bg:0};
var LISTS={skin:SKIN,head:HEAD,hair:HAIR,hairC:HAIRC,eyes:EYES,mouth:MOUTH,beard:BEARD,glass:GLASS,hat:HAT,cloth:CLOTH,bg:BG,cover:COVERS,ring:RING};
window.NBAvatar={SKIN:SKIN,HAIRC:HAIRC,BG:BG,CLOTH:CLOTH,RING:RING,HEAD:HEAD,HAIR:HAIR,EYES:EYES,MOUTH:MOUTH,BEARD:BEARD,GLASS:GLASS,HAT:HAT,COVERS:COVERS,PRICES:PRICES,DEFAULT_LOOK:DEFAULT_LOOK,LISTS:LISTS,
  svg:avatarSvg,
  cover:function(i){return '<svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'+COVERS[i][2]()+'</svg>'}};
})();
