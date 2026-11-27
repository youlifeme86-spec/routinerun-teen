/* 스터디아 레이스 지도 — 출발점에서 '스터디아 성'까지 구불구불한 픽셀 길 위에
   모험가들이 점수만큼 나아가 있는 랭킹 지도.
   - window.RRRACE.mount(el, {players, goal, base, label, compact})
     players: [{id, name, color, gender, job, score, rank, me}]
   - 이름표는 캐릭터·다른 이름표·출발/성 표지와 겹치지 않는 자리를 골라 붙여요.
     자리가 없으면 순위 숫자만, 그래도 없으면 이름표를 숨기고 캐릭터를 눌러 확인해요.
   - art.js(RRART) 가 있으면 앱과 같은 픽셀 캐릭터를 써요. */
(function(){
'use strict';
var P=3; /* 지도 1칸 = 화면 3px */
var C={sky:'#B9ECF8',sky2:'#86D9F0',grass:'#7CC651',grass2:'#6DB845',grassD:'#5DA534',road:'#F4DDAA',roadE:'#A97B4F',dash:'#FFF6DE',
  ink:'#2B1D16',wall:'#EADFCB',wallD:'#BFAF97',roof:'#8C5BD6',roofL:'#B48CF0',door:'#7A4A2B',gold:'#F7C531',win:'#F7C531',
  leaf:'#4FA34A',leafL:'#8BD46C',leafD:'#2E6B33',trunk:'#7A4A2B',mush:'#E2453C',cloud:'#FFFFFF',cloudS:'#D3ECFA'};

/* ---------- 길 모양 (0~1 좌표, 출발 → 성) ---------- */
var PATHS={
  wide:[[.035,.86],[.16,.86],[.25,.80],[.22,.64],[.30,.56],[.44,.62],[.58,.66],[.67,.56],[.60,.44],[.66,.33],[.78,.38],[.88,.33],[.90,.30]],
  tall:[[.07,.885],[.30,.885],[.40,.82],[.22,.71],[.30,.61],[.62,.63],[.80,.54],[.70,.43],[.34,.41],[.24,.31],[.42,.22],[.64,.25],[.76,.24]]
};
var CASTLE_AT={wide:[.905,.27],tall:[.80,.19]};

function crSample(pts,W,H,per){var out=[];var p=pts.map(function(q){return [q[0]*W,q[1]*H]});
  for(var i=0;i<p.length-1;i++){var p0=p[Math.max(0,i-1)],p1=p[i],p2=p[i+1],p3=p[Math.min(p.length-1,i+2)];
    for(var s=0;s<per;s++){var t=s/per,t2=t*t,t3=t2*t;
      out.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)])}}
  out.push(p[p.length-1]);
  var L=[0];for(var j=1;j<out.length;j++)L.push(L[j-1]+Math.hypot(out[j][0]-out[j-1][0],out[j][1]-out[j-1][1]));
  return {pts:out,len:L,total:L[L.length-1]}}
function at(path,t){var d=Math.max(0,Math.min(1,t))*path.total;var L=path.len,i=1;while(i<L.length-1&&L[i]<d)i++;
  var a=path.pts[i-1],b=path.pts[i],seg=(L[i]-L[i-1])||1,f=(d-L[i-1])/seg;var dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;
  return {x:a[0]+dx*f,y:a[1]+dy*f,nx:-dy/n,ny:dx/n}}

