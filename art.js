/* 스터디아 픽셀 아트 v2 — 캐릭터(성별·직업·오라 색), 보스, 배경
   - 모든 그림은 글자 지도(ASCII)를 겹쳐 그린 뒤 자동 외곽선 + 그림자를 붙여요.
   - window.RRART.make(key, sc, dataset) → canvas 또는 null(옛 스프라이트로 대체) */
(function(){
'use strict';
var OUT='#2B1D16';
var BASE={
  O:OUT,
  s:'#FCD9BC',S:'#EDAE8C',f:'#F6929F',w:'#FFFFFF',m:'#C2413A',
  h:'#6E3F27',H:'#A2643E',j:'#42241A',
  y:'#F7C531',Y:'#FFEB8A',z:'#B8811A',
  g:'#AEB7C4',G:'#E6EBF2',x:'#6E7889',
  n:'#3D3753',N:'#5E5778',b:'#221E30',
  c:'#FFFFFF',V:'#CFC8DD',
  t:'#8B5A35',T:'#B7804F',u:'#5A3821',
  r:'#E2453C',R:'#FF8170',d:'#9E2420',
  a:'#4FA34A',A:'#8BD46C',i:'#2E6B33',
  l:'#4C8FE0',L:'#93C8FF',o:'#2F5CA8',
  v:'#8C5BD6',U:'#BC9BF3',Q:'#5B3B8C',
  E:'#6FE6EE',e:'#2A9FB3',
  k:'#F7A1C4',K:'#FFD6E6',X:'#D45E8C',
  F:'#FF9F43',I:'#FFD9A0',
  _:'rgba(43,29,22,.22)'
};
function hex2rgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c}).join('');var n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255]}
function rgb2hex(a){return '#'+a.map(function(v){v=Math.max(0,Math.min(255,Math.round(v)));return (v<16?'0':'')+v.toString(16)}).join('')}
function mix(c,t,k){var a=hex2rgb(c),b=hex2rgb(t);return rgb2hex(a.map(function(v,i){return v+(b[i]-v)*k}))}
function auraPal(c){if(!/^#[0-9a-fA-F]{3,6}$/.test(c||''))c='#EE7FAE';return {p:c,P:mix(c,'#ffffff',.42),q:mix(c,'#1a1020',.32)}}

/* ---------- 그리드 ---------- */
function grid(w,h){var g=[];for(var y=0;y<h;y++){g.push(new Array(w).fill(null))}g.w=w;g.h=h;return g}
function putA(g,rows,ox,oy,flip){if(!rows)return;rows.forEach(function(r,y){var L=r.length;for(var x=0;x<L;x++){var ch=flip?r[L-1-x]:r[x];if(ch==='.'||ch===' ')continue;var X=ox+x,Y=oy+y;if(X<0||Y<0||X>=g.w||Y>=g.h)continue;g[Y][X]=ch==='-'?null:ch}})}
function outline(g){var o=[];for(var y=0;y<g.h;y++)for(var x=0;x<g.w;x++){if(g[y][x])continue;
  var n=[[0,1],[1,0],[0,-1],[-1,0]].some(function(d){var Y=y+d[1],X=x+d[0];return Y>=0&&X>=0&&Y<g.h&&X<g.w&&g[Y][X]&&g[Y][X]!=='_'});if(n)o.push([x,y])}
  o.forEach(function(p){g[p[1]][p[0]]='O'})}
function shadow(g,cx,y,rw){for(var dy=0;dy<2;dy++){var w=dy?rw-2:rw;for(var x=Math.round(cx-w);x<=Math.round(cx+w);x++){if(x>=0&&x<g.w&&y+dy<g.h&&!g[y+dy][x])g[y+dy][x]='_'}}}
function trim(g){var x0=g.w,x1=-1,y0=g.h,y1=-1;for(var y=0;y<g.h;y++)for(var x=0;x<g.w;x++)if(g[y][x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)return g;var n=grid(x1-x0+1,y1-y0+1);for(var yy=y0;yy<=y1;yy++)for(var xx=x0;xx<=x1;xx++)n[yy-y0][xx-x0]=g[yy][xx];return n}
function paint(g,scale,pal){var c=document.createElement('canvas');c.width=g.w*scale;c.height=g.h*scale;var x2=c.getContext('2d');
  for(var y=0;y<g.h;y++)for(var x=0;x<g.w;x++){var ch=g[y][x];if(!ch)continue;x2.fillStyle=pal[ch]||'#f0f';x2.fillRect(x*scale,y*scale,scale,scale)}
  c.className='px';return c}

/* ============================================================
   캐릭터  (캔버스 30 x 32 · 머리 x8 y4 · 몸 x8 y18 · 오른손 x19~20 y22~23)
   ============================================================ */
function remap(rows,m){return rows.map(function(r){return r.split('').map(function(c){return m[c]||c}).join('')})}
var HEAD={
 F:["....jjjjjj....",
    "..jjhhhhhhjj..",
    ".jhhHHHHhhhhj.",
    "jhhHHhhhhhhhhj",
    "jhHhhhhhhhhhhj",
    "jhhhhhhhhjhhhj",
    "jhhjhhhhhjhhhj",
    "jhjsshhhsssjhj",
    "jhOOOssssOOOhj",
    "jhsOwssssOwshj",
    "jhsuussssuushj",
    "jhfssssmsssfhj",
    "jhhssssssssshj",
    ".jhhSSSSSShhj."],
 M:["....jjjjjj....",
    "..jjhhhhhhjj..",
    ".jhhHHHHhhhhj.",
    "jhhHHhhhhhhhhj",
    "jhHhhhhhhhhhhj",
    "jhhhhhhhhhhhhj",
    "jhhhhhhhhhhhhj",
    "jhhshhhhshhshj",
    "jhsjjssssjjshj",
    ".SsOwssssOwsS.",
    ".SsOOssssOOsS.",
    "..sssssmssss..",
    "..ssssssssss..",
    "...SSSSSSSS..."]
};
var HAIRBACK={F:["jhhh..........hhhj".slice(0,16),"jhhh........hhhj","jhhh........hhhj","jhhh........hhhj","jhhh........hhhj","jhhh........hhhj","jhhh........hhhj","jhhh........hhhj","jhhh........hhhj","jhhh........hhhj",".jhhj......jhhj.",".jhj........jhj.","..j..........j.."],
  PONY:["....pPp.","...pqpPp","....jhhj","....jhhhj","....jhhhj",".....jhhj",".....jhhj",".....jhhj","......jhj","......jj"]};

/* 윗옷 6줄 (y19~24) — p/P/q 는 오라 색 */
var TOP={
 shirt:[".qpPPPwwPPPpq.",
        ".qPpqPwwPqpPq.",
        ".qPpqppppqpPq.",
        ".ss.qppppq.ss.",
        ".ss.uuyyuu.ss.",
        "...qppppppq..."],
 royal:["qPPPpcccPpPPPq".slice(0,14),
        "qPPPqpyypqPPPq",
        ".qqqqpyypqqqq.",
        ".ss.qpyypq.ss.",
        ".ss.yyyyyy.ss.",
        "...qppEEppq..."],
 armor:[".xGGgGppGgGGx.",
        ".xggxgPpgxggx.",
        ".qPpxggggxpPq.",
        ".ss.xgppgx.ss.",
        ".ss.uuyyuu.ss.",
        "...xggppggx..."],
 robe:[".qpPPPyyPPPpq.",
       "qPPpqPyyPqpPPq",
       "qPppqppppqppPq",
       "qss.qppppq.ssq",
       ".ss.yyyyyy.ss.",
       "...qppppppq..."],
 vest:[".VccctppttcccV".slice(0,14),
       ".VcVtppppptVcV".slice(0,14),
       ".VccttppttccV.",
       ".ss.tTttTt.ss.",
       ".ss.uuyyuu.ss.",
       "...ttttttt...."],
 ninja:[".bnNNpppNNNnb.",
        ".bNnbppppbnNb.",
        ".bNnbnnnnbnNb.",
        ".ss.bnnnnb.ss.",
        ".ss.ppPPpp.ss.",
        "...bnnnnnnb..."],
 hoodie:[".qpPPPccPPPpq.",
         ".qPpqPccPqpPq.",
         ".qPpqppppqpPq.",
         ".ss.qPPPPq.ss.",
         ".ss.qPPPPq.ss.",
         "...qppppppq..."],
 suit:[".bNNNcppcNNNb.",
       ".bNnbcppcbnNb.",
       ".bNnbNppNbnNb.",
       ".ss.bNppNb.ss.",
       ".ss.bnNNnb.ss.",
       "...bnnnnnnb..."],
 apron:[".VcccqppqcccV.",
        ".VcVqPPPPqVcV.",
        ".VcVqPppPqVcV.",
        ".ss.qPppPq.ss.",
        ".ss.qPppPq.ss.",
        "...qPppppPq..."],
 coat:[".tTTTcppcTTTt.",
       ".tTTtTppTtTTt.",
       ".tTTtTTTTtTTt.",
       ".ss.tTyyTt.ss.",
       ".ss.tTTTTt.ss.",
       "..tTTTTTTTTt.."],
 lab:[".VcccEppEcccV.",
      ".VcVcEppEcVcV.",
      ".VcVccccccVcV.",
      ".ss.Vcc.cV.ss.",
      ".ss.Vcc.cV.ss.",
      "...VccccccV..."],
 idol:[".qPPPPYYPPPPq.",
       ".KKKqPYYPqKKK.",
       ".qPpqpppppqPq.",
       ".ss.qppppq.ss.",
       ".ss.KKKKKK.ss.",
       "...qPpPpPpq..."]
};
/* 아랫도리 4줄 (y25~28) */
var BOT={
 pants:["....lLllll....","....ll..ll....","....ll..ll....","...uuu..uuu..."],
 wpants:["....cccccV....","....cV..cV....","....uu..uu....","...uuu..uuu..."],
 dpants:["....nNnnnn....","....nn..nn....","....bb..bb....","...bbb..bbb..."],
 skirt:["..qpPpPpPpPq..",".qqpqpqpqpqqq.","....ss..ss....","...uuu..uuu..."],
 dskirt:["..bnNnNnNnNb..",".bbnbnbnbnbbb.","....ss..ss....","...bbb..bbb..."],
 askirt:["..xgGgGpGgGx..",".xxgxgxgxgxxx.","....ss..ss....","...uuu..uuu..."],
 gown:["..qpPpppPpppq.",".qpPpppPpppppq","qpPpppPppppppq","yyyyyyyyyyyyyy"],
 robe:["...qpPppppq...","..qpPpppppq...","..qpPppppppq..","..yyyyyyyyyy.."],
 shorts:["....tTtttt....","....tt..tt....","....ss..ss....","...uuu..uuu..."]
};
/* 뒷배경 (망토·가방·화살통) — 몸 기준 좌표 */
var BACK={
 cape:{x:7,y:18,r:[".dddddddddddddd.","drrrrrrrrrrrrrrd","drRrrrrrrrrrrrrd","drRrrrrrrrrrrrrd","drRrrrrrrrrrrrrd","drRrrrrrrrrrrrrd","drRrrrrrrrrrrrrd","drrrrrrrrrrrrrrd",".dddddddddddddd."]},
 ermine:{x:7,y:18,r:["..VccOccccOccV..",".VccccccOccccccV.".slice(0,16),"rrrrrrrrrrrrrrrr","rRrrrrrrrrrrrrrd","rRrrrrrrrrrrrrrd","rRrrrrrrrrrrrrrd","rRrrrrrrrrrrrrrd","rRrrrrrrrrrrrrrd","dddddddddddddddd"]},
 pack:{x:6,y:18,r:[".ttt","tTTT","tyyT","tTTT","ttt."]},
 quiver:{x:4,y:14,r:["c....","Vc...",".Vc..","..tt.",".tTt.","tTt..","tt..."]}
};
/* 머리 장식 — 머리 원점(8,4) 기준 */
var HAT={
 tiara:{x:3,y:-1,r:["Y..YY..Y","yyyEEyyy"]},
 crown:{x:2,y:-4,r:["Y...YY...Y","yY.yYYy.Yy","yyYyyyyYyy","yRryEEyRry","zzzzzzzzzz"]},
 circlet:{x:0,y:5,r:["zyyyyyEEyyyyyz"]},
 band:{x:-3,y:5,r:["...dRRRRRRRRRRRRd","Rrdd............",".RR..............","..R.............."]},
 helm:{x:0,y:-2,r:[".....pPp......","....xxxxxx....","..xxGGGGggxx..",".xgGGggggggxx.","xgGgggggggggxx".slice(0,14),"xggggggggggggx","xggggggggggggx","xxxxxxyyxxxxxx","xg..........gx","xg..........gx","xx..........xx"]},
 fedora:{x:-1,y:-2,r:[".....tttttt.....","....tTTTTTTt....","....tTTTTTTt....","....pppppppp....","tTTTTTTTTTTTTTTt",".tttttttttttttt."]},
 straw:{x:-2,y:-1,r:["......zzzzzz......",".....zYYYYYYz.....",".....zYyyyyyz.....",".....pppppppp.....","zyYYYYYYYYYYYYYYyz",".zzzzzzzzzzzzzzzz."]},
 wizard:{x:-1,y:-8,r:["..........qq....",".........qpq....","........qpPq....",".......qpPpq....","......qpPppq....",".....qpPpppq....","....qpPppppq....","....qpYpppYpq...","...yyyyyyyyyy...","qpPPPPPPPPPPPPpq",".qqqqqqqqqqqqqq."]},
 archmage:{x:-2,y:-9,r:["............Yqq...","...........qpq....","..........qpPq....",".........qpPpq....","........qpPppq....",".......qpPYppq....","......qpPpppppq...",".....qpPpppYpppq..","....qpPYpppppppq..","....yyyyyyyyyyyy..","qpPPPPPPPPPPPPPPpq",".qqqqqqqqqqqqqqqq."]},
 hood:{x:-1,y:-1,r:[".....qqqqqq.....","...qqpPPPPpqq...","..qpPPppppppPq..",".qpPpppppppppPq.",".qpPppppppppppq.","qpPpppppppppppPq","qpPq........qpPq","qpPq........qpPq","qpq..........qpq","qpq..........qpq","qpq..........qpq","qpq..........qpq",".qq..........qq."]},
 goggles:{x:0,y:4,r:["..xxxx..xxxx..","ttxEEx tt xEExtt".replace(/ /g,''),"..xxxx..xxxx.."]},
 horns:{x:-1,y:-3,r:["c..............c","cV............Vc",".cV..tttttt..Vc.","..VttTTTTTTtt V.".replace(' ','.'),"..tTTTTEETTTTt..","..tttttttttttt.."]},
 ninjaband:{x:0,y:5,r:["nnnnnnGGnnnnnn"]},
 mask:{x:1,y:11,r:["nnnnnnnnnnnn","nNnnnnnnnnNn",".nnnnnnnnnn."]},
 beret:{x:-1,y:-2,r:["........i.......","....iiiiiii.....","..iaAAAAaaaii...",".iaAaaaaaaaaai..","iaaaaaaaaaaaaaai",".iiiiiiiiiiiiii."]},
 headset:{x:-1,y:0,r:["....bbbbbbbb....","..bb........bb..",".b............b.","b..............b","b..............b","b..............b","bpP..........Ppb","bpP..........Ppb","bpP..........Ppb",".bb..........bb.","..b.............","..bb............","...bbbb........."]},
 cap:{x:-1,y:-1,r:["....pppppppp....","...pPPPPPPPpq...","..pPPpppppppq...",".qpPppwwpppppq..","rqqqqqqqqqqqqq.."]},
 glasses:{x:1,y:7,r:[".bbbb..bbbb.","b....bb....b","b....bb....b",".bbbb..bbbb."]},
 shades:{x:1,y:8,r:["yyyyyyyyyyyy","ybbGbyybbGby",".bbbb..bbbb."]},
 deer:{x:-1,y:-1,r:[".....TtTtTt.....","...tTtTtTtTtT...","..tTtTtTtTtTtTt.",".uutTtTtTtTtTtuu","uu.tttttttttt.uu"]},
 bandana:{x:-1,y:-1,r:["....pppppppp....","..pPPPPPPPPPpp..",".pPpppppppppppp.","qppppppppppppppq","qqqqqqqqqqqqqqqq","..............qp","..............qp"]},
 starpin:{x:10,y:1,r:[".Y.","YyY",".Y."]},
 mic:{x:-1,y:6,r:["b.","b.","b.","b.",".b",".bbbbb"]},
 beard:{x:2,y:11,r:["Vcc.mm.ccV","cccccccccc",".cccccccc.","..cccccc..","...cccc..."]},
 stache:{x:3,y:11,r:["hhhhhhhh","Hh....hH"]}
};
/* 손에 든 것 — (gx,gy)가 손 위치(오른손 x19 y22)에 오도록 */
var ITEM={
 sword:{gx:1,gy:8,r:["....G","...GG","..GGg","..Ggx",".Ggx.",".Ggx.","Gyy..","yzy..",".t...","z...."],front:0},
 rapier:{gx:1,gy:7,r:["...G","..G.","..G.",".G..",".G..","yyy.",".z..",".z.."]},
 dsword:{gx:1,gy:8,r:["....U","...Uv","..UvQ","..vQb",".UvQ.",".vQ..","rrr..","bdb..",".b...","r...."]},
 wand:{gx:0,gy:6,r:["..Y..",".YYY.","YYEYY",".YYY.",".y.y.","..z..","..z..","..z.."]},
 scepter:{gx:1,gy:7,r:[".EE.","EwEE",".yy.","yRRy",".zz.",".zz.",".zz.",".zz.",".yy."]},
 staff:{gx:1,gy:7,r:[".EE..","EwEE.","EEEE.",".tE..",".t...",".t...",".t...",".t...",".t...",".t...",".u..."]},
 bigstaff:{gx:1,gy:8,r:["U.E.U","vEwEv",".EEE.","yvEvy",".yty.","..t..","..t..","..t..","..t..","..t..","..t..","..u.."]},
 cross:{gx:1,gy:7,r:[".yy.","yYYy",".yy.","yyyy",".yy.",".t..",".t..",".t..",".t..",".t..",".u.."]},
 orb:{gx:-1,gy:9,r:[".UUU.","UvwUv","UvvUv",".vvv.","....."]},
 potion:{gx:0,gy:5,r:[".T.","VcV","VcV","aAa","aAa",".a."]},
 dagger:{gx:0,gy:4,r:["..G",".Gg","Gg.","yy.","t.."]},
 star:{gx:-1,gy:2,r:[".G.","GxG",".G."]},
 bow:{gx:1,gy:5,r:[".t..","t.c.","t..c","t..c","t..c","t..c","t..c","t.c.",".t.."]},
 shield:{gx:-1,gy:3,r:["xxxxxxxx","xGGGgggx","xGpyypgx","xgpyypgx","xgppppgx","xgggggqx",".xgggqx.","..xggx..","...xx..."],left:1},
 pet:{gx:-1,gy:-2,r:["...a.a...","..aAAaa..",".aAOaAa..",".aAAAaAiA","..aaaAaii","..IaaIa..",".a.a..a.."],free:1},
 map:{gx:0,gy:3,r:["IIFI","IrII","IIrI"]},
 torch:{gx:1,gy:6,r:[".Y..","YFY.","FrF.",".t..",".t..",".t..",".u.."]},
 pad:{gx:2,gy:2,r:[".bbbbb.","bnrnnEb","bNNNNNb",".b...b."]},
 laptop:{gx:2,gy:2,r:["xxxxxx","xEEEEx","xEaEEx","gggggg","xxxxxx"]},
 camera:{gx:1,gy:2,r:[".bb...","bbbbbb","bNbEbb","bbbbbb"]},
 key:{gx:0,gy:6,r:[".yy.","y..y","y..y",".yy.",".z..",".zz.",".z..",".zz."]},
 cup:{gx:0,gy:3,r:[".V.V.","ccccc","cuuuc","ccccV","ccccV",".ccc."]},
 glass:{gx:0,gy:7,r:[".xxx.","xLLwx","xLLLx","xLLLx",".xxx.","...t.","...t.","...u."]},
 mic:{gx:0,gy:3,r:["NbN","bNb",".x.",".x.",".x."]}
};
/* 직업 → 모습 */
var J={
 '공주':{top:'royal',bf:'gown',bm:'wpants',hat:'tiara',it:'wand'},
 '왕자':{top:'royal',bf:'gown',bm:'wpants',hat:'circlet',it:'rapier',back:'cape'},
 '용사':{top:'shirt',bf:'skirt',bm:'pants',hat:'band',it:'sword',back:'cape'},
 '왕':{top:'royal',bf:'gown',bm:'wpants',hat:'crown',it:'scepter',back:'ermine',mm:'stache'},
 '여왕':{top:'royal',bf:'gown',bm:'wpants',hat:'crown',it:'scepter',back:'ermine'},
 '여검사':{top:'armor',bf:'askirt',bm:'pants',pony:1,it:'sword'},
 '여행가':{top:'vest',bf:'shorts',bm:'pants',hat:'straw',it:'map',back:'pack'},
 '모험가':{top:'vest',bf:'skirt',bm:'pants',hat:'fedora',it:'torch',back:'pack'},
 '마법사':{top:'robe',bf:'robe',bm:'robe',hat:'wizard',it:'staff'},
 '연금술사':{top:'lab',bf:'skirt',bm:'pants',hat:'goggles',it:'potion'},
 '대마법사':{top:'robe',bf:'robe',bm:'robe',hat:'archmage',it:'bigstaff',back:'cape',mm:'beard'},
 '흑기사':{top:'armor',bf:'dskirt',bm:'dpants',hat:'helm',it:'dsword',back:'cape',dark:1},
 '드래곤 테이머':{top:'vest',bf:'skirt',bm:'pants',hat:'horns',it:'pet'},
 '암살자':{top:'ninja',bf:'dskirt',bm:'dpants',hat:'hood',hoodDark:1,mask:1,it:'dagger'},
 '스나이퍼':{top:'vest',bf:'shorts',bm:'pants',hat:'beret',it:'bow',back:'quiver'},
 '힐러':{top:'robe',bf:'robe',bm:'robe',hat:'hood',hoodWhite:1,it:'cross',white:1},
 '소환사':{top:'robe',bf:'robe',bm:'robe',hat:'hood',it:'orb'},
 '닌자':{top:'ninja',bf:'dskirt',bm:'dpants',hat:'ninjaband',mask:1,it:'star'},
 '탱커':{top:'armor',bf:'askirt',bm:'pants',hat:'helm',it:'shield'},
 '프로게이머':{top:'hoodie',bf:'skirt',bm:'pants',hat:'headset',it:'pad'},
 '아이돌':{top:'idol',bf:'skirt',bm:'wpants',hat:'starpin',extra:'mic',it:'mic'},
 '크리에이터':{top:'hoodie',bf:'skirt',bm:'pants',hat:'cap',it:'camera'},
 '천재 해커':{top:'hoodie',bf:'skirt',bm:'pants',hat:'glasses',it:'laptop'},
 '건물주':{top:'suit',bf:'dskirt',bm:'dpants',hat:'shades',it:'key'},
 '카페 사장님':{top:'apron',bf:'skirt',bm:'pants',hat:'bandana',it:'cup'},
 '탐정':{top:'coat',bf:'skirt',bm:'pants',hat:'deer',it:'glass'}
};
var DEF={F:{top:'royal',bf:'skirt',it:'wand'},M:{top:'shirt',bm:'pants',it:'sword'}};
var DARK={g:'n',G:'N',x:'b',l:'n',L:'N',u:'b'};
var WHITE={p:'c',P:'c',q:'V'};
function placeItem(g,it,put){var rows=it.r,ax=19,ay=22;if(it.left){put(g,rows,6,20);return}
  if(it.free){put(g,rows,21,24);return}put(g,rows,ax+1-it.gx,ay-it.gy)}
function charGrid(gender,job,color){
  var G=gender==='남'?'M':'F';var d=J[job]||DEF[G];var g=grid(32,38);var put=function(gg,r,x,y){return putA(gg,r,x+1,y+6)};
  var top=TOP[d.top]||TOP.shirt,bot=BOT[G==='F'?(d.bf||'skirt'):(d.bm||'pants')]||BOT.pants;
  if(d.dark){top=remap(top,DARK);bot=remap(bot,DARK)}
  if(d.white){top=remap(top,WHITE);bot=remap(bot,WHITE)}
  var it=ITEM[d.it];
  /* 1 뒤 */
  if(d.back){var b=BACK[d.back];var rows=b.r;if(d.dark&&d.back==='cape')rows=remap(rows,{r:'p',R:'P',d:'q'});if(d.back==='cape'&&!d.dark)rows=remap(rows,{r:'q',R:'p',d:'O'});put(g,rows,b.x,b.y)}
  if(d.pony)put(g,HAIRBACK.PONY,19,3);else if(G==='F')put(g,HAIRBACK.F,7,8);
  if(it&&!it.left&&!it.free&&/sword|rapier|staff|bigstaff|cross|scepter|torch|bow|glass|key|wand/.test(d.it))placeItem(g,it,put);
  /* 2 몸 */
  put(g,["......SS......"],8,18);put(g,top,8,19);put(g,bot,8,25);
  /* 3 머리 */
  put(g,HEAD[G],8,4);
  if(d.mm&&G==='M'){var mm=HAT[d.mm];put(g,mm.r,8+mm.x,4+mm.y)}
  if(d.mask){var mk=HAT.mask;put(g,mk.r,8+mk.x,4+mk.y)}
  if(d.hat){var h=HAT[d.hat],hr=h.r;if(d.hoodDark)hr=remap(hr,{p:'n',P:'N',q:'b'});if(d.hoodWhite)hr=remap(hr,{p:'c',P:'c',q:'V'});if(d.dark)hr=remap(hr,{g:'n',G:'N',x:'b',y:'r'});put(g,hr,8+h.x,4+h.y)}
  if(d.extra){var ex=HAT[d.extra];put(g,ex.r,8+ex.x,4+ex.y)}
  /* 4 앞 */
  if(it&&(it.left||it.free||!/sword|rapier|staff|bigstaff|cross|scepter|torch|bow|glass|key|wand/.test(d.it)))placeItem(g,it,put);
  outline(g);shadow(g,16,36,6);return g}

var cache={};
function makeChar(gender,job,color,scale){var key=[gender,job,color,scale].join('|');
  if(!cache[key]){var g=charGrid(gender,job,color);cache[key]=paint(g,scale,Object.assign({},BASE,auraPal(color)))}
  return cloneCanvas(cache[key])}
function cloneCanvas(c){var n=document.createElement('canvas');n.width=c.width;n.height=c.height;n.getContext('2d').drawImage(c,0,0);n.className='px';return n}

/* ============================================================
   보스 — 왼쪽 절반만 그리고 좌우 대칭(sym), 하이라이트는 왼쪽에만
   ============================================================ */
var DIMR={A:'a',G:'g',U:'v',L:'l',Y:'y',K:'k',R:'r',N:'n',T:'t',P:'p',E:'e',I:'I',w:'w'};
function sym(half,keepRight){return half.map(function(r){var rr=r.split('').reverse().join('');if(!keepRight)rr=rr.split('').map(function(c){return c==='w'?c:(DIMR[c]&&c!=='E'&&c!=='I'?DIMR[c]:c)}).join('');return r+rr})}
var BOSS={
 m:{r:sym([
  "......xxxxx",
  ".....xGGGGg",
  "....xGGgggg",
  "....xGgrrgg",
  "....xggrRgg",
  "....xgggggg",
  "....xggxxxx",
  ".....xggggg",
  "..xxx.xxxxx",
  ".xGGgxGgggg",
  "xGgggxGgggg",
  "xGgggxggggg",
  "xggggxggggg",
  ".xggxxggggg",
  ".xGGx.xgggg",
  "xGggx.xgggg",
  "xgggx.xxxxx",
  ".xxx..xGgx.",
  "......xggx.",
  ".....xgggx.",
  ".....xxxxx."]),over:[[8,10,'E'],[13,10,'E'],[9,11,'E'],[12,11,'E'],[10,12,'E'],[11,12,'E'],[4,0,'A'],[5,0,'a'],[6,-1,'A'],[3,1,'a']]},
 k:{r:sym([
  "...........U",
  ".LL......vUU",
  "LccL....vUUU",
  "LcccL..vUUvv",
  "LcccLL.vUsss",
  ".LcccL.vsOws",
  ".LcccLLvsOOs",
  "..LccLLvsfss",
  "..LLcL.vvsss",
  "...LLL..vUUv",
  "....L..vUvvv",
  ".......vUvvv",
  "......vUvvvv",
  ".....VccVVcc",
  "...VcccVVccc",
  "..VVccVVVVcc",
  "....VVVV..VV"]),over:[[11,8,'m'],[12,8,'m']]},
 e:{r:sym([
  "......iiiii",
  "....iiaaaaa",
  "...iaAAaaaa",
  "..iaAwwOaaa",
  "..iaAwOOaaa",
  ".iaAaaaaaaa",
  ".iaAddddddd",
  "iaAdwdwdwdw",
  "iaAdddddddd",
  "iaAddmmmmmm",
  "iaAdwdwdwdw",
  ".iaaddddddd",
  ".iaAaaaaaaa",
  "..iaaaaaaaa",
  "...iaai.iaa",
  "...iii..iii"])},
 s:{r:sym([
  "........dddd",
  ".....ddrrrrr",
  "....drrRRrrr",
  "...drRRccrrr",
  "..drRRccccrr",
  ".drRrrccrrrc",
  ".drrrrrrrrcc",
  "drrccrrrrrcc",
  "drcccrrrrrrr",
  "dddddddddddd",
  ".....tIIIIII",
  ".....tIIOwII",
  ".....tIfOOII",
  ".....tIIIIIm",
  ".....tIIIIII",
  "....ttIIIIII",
  "...tIIt.tIII",
  "...ttt..tttt"])},
 c:{r:sym([
  "........eee",
  "......eeEEE",
  ".....eEEEEE",
  "....eEwcEEE",
  "...eEwcEEEE",
  "..eEEEEEEEE",
  "..eEEOwEEEE",
  ".eEEEOOEEEE",
  ".eEEEEEEEEm",
  "eEEEEEEEEEE",
  "eEEEEEEEEEE",
  "eEEEEEEEEEE",
  "eeEEEEEEEEE",
  ".eeeeeeeeee"]),over:[[8,10,'y'],[9,10,'y'],[12,10,'v'],[13,10,'v'],[8,11,'y'],[9,11,'y'],[12,11,'v'],[13,11,'v'],[10,10,'r'],[11,11,'r']]},
 h:{r:sym([
  "...c........",
  "...Vc.......",
  "....Vc.iiiii",
  ".....iiaaaaa",
  "....iaAAaaaa",
  "....iaAOwaaa",
  "....iaAOOaaa",
  "i...iaaaaaaa",
  "ii..iaaaIIII",
  "iAi..iaIOIII",
  "iAAi..iaIIII",
  "iAAAiiaaaaaa",
  "iAAAiaaIIIII",
  ".iAAiaaIyIII",
  "..iiiaaIIIII",
  "....iaaIyIII",
  "....iaaaIIII",
  "...iaaa.iaaa",
  "...iii..iiii"])},
 spring:{r:sym([
  "......XXkkkkk",
  "....XXkkKKkkk",
  "...XkkKKKkkkk",
  "..XkkKkkkkXkk",
  ".XkkkkkkkXkkk",
  ".XkKkkkkkkkkk",
  "XkkkkXXOkkkkk",
  "XkkkkkOwkkkkk",
  "XkkkkkOOkkkkk",
  ".XkkkkkkkkXXX",
  "..XXkkkkkkkkk",
  "....XXXkkkkXX",
  "........utTTT",
  "..tt....utTTt",
  "...tt..utTTtt",
  "....tttttTTtt",
  "........utTTt",
  "........utTTt",
  "......uuutTTt",
  ".....uu..uutt"])},
 summer:{r:sym([
  "...F......F.",
  "....F....F..",
  ".......yyyyy",
  ".F...yyYYYYY",
  "..F.yYYYYYYY",
  "....yYYYYYYY",
  "FF.yYbbbbbbb",
  "...yYbbGbbbb",
  "...yYYbbbbyY",
  "FF.yYYYYYYYY",
  "....yYYYmmmm",
  "..F.yYYYYmmm",
  ".F...yyYYYYY",
  ".......yyyyy",
  "....F....F..",
  "...F......F."])},
 autumn:{r:sym([
  "....a..aA..a",
  "....aAaAAaAa",
  "....FFFFFFFF",
  "....vvvvvvvv",
  "...vUUvvvvvv",
  "...vssssssss",
  "...vsOOsssss",
  "...vsLOsssss",
  "...vssssssmm",
  "....ssssssss",
  "..QQvvvvvvvv",
  ".QQvvUvvvvvA",
  "QQvvUvvvvvvv",
  "QQvsvvvvvvvv",
  "QQvvvvvvvvvv",
  "QQQvvvvvvvvv",
  ".QQQvvv.vvvv",
  "..QQQ...QQQQ"])},
 winter:{r:sym([
  "......Y.Y.Y",
  "......yyyyy",
  ".....cccccc",
  "....cccOwcc",
  "....cccOOcc",
  "....ccccccF",
  "....cccOcOc",
  ".....cccccc",
  "...llllllll",
  "t.ccLllllll",
  ".tcccccccOc",
  "..tcccccccc",
  ".cccccccccO",
  ".Vcccccccccc".slice(0,11),
  "..Vcccccccc",
  "...VVVVVVVV"]),over:[[17,9,'l'],[18,10,'l'],[17,10,'L'],[19,11,'l']]},
 mock:{r:sym([
  "..xxxxxxxxxx",
  ".xgGGGGGGGGG",
  ".xgGrrGGGGGG",
  ".xgGrRGGGGGG",
  ".xgGGGGGGGGG",
  ".xgGOOOOOOOO",
  "..xxxxxxxxxx",
  "xxx.xcccccccc".slice(0,12),
  "xGgxxcOcOcOc",
  "xgg.xcVcVcVc",
  "xgg.xcOcVcOc",
  "xgg.xcVcOcVc",
  "xxx.xcVcVcOc",
  "....xccccccc",
  "....xxxxxxxx",
  ".....xgx..xg",
  "....xxgx..xg",
  "....xxxx..xx"])},
 vsummer:{r:sym([
  "......uuuuuu",
  "....uuTTTTTT",
  "...uTTTTTTTT",
  "..uTTIIIIIII",
  "..uTIIIIIIII",
  ".uTTIOOOIIII",
  ".uTTIIIIIIII",
  ".uTTIIIIIIOO",
  "..uTTIIIIIII",
  "..uuTTTTTTTT",
  ".uTTTTTTTTTT",
  "uTTTTTTTTTTT",
  "uTTuTTTTTTTT",
  "uTTuTTTTTTTT",
  "uTuuTTTTTTTT",
  "....uTTTTTTT",
  "....uuT..uTT",
  "....uu...uuu"]),over:[[2,0,'L'],[3,0,'L'],[4,0,'L'],[3,1,'L'],[2,2,'L'],[3,2,'L'],[4,2,'L'],[0,3,'L'],[1,3,'L'],[1,4,'L'],[0,5,'L'],[1,5,'L']]},
 vwinter:{r:sym([
  "........llll",
  "......llLLLL",
  ".....lLLLLLL",
  "....lLLsssss",
  "....lLssssss",
  "....lLsOOsss",
  "....lLssssss",
  "....lLssssmm",
  "...lLLLsssss",
  "..lLLlLLLLLL",
  ".lLLlLLlLLLL",
  ".lLlLLlLLlLL",
  "lLLLLlLLLLLL",
  "lLLlLLLLlLLL",
  "lLLLLLlLLLLL",
  ".lll.lll.lll",
  "............",
  "FFa........."]),over:[[0,16,'F'],[1,16,'F'],[2,16,'a'],[0,17,'F'],[1,17,'F']]},
 hidden:{r:sym([
  "Y....QQQQQQQ",
  "yY.QQvvvvvvv",
  ".yQvvUUvvvvv",
  ".QvUUvvvvvvv",
  ".QvUvvvvvvvv",
  "QvvvbEEEvvvv",
  "QvvvvbEEvvvv",
  "QvUvvvvvvvvv",
  "QvUvvvvvvvvv",
  "QvvvvvvvvYYY",
  "QvvvvvvvvYQQ",
  "QvvvvvvvvYQb",
  "QvvvvvvvvYQb",
  "QvvvvvvvvYQb",
  "QvvvvvvvvYYY",
  "QvvvvvvvvvvU",
  "QQQQQQQQQQQQ",
  "zyyyyyyyyyyy"]),over:[[11,11,'y'],[12,11,'y'],[11,12,'b'],[12,12,'b']]}
};
var bcache={};
function makeBoss(key,scale){var B=BOSS[key];if(!B)return null;var k=key+'|'+scale;
  if(!bcache[k]){var w=Math.max.apply(null,B.r.map(function(r){return r.length}));var g=grid(w+4,B.r.length+5);putA(g,B.r,2,2);
    (B.over||[]).forEach(function(o){var X=o[0]+2,Y=o[1]+2;if(X>=0&&Y>=0&&X<g.w&&Y<g.h)g[Y][X]=o[2]});
    outline(g);shadow(g,g.w/2-.5,B.r.length+3,Math.round(w/3));bcache[k]=paint(g,scale,BASE)}
  return cloneCanvas(bcache[k])}

/* ============================================================
   배경 — 먼 산, 언덕 숲, 잔디·흙 바닥, 떠 있는 섬, 구름, 나무
   ============================================================ */
function rnd(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
function cv(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function mtnURL(){var W=120,H=48,c=cv(W,H),g=c.getContext('2d');
  function range(peaks,col,shade,snow,base){for(var x=0;x<W;x++){var top=H;peaks.forEach(function(p){var d=Math.abs(((x-p[0]+W*1.5)%W)-W/2);var hh=p[1]-d*p[2];if(H-hh<top)top=H-hh});top=Math.max(0,Math.round(top/2)*2);
    g.fillStyle=col;g.fillRect(x,top,1,H-top);
    var right=peaks.some(function(p){var dx=((x-p[0]+W*1.5)%W)-W/2;return dx>0&&dx<p[1]/p[2]&&H-(p[1]-dx*p[2])<=top+1});
    if(right){g.fillStyle=shade;g.fillRect(x,top,1,H-top)}
    if(snow&&top<H-base){g.fillStyle=right?'#DDE8F7':'#FFFFFF';g.fillRect(x,top,1,Math.min(4,H-base-top))}}}
  range([[20,30,.9],[78,26,.8]],'#C6DAF0','#B3CBE8',0,0);
  range([[44,42,1.1],[98,36,1.0],[4,30,1.0]],'#9DB8DE','#8099C6',1,30);
  return c.toDataURL()}
function hillsURL(){var W=64,H=30,c=cv(W,H),g=c.getContext('2d');var R=rnd(7);
  for(var x=0;x<W;x++){var t=Math.round((10+Math.sin(x/W*Math.PI*2)*4+Math.sin(x/W*Math.PI*6)*2)/2)*2;g.fillStyle='#4FA34A';g.fillRect(x,t,1,H-t);g.fillStyle='#86CF6A';g.fillRect(x,t,1,2)}
  [[6,12],[18,8],[30,13],[44,9],[56,12]].forEach(function(p,i){var cx=p[0],cy=p[1],r=i%2?5:6;
    g.fillStyle='#2E6B33';for(var y=-r;y<=r;y++)for(var x=-r;x<=r;x++)if(x*x+y*y<=r*r+1)g.fillRect(cx+x,cy+y,1,1);
    g.fillStyle='#3E8E3A';for(var y2=-r+1;y2<=r-1;y2++)for(var x2=-r+1;x2<=r-2;x2++)if(x2*x2+y2*y2<=(r-1)*(r-1))g.fillRect(cx+x2,cy+y2,1,1);
    g.fillStyle='#5DB54A';for(var y3=-r+2;y3<=0;y3++)for(var x3=-r+2;x3<=-1;x3++)if(x3*x3+y3*y3<=(r-2)*(r-2))g.fillRect(cx+x3,cy+y3,1,1);
    g.fillStyle='#5A3821';g.fillRect(cx,cy+r,2,3)});
  return c.toDataURL()}
function groundURL(){var W=32,H=32,c=cv(W,H),g=c.getContext('2d');var R=rnd(11);
  g.fillStyle='#8A5A3B';g.fillRect(0,0,W,H);
  for(var i=0;i<14;i++){var x=Math.floor(R()*W),y=12+Math.floor(R()*18),w=2+Math.floor(R()*3);g.fillStyle=R()<.5?'#6B4329':'#A06C47';g.fillRect(x,y,w,2);if(x+w>W)g.fillRect(x-W,y,w,2)}
  [[5,20],[22,26],[14,15]].forEach(function(p){g.fillStyle='#B9A79A';g.fillRect(p[0],p[1],4,3);g.fillStyle='#8F7E72';g.fillRect(p[0]+1,p[1]+2,3,1);g.fillStyle='#E0D4CA';g.fillRect(p[0],p[1],2,1)});
  g.fillStyle='#4E8F2A';g.fillRect(0,0,W,10);
  for(var x=0;x<W;x++){var d=10+((x*7)%5===0?3:(x%3===0?1:0));g.fillRect(x,10,1,d-10)}
  g.fillStyle='#7CC242';g.fillRect(0,0,W,8);for(var x1=0;x1<W;x1++){if(x1%4===1)g.fillRect(x1,8,1,2)}
  g.fillStyle='#A6E06A';g.fillRect(0,0,W,2);[[3,2],[11,3],[19,2],[27,3]].forEach(function(p){g.fillRect(p[0],p[1],2,1)});
  g.fillStyle='#5DA534';[[6,4],[15,5],[24,4],[30,6],[1,6]].forEach(function(p){g.fillRect(p[0],p[1],1,2);g.fillRect(p[0]+1,p[1]-1,1,2)});
  return c.toDataURL()}
var DECO={
 island:["......aAAAAAAAAa....aAAAa.......",
         "....aAAAAAAAAAAAAAAAAAAAAAa.....",
         "..aaAAaaaaaaaaaaaaaaaaaaaaaaa...",
         ".iaaaaaaaaaaaiaaaaaaaaaiaaaaai..",
         ".iiiaiiiaiiiiiiiaiiiaiiiiiiaii..",
         "..tTTtTTTTtTTTTTTtTTTTtTTTTTt...",
         "..tTTTTTTuTTTTTTTTTTTuTTTTTTt...",
         "...ttTTTTTTTTuTTTTTTTTTTTTtt....",
         "....tttTTTTTTTTTTTTuTTTTtt......",
         ".....i.ttTTuTTTTTTTTTTtt........",
         ".....i...ttTTTTTTTTuTt..........",
         "..........ttTTTTTTTtt...........",
         "...........ttTTTTTt.............",
         "............ttTTtt..............",
         ".............tTtt...............",
         "..............tt................"],
 itree:["..iiii..","iaAAai.",".iaAAaii","iaaaaaai",".iiaaii.","...uu...","...uu..."],
 cloud:[".......cccc.........",
        ".....ccccccc..cc....",
        "...cccccccccccccc...",
        "..cccccccccccccccc..",
        ".ccccccccccccccccccc",
        "cccccccccccccccccccc",
        "LcccccccccccccccccLL",
        ".LLLLLLLLLLLLLLLLLL."],
 tree:[".....iiiiii.......",
       "...iiaaaaaaii.....",
       "..iaaAAAaaaaai....",
       ".iaAAAAaaaaaaai...",
       ".iaAAaaaaaaaaaii..",
       "iaaAaaaaaaaiaaaai.",
       "iaaaaaaaaaiaaaaai.",
       "iaaaaiaaaaaaaaaai.",
       ".iaaaaaaaaaaaaaii.",
       ".iiaaaaaaaaaaaii..",
       "..iiiaaaaaaaiii...",
       "....iiiuTuiii.....",
       ".......uTu........",
       ".......uTu........",
       "......uuTuu.......",
       ".....uu.u.uu......"],
 bush:["...iiii.iii..","..iaAAaiaAai.",".iaAaaaaaaaai","iaaaaaaaaaaai","iiiiiiiiiiiii"],
 flower:[".k.",".kKk".slice(0,3),".a.","aa."],
 chest:[".uuuuuuuu.","uTTTTTTTTu","uyyyyyyyyu","utTTyyTTtu","uyyyOOyyyu","utTTTTTTtu","uuuuuuuuuu"],
 star:["...y...","...y...","..yYy..","yyYYYyy",".yYYYy.","..yyy..",".y...y."],
 coin:[".zzz.","zyYyz","zyYyz","zyYyz",".zzz."],
 /* 출석 도장(스터디아 왕관 인장)과 궁극기 번개 */
 stamp:["......rrrrr......","....rrrrrrrrr....","...rrrKKKKKrrr...","..rrKKKKKKKKKrr..",".rrKrKKKrKKKrKrr.",".rrKrrKrrrKrrKrr.","rrKKrrrrrrrrrKKrr","rrKKrrYrrrYrrKKrr","rrKKrrrrrrrrrKKrr","rrKKKKKKKKKKKKKrr","rrKKKrrrrrrrKKKrr",".rrKKKKKKKKKKKrr.",".rrKKKrKrKrKKKrr.","..rrKKKKKKKKKrr..","...rrrKKKKKrrr...","....rrrrrrrrr....","......rrrrr......"],
 bolt:["....yyyy","...yYYy.","..yYYy..",".yYYyyyy","yyyyYYy.","...yYy..","..yYy...",".yy.....","y......."]
};
var dcache={};
function makeDeco(key,scale){var R=DECO[key];if(!R)return null;var k=key+'|'+scale;
  if(!dcache[k]){var w=Math.max.apply(null,R.map(function(r){return r.length}));var top=key==='island'?7:0;var g=grid(w+2,R.length+2+top);putA(g,R,1,1+top);
    if(key==='island'){putA(g,DECO.itree,5,1);putA(g,DECO.flower,20,top-2);putA(g,DECO.flower,24,top-3)}
    if(key!=='cloud'&&key!=='stamp')outline(g);dcache[k]=paint(g,scale,Object.assign({},BASE,{c:'#FFFFFF',L:'#D3ECFA'}))}
  return cloneCanvas(dcache[k])}
var SCN=null;
function scene(){if(!SCN){try{SCN={mtn:mtnURL(),hills:hillsURL(),ground:groundURL()}}catch(e){SCN={}}}return SCN}

/* ---------- 가디언 코어 (알 → 아기 → 성장 → 각성) ---------- */
var CORE_PAL={
  blaze:{p:'#E2453C',P:'#FF9A7A',q:'#9E2420',e:'#FFD34D'},
  ever:{p:'#2E9E6B',P:'#8FDDB0',q:'#1D6646',e:'#F7C531'},
  aegis:{p:'#9AA6B8',P:'#E6EBF2',q:'#5F6A7D',e:'#6FE6EE'},
  tidal:{p:'#2F6FD6',P:'#9CC6FF',q:'#1C4596',e:'#E6F6FF'}};
var CORE_ART={
 egg:["....ppp....","...pPPpp...","..pPPpppp..",".pPPppPPqp.",".pPppPPPpqp".slice(0,11),"pPpppppppqp","pPppPPppppq","ppppPPPppqp","ppPppppppqp",".ppPPpppqq.",".qpppppqqq.","..qqqqqqq..","...qqqqq..."],
 blaze1:["...e......e...","...ee....ee...","...pppppppp...","..pPPpppppppq.","..pPwbpppwbpq.","..pPbbpppbbpq.","..pPPpkkppPpq.","...pppppppp...","q..pPPPPPPp..q","qq.pPPPPPPpppq",".qqpPPPPPPpq..","...pppppppp...","...pp....pp...","...qq....qq..."],
 ever1:["..qq......qq..","..qpq....qpq..","..pppppppppp..",".pPPpppppppPp.",".peebpppeebpp.",".pebbpppebbpp.",".pPPppyyppPPp.","..pppppypppp..","qqpPPPPPPPpqq.","qqpPqPPqPPpqq.",".qpPPPPPPPpq..","..pppppppppp..","...yy....yy...","..yyy....yyy.."],
 aegis1:[".....ee.......",".....q........","..pppppppppp..",".pPPppppppppq.",".pqqqqqqqqqpq.",".pqeeqqqeeqpq.",".pqqqqqqqqqpq.",".pPPppppppppq.","..qqpppppqq...",".PqpPPePPpqP..",".PqpPPPPPpqP..","..qpppppppq...","..qq.....qq...",".qqq.....qqq.."],
 tidal1:[".p........p...",".pp......pp...",".pPp....pPp...",".pPpppppppPp..",".pppppppppppp.",".pPwbpppwbpp..",".pPbbpppbbpp..","..pPPbbbPPp...","...pPPPPPp....","..ppPPPPPpp.PP","..pPPPPPPPpPPw","..ppPPPPPppPw.","..pp.....pp...","..qq.....qq..."],
 blaze2:["..e............e..","..ee..........ee..","...eppppppppppe...","qq.pPPppppppppp.qq","qPqpPwwbppwwbpp.qPq".slice(0,18),"qPPpPwbbppwbbpppPq","qPPpPPPppppppppPPq","qPPPpppkRRkppppPPq","qqPPpppppppppppPqq",".qqqpPPPPPPPPpqqq.","...ppPPPPPPPPpp..q","...ppPPPPPPPPppppq","...ppPPPPPPPPpp.qq","....pppppppppp....","....ppp....ppp....","...eqq.....eqq...."],
 ever2:["..qqq........qqq..","..qpqq......qqpq..","..qpppyyyyyyppqq..","..pppppyyyypppppq.",".pPPpppppppppPPpq.",".peeebpppppeeebpq.",".pebbbpppppebbbpq.",".peeebppyyppeeepq.",".pPPpppyyyypppPPpq",
  "qqpPPPPPyyPPPPPpqq","qPqpPqPPPPPPqPpqPq","qPqpPPPqPPqPPPpqPq","qqqpPPPPPPPPPPpqqq","..qpppppppppppq...","....yyy....yyy....","...yyyy....yyyy..."],
 aegis2:["........ee........","........qq........","...pppppppppppp...","..pPPppppppppppq..","..pqqqqqqqqqqqpq..","..pqeeeqqqqeeeqq..","..pqqqqqqqqqqqpq..","..pPPpppppppppq...","yy.qqpppppppqq.yy.","yeyqpPPPPPPPpqyey.","yeeyqpPPeePPpqyeey".slice(0,18),"yeyqpPPeeePPpqyey.","yy.qpPPPPPPPpq.yy.","...qppppppppq.....","...qqq....qqq.....","..qqqq....qqqq...."],
 tidal2:[".p............p...",".pp..........pp...",".pPp........pPp...",".pPPp......pPPp...",".pPpppppppppPPp...","pppppppppppppppp..","pPPwwbppppwwbPPp..","pPPwbbppppwbbPPp..",".pPPPPbbbbPPPPp...","..pPPPPPPPPPPp...P","...ppPPPPPPpp...PP","..ppPPPPPPPPpp.PPw","..pPPPPPPPPPPpPPw.","..ppPPPPPPPPppPw..","..ppp......ppp....","..qqq......qqq...."]
};
var ccache={};
function makeCore(key,scale){var m=key.match(/^core-(\w+)-(\d)$/);if(!m)return null;var c=m[1],st=+m[2],pal=CORE_PAL[c];if(!pal)return null;
  var art=st===0?CORE_ART.egg:CORE_ART[c+(st>=2?'2':'1')];if(!art)return null;var k=key+'|'+scale;
  if(!ccache[k]){var w=Math.max.apply(null,art.map(function(r){return r.length}));var pad=st===3?3:1;var g=grid(w+pad*2,art.length+pad*2+1);putA(g,art,pad,pad);outline(g);
    if(st===3){[[0,2],[w+pad*2-2,4],[1,art.length],[w+pad*2-1,art.length-2],[Math.floor(w/2)+pad,0]].forEach(function(p){if(p[1]<g.h&&p[0]<g.w&&!g[p[1]][p[0]])g[p[1]][p[0]]='y'})}
    shadow(g,(w+pad*2)/2,art.length+pad,Math.round(w/3));
    ccache[k]=paint(g,scale,Object.assign({},BASE,pal,{b:'#221E30',k:'#F7A1C4'}))}
  return cloneCanvas(ccache[k])}

function make(key,sc,ds){ds=ds||{};sc=+sc||4;
  if(key==='hero'||key==='heroM'){var s=sc<=2?1:Math.round(sc*0.75);return makeChar(key==='heroM'?'남':'여',ds.job||'',ds.hero||'#EE7FAE',s)}
  if(BOSS[key]){var bs=Math.max(1,Math.round(sc*0.6));if(sc>=2&&bs<2)bs=2;return makeBoss(key,bs)}
  if(DECO[key]){return makeDeco(key,sc)}
  if(key.indexOf('core-')===0){return makeCore(key,sc)}
  return null}

window.RRART={make:make,scene:scene,charGrid:charGrid,BASE:BASE,auraPal:auraPal,paint:paint};
})();
