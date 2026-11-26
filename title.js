/* 스터디아 타이틀 화면 — 앱을 열 때 한 번(탭을 닫기 전까지) 보여 주고 '모험 시작!'을 누르면 사라져요.
   학부모 링크(#parent-…)에서는 보이지 않아요. art.js 가 있으면 픽셀 캐릭터·배경을 그려요. */
(function(){
  'use strict';
  try{ if(location.hash.indexOf('#parent')===0) return; if(sessionStorage.getItem('rr-title-seen')==='1') return; }catch(e){}

  var me=null;
  try{ var a=JSON.parse(localStorage.getItem('rr-auth-v2')||'null'); var st=JSON.parse(localStorage.getItem('rr-state-v2:'+(a&&a.id||'local'))||'null'); if(st&&st.char&&st.char.name) me=st.char; }catch(e){}

  var css=
  '#rr-title{position:fixed;inset:0;z-index:9999;overflow-x:hidden;overflow-y:auto;display:flex;flex-direction:column;align-items:center;'+
    'background:linear-gradient(#BFE6FF 0%,#DDF2FF 38%,#F1F6EC 62%,#FFF4DC 100%);color:#2B1D16;font-family:"Noto Sans KR",system-ui,sans-serif;'+
    'padding:calc(env(safe-area-inset-top,0px) + 6vh) max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));transition:opacity .45s ease,transform .45s ease}'+
  '#rr-title.out{opacity:0;transform:scale(1.04);pointer-events:none}'+
  '#rr-title .tt-cloud{position:absolute;left:0;animation:ttdrift linear infinite;opacity:.95;pointer-events:none}'+
  '@keyframes ttdrift{from{transform:translateX(-160px)}to{transform:translateX(110vw)}}'+
  '#rr-title .tt-main{position:relative;z-index:2;flex:1 0 auto;justify-content:center;padding-bottom:12px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;max-width:520px;width:100%}'+
  '#rr-title .tt-eye{font-family:"Jua","Do Hyeon",sans-serif;font-size:clamp(15px,4.2vw,19px);letter-spacing:.42em;padding-left:.42em;color:#6E5844}'+
  '#rr-title .tt-logo{font-family:"Jua","Do Hyeon",sans-serif;font-weight:400;font-size:clamp(68px,22vw,128px);line-height:1;margin:2px 0 0;color:#3A2A20;letter-spacing:.02em;'+
    'text-shadow:5px 5px 0 #F7C531,9px 10px 0 rgba(43,29,22,.16);animation:ttbob 2.6s ease-in-out infinite}'+
  '@keyframes ttbob{50%{transform:translateY(-5px)}}'+
  '#rr-title .tt-badge{font-family:"Press Start 2P",ui-monospace,monospace;font-size:clamp(14px,4vw,18px);color:#fff;background:#8C5BD6;padding:10px 16px 9px;transform:rotate(-3deg);'+
    'box-shadow:0 5px 0 #5B3B8C,0 0 0 3px #2B1D16,0 8px 0 3px rgba(43,29,22,.2);margin:6px 0 8px;letter-spacing:2px}'+
  '#rr-title .tt-slogan{font-family:"Jua","Do Hyeon",sans-serif;font-size:clamp(20px,6vw,28px);line-height:1.35;color:#F26B1D;margin:4px 0 6px}'+
  '#rr-title .tt-btn{font-family:"Jua","Do Hyeon",sans-serif;font-size:clamp(22px,6.4vw,28px);color:#fff;background:#F0883E;border:0;border-radius:22px;padding:16px 46px;cursor:pointer;'+
    'box-shadow:0 6px 0 #C25E1C,0 10px 18px rgba(194,94,28,.28);margin-top:10px;transition:transform .08s}'+
  '#rr-title .tt-btn:active{transform:translateY(4px);box-shadow:0 2px 0 #C25E1C}'+
  '#rr-title .tt-btn:focus-visible{outline:4px solid #2B1D16;outline-offset:4px}'+
  '#rr-title .tt-press{font-family:"Press Start 2P",ui-monospace,monospace;font-size:11px;color:#7A6656;letter-spacing:2px;margin-top:12px;animation:ttblink 1.1s steps(2) infinite}'+
  '@keyframes ttblink{50%{opacity:.15}}'+
  '#rr-title .tt-hi{font-size:14px;color:#6E5844;margin-top:2px}'+
  '#rr-title .tt-land{position:relative;flex:none;align-self:stretch;margin:0 calc(-1*max(16px,env(safe-area-inset-right,0px))) 0 calc(-1*max(16px,env(safe-area-inset-left,0px)));height:200px;z-index:1;pointer-events:none}'+
  '#rr-title .tt-mtn{position:absolute;left:0;right:0;bottom:92px;height:96px;background-repeat:repeat-x;background-size:240px 96px;image-rendering:pixelated}'+
  '#rr-title .tt-hills{position:absolute;left:0;right:0;bottom:62px;height:60px;background-repeat:repeat-x;background-size:128px 60px;image-rendering:pixelated}'+
  '#rr-title .tt-ground{position:absolute;left:0;right:0;bottom:0;height:64px;background-repeat:repeat-x;background-size:64px 64px;image-rendering:pixelated}'+
  '#rr-title .tt-cast{position:absolute;bottom:58px;left:0;right:0;justify-content:center;display:flex;align-items:flex-end;gap:6px}'+
  '#rr-title .tt-cast > div{flex:none;animation:ttbob 1s steps(2) infinite}'+
  '#rr-title .tt-cast > div:nth-child(2){animation-delay:-.5s}'+
  '#rr-title .tt-cast > div.boss{animation:ttfloat 2.4s ease-in-out infinite;margin-left:18px}'+
  '@keyframes ttfloat{50%{transform:translateY(-8px)}}'+
  '#rr-title .tt-isle{position:absolute;top:12vh;right:6%;animation:ttfloat 4.5s ease-in-out infinite;z-index:0}'+
  '#rr-title canvas{image-rendering:pixelated;display:block}'+
  '@media (max-height:640px){#rr-title .tt-land{height:170px}#rr-title .tt-isle{display:none}#rr-title{padding-top:calc(env(safe-area-inset-top,0px) + 3vh)}}'+
  '@media (prefers-reduced-motion:reduce){#rr-title *{animation:none!important}}';
  var style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

  var el=document.createElement('div'); el.id='rr-title'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','스터디아 시작 화면');
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  el.innerHTML=
    '<div class="tt-main">'+
      '<div class="tt-eye">공부가 퀘스트가 되는 곳</div>'+
      '<h1 class="tt-logo">스터디아</h1>'+
      '<div class="tt-badge">TEEN</div>'+
      '<p class="tt-slogan">오늘의 퀘스트를 깨고<br>과목 보스를 쓰러뜨려 꿈의 문을 열자!</p>'+
      '<button class="tt-btn" id="tt-go" type="button">모험 시작!</button>'+
      '<div class="tt-press" aria-hidden="true">PRESS START</div>'+
      (me?'<div class="tt-hi">'+esc(me.name)+', 다시 돌아왔구나!</div>':'')+
    '</div>'+
    '<div class="tt-land"><div class="tt-mtn"></div><div class="tt-hills"></div><div class="tt-ground"></div><div class="tt-cast"></div></div>';
  document.body.appendChild(el);

  function art(){
    var R=window.RRART; if(!R) return;
    try{
      var A=R.scene();
      if(A.mtn){ el.querySelector('.tt-mtn').style.backgroundImage='url('+A.mtn+')'; el.querySelector('.tt-hills').style.backgroundImage='url('+A.hills+')'; el.querySelector('.tt-ground').style.backgroundImage='url('+A.ground+')'; }
      [[8,52],[22,68],[30,44]].forEach(function(p,i){var c=document.createElement('div');c.className='tt-cloud';c.style.top=p[0]+'vh';c.style.animationDuration=p[1]+'s';c.style.animationDelay=(-i*17)+'s';var cv=R.make('cloud',3);if(cv){c.appendChild(cv);el.insertBefore(c,el.firstChild)}});
      var isle=document.createElement('div');isle.className='tt-isle';var ic=R.make('island',2);if(ic){isle.appendChild(ic);el.insertBefore(isle,el.firstChild)}
      var cast=el.querySelector('.tt-cast');var narrow=innerWidth<380,small=innerWidth<560;
      var list=me?[[me.gender==='남'?'heroM':'hero',{job:me.job||'',hero:me.color||'#EE7FAE'}]]:[['hero',{job:'공주',hero:'#EE7FAE'}],['heroM',{job:'용사',hero:'#4FA9E8'}]];
      list.forEach(function(x){var d=document.createElement('div');var c=R.make(x[0],small?4:5,x[1]);if(c){d.appendChild(c);cast.appendChild(d)}});
      var b=document.createElement('div');b.className='boss';var bc=R.make(narrow?'c':'e',small?5:7);if(bc){b.appendChild(bc);cast.appendChild(b)}
    }catch(e){}
  }
  art();

  var done=false;
  function go(){ if(done) return; done=true; try{sessionStorage.setItem('rr-title-seen','1')}catch(e){}
    el.classList.add('out'); document.removeEventListener('keydown',key); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },480); }
  function key(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } }
  document.getElementById('tt-go').addEventListener('click',go);
  document.addEventListener('keydown',key);
})();