/* ---------- 작은 픽셀 그림 ---------- */
var ART={
  tree:["..llll..",".lLLlll.","lLLllllD","llllllDD",".lllDDD.","...tt...","...tt..."],
  mush:[".rrr.","rwrrw","rrrrr","..w..",".www."],
  cloud:["...cccc.....","..cccccccc..",".cccccccccc.","cccccccccccc","sssssssssss."],
  flag:["k","kyy","kyyy","kyy","k","k"],
  castle:[
   "..............ky..............",
   "..............kyyy............",
   "..............kyy.............",
   "..............k...............",
   ".............vvv..............",
   "............vVvvv.............",
   "...........vVvvvvv............",
   "k.k.k......vVvvvvv......k.k.k.",
   "kkkkk.....vVvvvvvvv.....kkkkk.",
   "kwwwk.k.k.kkkkkkkkk.k.k.kwwwk.",
   "kwwwkkkkkkkwwwwwwwkkkkkkkwwwk.",
   "kwywkwwwwwkwwwwwwwkwwwwwkwywk.",
   "kwwwkwwwwwkwwyyywwkwwwwwkwwwk.",
   "kwwwkwwwwwkwwwwwwwkwwwwwkwwwk.",
   "kwwwkwwwwwwwwwwwwwwwwwwwkwwwk.",
   "kwywkwwwwwwwwdddwwwwwwwwkwywk.",
   "kwwwkwwwwwwwddddddwwwwwwkwwwk.",
   "kwwwkwwwwwwwddddddwwwwwwkwwwk.",
   "kwwwkwwwwwwwddddddwwwwwwkwwwk.",
   "kkkkkkkkkkkkkkkkkkkkkkkkkkkkk."]
};
var APAL={l:C.leaf,L:C.leafL,D:C.leafD,t:C.trunk,r:C.mush,w:'#FFF6DE',c:C.cloud,s:C.cloudS,k:C.ink,y:C.gold,v:C.roof,V:C.roofL,d:C.door};
function stamp(g,rows,x,y,pal){pal=pal||APAL;rows.forEach(function(r,j){for(var i=0;i<r.length;i++){var ch=r[i];if(ch==='.')continue;g.fillStyle=pal[ch]||'#f0f';g.fillRect(x+i,y+j,1,1)}})}
function castlePal(){var p=Object.assign({},APAL);p.w=C.wall;return p}

function rng(seed){var s=seed>>>0||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}

/* ---------- 배경 그리기 (저해상도 → 확대) ---------- */
function drawBG(cv,W,H,path,kind,pw){
  var w=Math.ceil(W/P),h=Math.ceil(H/P);cv.width=w;cv.height=h;cv.style.width=W+'px';cv.style.height=H+'px';
  var g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  var hz=Math.round(h*(kind==='wide'?.17:.11));
  g.fillStyle=C.sky2;g.fillRect(0,0,w,Math.ceil(hz/2));g.fillStyle=C.sky;g.fillRect(0,Math.ceil(hz/2),w,hz);
  g.fillStyle=C.grass;g.fillRect(0,hz,w,h-hz);g.fillStyle=C.grass2;g.fillRect(0,hz,w,2);
  var R=rng(w*31+h*7);
  for(var i=0;i<Math.round(w*h/260);i++){var x=Math.floor(R()*w),y=hz+3+Math.floor(R()*(h-hz-3));g.fillStyle=C.grassD;g.fillRect(x,y,1,2);g.fillRect(x+1,y-1,1,2)}
  stamp(g,ART.cloud,Math.round(w*.12),Math.max(1,Math.round(hz*.25)));stamp(g,ART.cloud,Math.round(w*.55),Math.max(1,Math.round(hz*.1)));
  /* 길: 바깥 테두리 → 흙길 → 가운데 점선 */
  var r=Math.max(3,Math.round(pw/P/2));
  var lo=path.pts.map(function(p){return [Math.round(p[0]/P),Math.round(p[1]/P)]});
  function disc(cx,cy,rr,col){g.fillStyle=col;for(var dy=-rr;dy<=rr;dy++){var dx=Math.floor(Math.sqrt(rr*rr-dy*dy+rr*.6));g.fillRect(cx-dx,cy+dy,dx*2+1,1)}}
  lo.forEach(function(p){disc(p[0],p[1]+1,r+1,'#8E6440')});
  lo.forEach(function(p){disc(p[0],p[1],r+1,C.roadE)});
  lo.forEach(function(p){disc(p[0],p[1],r,C.road)});
  var acc=0;for(var k=1;k<lo.length;k++){acc+=Math.hypot(lo[k][0]-lo[k-1][0],lo[k][1]-lo[k-1][1]);if(acc%9<4.2){g.fillStyle=C.dash;g.fillRect(lo[k][0],lo[k][1],2,1)}}
  /* 장식: 길·성과 떨어진 곳에 나무·버섯 */
  var ca=CASTLE_AT[kind];var cx=ca[0]*w,cy=ca[1]*h;var placed=[];
  function farFromPath(x,y,m){for(var q=0;q<lo.length;q+=2){if(Math.hypot(lo[q][0]-x,lo[q][1]-y)<r+m)return false}return true}
  var nT=Math.round(w*h/1700),tries=0;
  while(placed.length<nT&&tries<400){tries++;var tx=Math.floor(R()*(w-10)),ty=hz+2+Math.floor(R()*(h-hz-10));
    if(!farFromPath(tx+4,ty+4,9))continue;if(Math.abs(tx+4-cx)<22&&Math.abs(ty+4-cy)<16)continue;
    if(placed.some(function(p){return Math.hypot(p[0]-tx,p[1]-ty)<14}))continue;placed.push([tx,ty]);
    if(R()<.65)stamp(g,ART.tree,tx,ty);else stamp(g,ART.mush,tx+1,ty+2)}
  /* 성 */
  var cp=castlePal();stamp(g,ART.castle,Math.round(cx-15),Math.round(cy-ART.castle.length+2),cp);
}

/* ---------- 겹침 검사 ---------- */
function hit(a,b,pad){pad=pad||0;return a.x<b.x+b.w+pad&&b.x<a.x+a.w+pad&&a.y<b.y+b.h+pad&&b.y<a.y+a.h+pad}
function overlapArea(a,b){var x=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return x*y}

/* 캐릭터 그림의 실제 칠해진 범위(빈 여백 제외) */
var bbCache={};
function spriteBox(cv,key){if(bbCache[key])return bbCache[key];var b={x:0,y:0,w:cv.width,h:cv.height};
  try{var d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,x0=cv.width,y0=cv.height,x1=-1,y1=-1;
    for(var y=0;y<cv.height;y++)for(var x=0;x<cv.width;x++){if(d[(y*cv.width+x)*4+3]>20){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
    if(x1>=0)b={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}}catch(e){}
  return bbCache[key]=b}
function makeSprite(p){var cv=null;try{cv=window.RRART&&window.RRART.make(p.gender==='남'?'heroM':'hero',2,{hero:p.color||'#EE7FAE',job:p.job||''})}catch(e){cv=null}
  if(!cv){cv=document.createElement('canvas');cv.width=20;cv.height=26;var g=cv.getContext('2d');g.fillStyle=C.ink;g.fillRect(4,2,12,22);g.fillStyle=p.color||'#EE7FAE';g.fillRect(5,3,10,20)}
  return cv}

var CSS=`.rr-race{position:relative;overflow:hidden;background:#7CC651;box-shadow:0 -3px 0 #2B1D16,0 3px 0 #2B1D16,-3px 0 0 #2B1D16,3px 0 0 #2B1D16;margin:3px;user-select:none;-webkit-user-select:none;touch-action:pan-y}
.rr-race canvas{image-rendering:pixelated;image-rendering:crisp-edges;display:block}
.rr-race .bg{position:absolute;left:0;top:0}
.rr-race .ch{position:absolute;line-height:0;cursor:pointer}
.rr-race .ch canvas{display:block}
.rr-race .ch.me{filter:drop-shadow(0 0 0 #F7C531)}
.rr-race .tg{position:absolute;white-space:nowrap;background:#fff;color:#2B1D16;font:700 12px/1 'Noto Sans KR',system-ui,sans-serif;padding:4px 6px 4px;box-shadow:0 -2px 0 #2B1D16,0 2px 0 #2B1D16,-2px 0 0 #2B1D16,2px 0 0 #2B1D16;pointer-events:none}
.rr-race .tg.me{background:#F7C531}
.rr-race .tg.mini{padding:3px 4px;font-size:11px}
.rr-race .tg.sign{background:#2B1D16;color:#F6E3B4}
.rr-race .tg.castle{background:#fff;font-size:13px}
.rr-race .tg.wait{background:rgba(255,251,234,.92);font-weight:500}
.rr-race .tip{position:absolute;z-index:5;background:#2B1D16;color:#FFF4D6;font:500 12px/1.35 'Noto Sans KR',system-ui,sans-serif;padding:6px 8px;pointer-events:none;max-width:70%}
.rr-race-cap{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:#6E5844;margin:2px 3px 0}
@media (min-width:760px){.rr-race .tg{font-size:13px}}`;
function injectCSS(){if(document.getElementById('rr-race-css'))return;var s=document.createElement('style');s.id='rr-race-css';s.textContent=CSS;document.head.appendChild(s)}
var MEDAL=['🥇','🥈','🥉'];
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

/* ---------- 지도 그리기 ---------- */
function layout(root,opt){
  var W=Math.floor(root.clientWidth);if(W<120)return;
  var kind=(!opt.compact&&W>=560)?'wide':'tall';
  var nRun=(opt.players||[]).filter(function(p){return p.score>0||p.me}).length;var crowd=1+Math.min(.45,Math.max(0,nRun-8)*.04);
  var H=kind==='wide'?Math.round(Math.max(260,Math.min(460,W*.40))):Math.round(Math.max(300,Math.min(640,W*(opt.compact?.95:1.12)*crowd)));
  if(root._lastKey===W+'|'+H+'|'+opt._sig)return;root._lastKey=W+'|'+H+'|'+opt._sig;
  root.style.height=H+'px';root.innerHTML='';
  var pw=kind==='wide'?Math.max(24,Math.min(34,W*.03)):Math.max(22,Math.min(30,W*.07));
  var path=crSample(PATHS[kind],W,H,16);
  var bg=document.createElement('canvas');bg.className='bg';root.appendChild(bg);drawBG(bg,W,H,path,kind,pw);
  var big=W>=760?1.5:1;
  var rects=[];
  function addTag(cls,html,cands,keep){var el=document.createElement('span');el.className='tg '+cls;el.innerHTML=html;el.style.visibility='hidden';root.appendChild(el);
    var w=el.offsetWidth,h=el.offsetHeight;
    for(var i=0;i<cands.length;i++){var c=cands[i](w,h);var x=Math.round(Math.max(2,Math.min(W-w-2,c[0]))),y=Math.round(c[1]);if(y<2||y+h>H-2)continue;
      var r={x:x,y:y,w:w,h:h};if(rects.some(function(o){return hit(r,o,2)}))continue;
      el.style.left=x+'px';el.style.top=y+'px';el.style.visibility='';rects.push(r);return r}
    if(keep){var c0=cands[0](w,h);var x0=Math.round(Math.max(2,Math.min(W-w-2,c0[0]))),y0=Math.round(Math.max(2,Math.min(H-h-2,c0[1])));el.style.left=x0+'px';el.style.top=y0+'px';el.style.visibility='';var r0={x:x0,y:y0,w:w,h:h};rects.push(r0);return r0}
    el.remove();return null}
  /* 출발 표지·성 이름표 (먼저 자리 잡기) */
  var s0=at(path,0);
  addTag('sign','출발',[function(w,h){return [s0.x-4,s0.y-pw/2-h-6]},function(w,h){return [s0.x,s0.y+pw/2+4]}],true);
  var ca=CASTLE_AT[kind];var cpx=ca[0]*W,cpy=ca[1]*H;
  rects.push({castle:1,x:cpx-15*P,y:cpy-(ART.castle.length-2)*P,w:29*P,h:ART.castle.length*P}); /* 성 그림 자리 */
  addTag('castle','스터디아 성',[function(w,h){return [cpx-w/2,cpy+P*2+2]},function(w,h){return [cpx-w/2,cpy+P*2+28]}],true);

  /* 선수 배치 */
  var goal=Math.max(1,opt.goal||1);
  var list=(opt.players||[]).slice();
  var waiting=list.filter(function(p){return !(p.score>0)&&!p.me});
  var run=list.filter(function(p){return p.score>0||p.me});
  run.forEach(function(p){p._t=p.score>0?.06+.94*Math.min(1,p.score/goal):.035});
  /* 순서: 나 → 순위순. 앞 사람과 겹치면 길 옆으로 비켜 서기 */
  run.sort(function(a,b){return (b.me?1:0)-(a.me?1:0)||a.rank-b.rank});
  var placedSprites=[];
  run.forEach(function(p){var cv=makeSprite(p);var key=(p.gender||'')+'|'+(p.job||'')+'|'+(p.color||'');var bb=spriteBox(cv,key);
    var sw=cv.width*big,sh=cv.height*big,bx=bb.x*big,by=bb.y*big,bw=bb.w*big,bh=bb.h*big;
    var best=null,bestA=1e9;var offs=[0,1,-1,2,-2,3,-3];var dts=[0,.012,-.012,.024,-.024];
    for(var a=0;a<dts.length&&bestA>0;a++)for(var o=0;o<offs.length;o++){var q=at(path,p._t+dts[a]);var off=offs[o]*Math.max(12,bw*.55);
      var fx=q.x+q.nx*off,fy=q.y+q.ny*off+pw*.18;var r={x:fx-bw/2,y:fy-bh+2,w:bw,h:bh}; /* 발끝 = 길 위 */
      if(r.x<1||r.x+r.w>W-1||r.y<1||r.y+r.h>H-1)continue;
      var ov=0;placedSprites.forEach(function(s){ov+=overlapArea(r,s)});rects.forEach(function(s){ov+=overlapArea(r,s)*3});
      if(ov<bestA){bestA=ov;best={fx:fx,fy:fy,r:r}}if(ov===0)break}
    if(!best){var q0=at(path,p._t);best={fx:q0.x,fy:q0.y,r:{x:q0.x-bw/2,y:q0.y-bh+2,w:bw,h:bh}}}
    var el=document.createElement('span');el.className='ch'+(p.me?' me':'');el.style.width=sw+'px';el.style.height=sh+'px';
    cv.style.width=sw+'px';cv.style.height=sh+'px';el.appendChild(cv);
    el.style.left=Math.round(best.r.x-bx)+'px';el.style.top=Math.round(best.r.y-by)+'px';el.style.zIndex=String(2+Math.round(best.fy));
    el.title=(p.rank?p.rank+'위 ':'')+p.name+' · '+p.score+'점';el.setAttribute('aria-hidden','true');
    el.onclick=function(ev){ev.stopPropagation();showTip(root,p,best.r)};
    root.appendChild(el);p._r=best.r;p._fx=best.fx;p._fy=best.fy;placedSprites.push(best.r)});
  placedSprites.forEach(function(r){rects.push(r)});
  /* 이름표: 나 → 1·2·3위 → 나머지 순위순 */
  var order=run.slice().sort(function(a,b){return (b.me?1:0)-(a.me?1:0)||a.rank-b.rank});
  var hidden=0;
  order.forEach(function(p){var r=p._r,cx=r.x+r.w/2;
    var md=p.rank>=1&&p.rank<=3&&p.score>0?MEDAL[p.rank-1]+' ':'';
    function cands(){var L=[];var ys=[function(h){return r.y+r.h+2},function(h){return r.y-h-3}];
      ys.forEach(function(fy){L.push(function(w,h){return [cx-w/2,fy(h)]})});
      L.push(function(w,h){return [r.x+r.w+3,r.y+r.h-h-2]},function(w,h){return [r.x-w-3,r.y+r.h-h-2]},function(w,h){return [r.x+r.w+3,r.y+2]},function(w,h){return [r.x-w-3,r.y+2]});
      ys.forEach(function(fy){[.15,.85,0,1].forEach(function(f){L.push(function(w,h){return [cx-w*f,fy(h)]})})});
      [function(h){return r.y+r.h+h+6},function(h){return r.y-2*h-7}].forEach(function(fy){[.5,.15,.85].forEach(function(f){L.push(function(w,h){return [cx-w*f,fy(h)]})})});
      return L}
    var t=addTag(p.me?'me':'',md+esc(p.name),cands(),false);
    if(!t&&p.name.length>4)t=addTag(p.me?'me':'',md+esc(p.name.slice(0,3))+'…',cands(),false);
    if(!t)t=addTag('mini'+(p.me?' me':''),p.me?md+'나':(md||(p.rank+'위')),cands(),!!p.me);
    if(!t)hidden++});
  if(waiting.length){addTag('wait','출발 전 '+waiting.length+'명',[function(w,h){return [s0.x-4,s0.y+pw/2+4]},function(w,h){return [s0.x+40,s0.y+pw/2+4]},function(w,h){return [s0.x-4,s0.y-pw/2-h-34]}],false)}
  root.onclick=function(){var t=root.querySelector('.tip');if(t)t.remove()};
  var lead=run.filter(function(p){return p.score>0}).sort(function(a,b){return a.rank-b.rank})[0];
  root.setAttribute('aria-label',(opt.label||'레이스 지도')+'. '+run.filter(function(p){return p.score>0}).length+'명이 달리는 중'+(lead?', 선두 '+lead.name+' '+lead.score+'점':'')+'. 성까지 '+goal+'점.');
  root._hidden=hidden;
}
function showTip(root,p,r){var o=root.querySelector('.tip');if(o)o.remove();var t=document.createElement('span');t.className='tip';
  t.innerHTML=(p.rank?'<b>'+p.rank+'위</b> ':'')+esc(p.name)+'<br>'+p.score+'점'+(p.kingdom?' · '+esc(p.kingdom):'');root.appendChild(t);
  var W=root.clientWidth;var x=Math.max(2,Math.min(W-t.offsetWidth-2,r.x+r.w/2-t.offsetWidth/2));var y=r.y-t.offsetHeight-6;if(y<2)y=r.y+r.h+6;t.style.left=x+'px';t.style.top=y+'px';
  setTimeout(function(){if(t.parentNode)t.remove()},2600)}

function mount(el,opt){if(!el)return;injectCSS();opt=opt||{};
  opt._sig=JSON.stringify((opt.players||[]).map(function(p){return [p.id,p.score,p.rank,p.me?1:0]}))+'|'+opt.goal+'|'+(opt.compact?1:0);
  el.classList.add('rr-race');el.setAttribute('role','img');el._opt=opt;el._lastKey='';
  var go=function(){try{layout(el,el._opt)}catch(e){if(window.console)console.warn('race map',e)}};
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){el._lastKey='';go()});
  go();
  if(window.ResizeObserver&&!el._ro){var tm=0;el._ro=new ResizeObserver(function(){clearTimeout(tm);tm=setTimeout(go,60)});el._ro.observe(el)}}

/* 기간별 성까지 점수: 하루 상한 45점, 주 100점, 월 300점(기준 평일 2시간). 선두가 넘으면 선두 점수가 성. */
var BASE={today:45,yesterday:45,week:100,month:300};
function goalFor(per,players){var top=0;(players||[]).forEach(function(p){if(p.score>top)top=p.score});return Math.max(BASE[per]||100,top)}

window.RRRACE={mount:mount,goalFor:goalFor,BASE:BASE};
})();
