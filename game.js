'use strict';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=720,H=1240;
const $=id=>document.getElementById(id);
const scoreEl=$('score'),bestEl=$('best'),ballsEl=$('balls'),multiEl=$('multi');
const modeEl=$('mode'),modeText=$('modeText'),backMode=$('backMode');
const pRampL=$('pRampL'),pRampR=$('pRampR'),pTargets=$('pTargets'),pSpinner=$('pSpinner');
const overlay=$('startOverlay'),startBtn=$('start'),pauseBtn=$('pause'),soundBtn=$('sound'),newGameBtn=$('newGame'),pauseOverlay=$('pauseOverlay');
const flLeft=$('flLeft'),flRight=$('flRight'),plunger=$('plunger');
let dpr=1;
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

let score=0,best=Number(localStorage.getItem('neonRushBestV4')||0),balls=3,multi=1,playing=false,paused=false,audioOn=true,last=0,shake=0,ballSave=0,combo=0,comboTimer=0;
let mode='ramps',multiball=0,ballsOnTable=0,jackpot=0;
const ball={x:625,y:1090,vx:0,vy:0,r:9,launched:false,launching:false};
const keys={left:false,right:false,upper:false,launch:false};
const flippers={
 left:{x:250,y:1095,len:122,angle:.32,rest:.32,up:-.54,active:false},
 right:{x:470,y:1095,len:122,angle:Math.PI-.32,rest:Math.PI-.32,up:Math.PI+.54,active:false},
 upper:{x:360,y:870,len:86,angle:-1.12,rest:-1.12,up:-.2,active:false}
};
const bumpers=[
 {x:255,y:280,r:43,base:'#54e8ff',value:150,pulse:0},
 {x:360,y:235,r:48,base:'#ff4fd8',value:200,pulse:0},
 {x:465,y:280,r:43,base:'#54e8ff',value:150,pulse:0},
 {x:290,y:400,r:31,base:'#ff4fd8',value:100,pulse:0},
 {x:430,y:400,r:31,base:'#54e8ff',value:100,pulse:0}
];
const targets=[
 {x:210,y:520,down:false,value:300},
 {x:360,y:500,down:false,value:400},
 {x:510,y:520,down:false,value:300}
];
const ramps=[
 {id:'L',x:115,y:565,w:155,h:210,done:false,glow:0},
 {id:'R',x:450,y:565,w:155,h:210,done:false,glow:0}
];
const spinner={x:360,y:610,hits:0,angle:0,flash:0};
const scoop={x:360,y:745,r:29,lit:false,flash:0};
const orbit={left:0,right:0};
const particles=[];

function fmt(n){return String(Math.max(0,Math.floor(n))).padStart(7,'0')}
function hud(){
 scoreEl.textContent=fmt(score);bestEl.textContent=fmt(best);ballsEl.textContent=balls;multiEl.textContent='x'+multi;
 pRampL.className=ramps[0].done?'on':'';pRampR.className=ramps[1].done?'on':'';
 pTargets.className=targets.every(t=>t.down)?'on':'';pSpinner.className=spinner.hits>=5?'on':'';
 backMode.textContent=modeLabel();
}
function modeLabel(){return mode==='ramps'?'SHOOT THE RAMPS':mode==='targets'?'CLEAR TARGET BANK':mode==='lock'?'SHOOT THE SCOOP':mode==='multi'?'MULTIBALL':'JACKPOT'}
function setMode(m){mode=m;const data={
 ramps:['SHOOT THE RAMPS','Completa las dos rampas para encender el LOCK.'],
 targets:['CLEAR TARGET BANK','Derriba los 3 targets para aumentar el multiplicador.'],
 lock:['SHOOT THE SCOOP','El scoop central está iluminado: busca el tiro con el upper flipper.'],
 multi:['MULTIBALL','Dos bolas extra están en juego. Mantén las bolas vivas y busca jackpots.'],
 jackpot:['JACKPOT LIT','Sigue golpeando el spinner y las rampas para cargar el jackpot.']};
 modeEl.textContent=data[m][0];modeText.textContent=data[m][1];hud();}
function audio(f=300,d=.045,type='square'){if(!audioOn)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const a=new A(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.value=.015;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d);setTimeout(()=>a.close(),d*1000+80)}catch(e){}}
function add(n,bonus=false){const val=Math.round(n*multi);score+=val;if(score>best){best=score;localStorage.setItem('neonRushBestV4',best)}combo++;comboTimer=150;if(bonus)addParticle(ball.x,ball.y,'+'+val,'#ffd76a');else if(n>=500)addParticle(ball.x,ball.y,'+'+val,'#65eaff');hud()}
function addParticle(x,y,text,color){particles.push({x,y,text,color,life:1,vy:-.6})}
function resetBall(){ball.x=625;ball.y=1090;ball.vx=0;ball.vy=0;ball.r=9;ball.launched=false;ball.launching=false}
function resetTable(){ramps.forEach(r=>{r.done=false;r.glow=0});targets.forEach(t=>t.down=false);spinner.hits=0;spinner.angle=0;scoop.lit=false;multiball=0;ballsOnTable=0;jackpot=0;orbit.left=0;orbit.right=0;particles.length=0;extraBalls.length=0;setMode('ramps');resetBall()}
function newGame(){score=0;balls=3;multi=1;combo=0;comboTimer=0;playing=true;paused=false;ballSave=0;resetTable();overlay.classList.add('hidden');pauseOverlay.classList.add('hidden');audio(440,.08,'triangle');}
function launch(){if(!playing||paused||ball.launched)return;ball.launched=true;ball.launching=false;ball.vx=-2.8;ball.vy=-16;audio(650,.07);addParticle(ball.x,ball.y,'LAUNCH','#65eaff')}
function drain(){
 if(ballSave>0){ballSave=0;resetBall();audio(900,.12,'sine');return}
 balls--;multi=1;combo=0;comboTimer=0;hud();
 if(balls<=0){playing=false;setTimeout(()=>{overlay.classList.remove('hidden');startBtn.querySelector('span').textContent='PLAY AGAIN';startBtn.querySelector('b').textContent='TOUCH TO REPLAY';overlay.querySelector('.start-card p').textContent='PARTIDA TERMINADA · SCORE '+fmt(score)+' · BEST '+fmt(best)},500);audio(70,.3,'sawtooth')}
 else {resetBall();audio(100,.15)}
}
function pointSegment(px,py,x1,y1,x2,y2){const vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1,l=vx*vx+vy*vy,t=l?Math.max(0,Math.min(1,(wx*vx+wy*vy)/l)):0;const x=x1+t*vx,y=y1+t*vy;return {x,y,dx:px-x,dy:py-y,d:Math.hypot(px-x,py-y)}}
function reflect(nx,ny,bounce=1){const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=2*dot*nx;ball.vy-=2*dot*ny;ball.vx*=bounce;ball.vy*=bounce}}
function wall(x1,y1,x2,y2,bounce=.88){const q=pointSegment(ball.x,ball.y,x1,y1,x2,y2);const min=ball.r+6;if(q.d<min){const d=q.d||.001,nx=q.dx/d,ny=q.dy/d;ball.x=q.x+nx*min;ball.y=q.y+ny*min;reflect(nx,ny,bounce)}}
function bumperHit(c){const dx=ball.x-c.x,dy=ball.y-c.y,d=Math.hypot(dx,dy),min=ball.r+c.r;if(d<min){const nx=dx/(d||1),ny=dy/(d||1);ball.x=c.x+nx*min;ball.y=c.y+ny*min;const speed=Math.max(8,Math.hypot(ball.vx,ball.vy));ball.vx=nx*speed;ball.vy=ny*speed;c.pulse=1;shake=5;add(c.value);audio(180+c.value,.055)}}
function flipperHit(f){const active=f.active;const target=active?f.up:f.rest;f.angle+=(target-f.angle)*.38;const ex=f.x+Math.cos(f.angle)*f.len,ey=f.y+Math.sin(f.angle)*f.len;const q=pointSegment(ball.x,ball.y,f.x,f.y,ex,ey);const min=ball.r+9;if(q.d<min&&ball.vy>0){const d=q.d||.001,nx=q.dx/d,ny=q.dy/d;ball.x=q.x+nx*min;ball.y=q.y+ny*min;reflect(nx,ny,1.02);if(active){const kick=f===flippers.left?-3.2:f===flippers.right?3.2:0;ball.vx+=kick;ball.vy-=3.5;add(75);audio(f===flippers.upper?700:520,.035,'triangle')}}}
function insideRect(x,y,r){return ball.x>x-r&&ball.x<x+r&&ball.y>y-r&&ball.y<y+r}
function targetHit(t){if(t.down)return;const d=Math.hypot(ball.x-t.x,ball.y-t.y);if(d<ball.r+15){t.down=true;add(t.value);audio(760,.05);addParticle(t.x,t.y,'TARGET','#ff4fd8');if(targets.every(a=>a.down)){multi=Math.min(5,multi+1);add(1500,true);targets.forEach(a=>a.down=false);if(mode==='targets'||mode==='ramps')setMode('lock')}}}
function rampHit(r){if(r.done)return;const inside=ball.x>r.x+10&&ball.x<r.x+r.w-10&&ball.y>r.y+20&&ball.y<r.y+r.h-20;if(inside&&ball.vy<0){r.done=true;r.glow=1;add(900);audio(920,.08,'triangle');addParticle(r.x+r.w/2,r.y+40,'RAMP +900','#65eaff');if(ramps.every(a=>a.done)){setMode('targets')}}}
function scoopHit(){if(!scoop.lit)return;const d=Math.hypot(ball.x-scoop.x,ball.y-scoop.y);if(d<ball.r+scoop.r){scoop.lit=false;add(2500,true);multi=Math.min(5,multi+1);jackpot++;audio(1100,.18,'sine');addParticle(scoop.x,scoop.y,'LOCK!','#ffd76a');if(jackpot>=1){startMultiball()}}}
function startMultiball(){if(multiball)return;multiball=2;ballsOnTable=2;mode='multi';setMode('multi');for(let i=0;i<2;i++)addBall(i);add(5000,true);audio(1300,.28,'sawtooth')}
const extraBalls=[];
function addBall(i){extraBalls.push({x:360+(i?18:-18),y:690,vx:(i?3:-3),vy:-11,r:8,life:1})}
function updateExtraBall(x){x.vy+=.23;x.x+=x.vx;x.y+=x.vy;x.vx*=.999;x.vy*=.999;const dx=x.x-360,dy=x.y-235,d=Math.hypot(dx,dy);if(d<55){const nx=dx/(d||1),ny=dy/(d||1),s=Math.max(8,Math.hypot(x.vx,x.vy));x.vx=nx*s;x.vy=ny*s;add(300)}for(const f of [flippers.left,flippers.right,flippers.upper]){const ex=f.x+Math.cos(f.angle)*f.len,ey=f.y+Math.sin(f.angle)*f.len;const q=pointSegment(x.x,x.y,f.x,f.y,ex,ey);if(q.d<x.r+9&&x.vy>0){const d=q.d||.001,nx=q.dx/d,ny=q.dy/d,xv=x.vx*nx+x.vy*ny;if(xv<0){x.vx-=2*xv*nx;x.vy-=2*xv*ny;x.vy-=3}}}if(x.x<105||x.x>615)x.vx*=-.85;if(x.y>1210)x.life=0}
function physics(dt){
 const scale=dt;
 if(!ball.launched){if(keys.launch)launch();return}
 ball.vy+=.27*scale;ball.x+=ball.vx*scale;ball.y+=ball.vy*scale;ball.vx*=.999;ball.vy*=.999;
 // Cabinet rails / apron / return lanes
 wall(92,115,92,1000,.86);wall(628,115,628,1000,.86);wall(92,115,628,115,.86);
 wall(92,1000,180,1125,.84);wall(628,1000,540,1125,.84);
 wall(120,890,205,805,.88);wall(600,890,515,805,.88);
 wall(205,805,155,700,.88);wall(515,805,565,700,.88);
 // slingshots
 wall(145,835,225,875,.92);wall(575,835,495,875,.92);
 for(const b of bumpers)bumperHit(b);
 for(const t of targets)targetHit(t);
 for(const r of ramps)rampHit(r);
 // Spinner crossing
 if(Math.abs(ball.x-spinner.x)<40&&Math.abs(ball.y-spinner.y)<17&&Math.abs(ball.vx)>1.2){spinner.hits++;spinner.angle+=.7;spinner.flash=1;add(125);audio(500,.025);if(spinner.hits>=5){spinner.hits=0;multi=Math.min(5,multi+1);add(1000,true);setMode('jackpot')}}
 if(mode==='lock'&&Math.hypot(ball.x-scoop.x,ball.y-scoop.y)<ball.r+scoop.r+8){scoop.lit=true;scoop.flash=1;add(150);}
 scoopHit();
 // Orbit shots: entering upper lanes
 if(ball.y<175){if(ball.x<180&&ball.vx>0){orbit.left++;add(700);audio(850,.04)}if(ball.x>540&&ball.vx<0){orbit.right++;add(700);audio(850,.04)}}
 flippers.left.active=keys.left;flippers.right.active=keys.right;flippers.upper.active=keys.upper;
 flipperHit(flippers.left);flipperHit(flippers.right);flipperHit(flippers.upper);
 for(let i=extraBalls.length-1;i>=0;i--){updateExtraBall(extraBalls[i]);if(!extraBalls[i].life){extraBalls.splice(i,1);ballsOnTable--;if(ballsOnTable<=0){multiball=0;setMode('jackpot')}}}
 if(ball.x<100||ball.x>620)ball.vx*=-.8;
 if(ball.y>1220)drain();
 for(const r of ramps)r.glow=Math.max(0,r.glow-.025*scale);for(const b of bumpers)b.pulse=Math.max(0,b.pulse-.045*scale);spinner.flash=Math.max(0,spinner.flash-.05*scale);scoop.flash=Math.max(0,scoop.flash-.04*scale);
 if(comboTimer>0)comboTimer-=scale;else combo=0;
 if(shake>0)shake-=.25*scale;
}
function glowCircle(x,y,r,color,a=1){ctx.save();ctx.globalAlpha=a;ctx.shadowBlur=22;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawTable(){
 ctx.clearRect(0,0,W,H);
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#071b31');bg.addColorStop(.42,'#06111f');bg.addColorStop(1,'#02050b');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 // playfield wood / printed art
 ctx.fillStyle='#08101b';ctx.fillRect(70,95,580,1125);
 ctx.save();ctx.globalAlpha=.18;for(let y=120;y<1190;y+=26){ctx.fillStyle=y%52?'#12314b':'#0b253d';ctx.fillRect(75,y,570,1)}ctx.restore();
 // outer rail
 ctx.strokeStyle='#3e536f';ctx.lineWidth=15;ctx.beginPath();ctx.roundRect(77,102,566,1110,34);ctx.stroke();ctx.strokeStyle='#65eaff';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(89,114,542,1086,27);ctx.stroke();
 // top arch / orbits
 ctx.strokeStyle='#ff4fd8';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(120,180);ctx.bezierCurveTo(120,115,235,125,260,205);ctx.stroke();
 ctx.strokeStyle='#65eaff';ctx.beginPath();ctx.moveTo(600,180);ctx.bezierCurveTo(600,115,485,125,460,205);ctx.stroke();
 // center title plate
 ctx.fillStyle='#0b1d30';ctx.strokeStyle='#284a66';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(245,130,230,70,15);ctx.fill();ctx.stroke();ctx.fillStyle='#74edff';ctx.font='900 20px system-ui';ctx.textAlign='center';ctx.fillText('NEON RUSH',360,163);ctx.fillStyle='#63728b';ctx.font='7px system-ui';ctx.fillText('CITY AFTER DARK',360,182);
 // ramp rails
 drawRamp(ramps[0], '#ff4fd8','LEFT RAMP');drawRamp(ramps[1], '#65eaff','RIGHT RAMP');
 // target bank
 ctx.fillStyle='#0b1525';ctx.strokeStyle='#394964';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(175,465,370,82,22);ctx.fill();ctx.stroke();ctx.fillStyle='#71809b';ctx.font='7px system-ui';ctx.fillText('TARGET BANK',360,480);
 for(const t of targets){ctx.save();ctx.translate(t.x,t.y);ctx.fillStyle=t.down?'#252f3d':'#ff4fd8';ctx.shadowBlur=t.down?0:15;ctx.shadowColor='#ff4fd8';ctx.beginPath();ctx.roundRect(-14,-22,28,44,7);ctx.fill();ctx.fillStyle=t.down?'#5d687b':'#fff';ctx.font='bold 9px system-ui';ctx.fillText(t.down?'X':'★',0,4);ctx.restore()}
 // spinner
 ctx.strokeStyle=spinner.flash>0?'#fff':'#ffd76a';ctx.lineWidth=7;ctx.shadowBlur=16;ctx.shadowColor='#ffd76a';ctx.beginPath();ctx.arc(360,610,37,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.save();ctx.translate(360,610);ctx.rotate(spinner.angle);ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(30,0);ctx.stroke();ctx.restore();ctx.fillStyle='#ffd76a';ctx.font='7px system-ui';ctx.fillText('SPINNER',360,656);
 // scoop
 ctx.fillStyle='#03060b';ctx.strokeStyle=scoop.lit||scoop.flash>0?'#ffd76a':'#42526c';ctx.lineWidth=7;ctx.beginPath();ctx.arc(scoop.x,scoop.y,scoop.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=scoop.lit?'#fff':'#63708a';ctx.font='bold 8px system-ui';ctx.fillText('LOCK',360,748);
 // slingshots
 drawSling(145,835,225,875,'#ff4fd8');drawSling(575,835,495,875,'#65eaff');
 // lower apron
 ctx.fillStyle='#0b101a';ctx.strokeStyle='#28374e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(180,1130);ctx.lineTo(245,1035);ctx.lineTo(475,1035);ctx.lineTo(540,1130);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#2b3d58';ctx.font='7px system-ui';ctx.fillText('NEON ARCADE',360,1115);
 // inlanes / outlanes
 ctx.strokeStyle='#ff4fd8';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(180,970);ctx.lineTo(220,1060);ctx.stroke();ctx.strokeStyle='#65eaff';ctx.beginPath();ctx.moveTo(540,970);ctx.lineTo(500,1060);ctx.stroke();
 // flippers
 drawFlipper(flippers.left,'#ff4fd8');drawFlipper(flippers.right,'#65eaff');drawFlipper(flippers.upper,'#a866ff');
 // ball
 drawBall(ball,'#f5fbff');for(const x of extraBalls)drawBall(x,'#ffd76a');
 // particles
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.y+=p.vy;p.life-=.018;if(p.life<=0){particles.splice(i,1);continue}ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=p.color;ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);ctx.restore()}
 // launch lane and indicator
 ctx.fillStyle='#0a101b';ctx.strokeStyle='#293a56';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(585,820,40,260,14);ctx.fill();ctx.stroke();ctx.fillStyle='#62718a';ctx.font='6px system-ui';ctx.fillText('PLUNGER',605,840);
 if(!ball.launched){ctx.fillStyle='#65eaff';ctx.font='900 9px system-ui';ctx.fillText('HOLD',605,875);ctx.fillText('LAUNCH',605,889)}
 // combo display
 if(combo>1){ctx.save();ctx.textAlign='center';ctx.globalAlpha=Math.min(1,comboTimer/50);ctx.fillStyle='#ffd76a';ctx.font='900 14px system-ui';ctx.fillText('COMBO ×'+combo,360,925);ctx.restore()}
}
function drawRamp(r,color,label){ctx.save();ctx.fillStyle='#0a1727';ctx.strokeStyle=color;ctx.lineWidth=5;ctx.shadowBlur=16;ctx.shadowColor=color;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,18);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#506078';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r.x+22,r.y+25);ctx.lineTo(r.x+r.w-22,r.y+r.h-25);ctx.stroke();ctx.fillStyle=r.done?'#fff':color;ctx.font='900 8px system-ui';ctx.textAlign='center';ctx.fillText(label,r.x+r.w/2,r.y+24);ctx.fillStyle='#52627c';ctx.font='6px system-ui';ctx.fillText('ORBIT',r.x+r.w/2,r.y+r.h-20);ctx.restore()}
function drawSling(x1,y1,x2,y2,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=16;ctx.shadowBlur=16;ctx.shadowColor=color;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle='#18243a';ctx.lineWidth=7;ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function drawFlipper(f,color){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.shadowBlur=18;ctx.shadowColor=color;ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(0,-12,f.len,24,12);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#09101d';ctx.beginPath();ctx.arc(9,0,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e8fbff';ctx.beginPath();ctx.arc(f.len-10,0,3,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawBall(x,color){ctx.save();ctx.shadowBlur=22;ctx.shadowColor=color;const g=ctx.createRadialGradient(x.x-3,x.y-4,1,x.x,x.y,x.r);g.addColorStop(0,'#fff');g.addColorStop(.55,color);g.addColorStop(1,'#56667f');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x.x,x.y,x.r,0,Math.PI*2);ctx.fill();ctx.restore()}
function render(){ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);drawTable();ctx.restore()}
function loop(t){const dt=Math.min(2.2,(t-last)/16.67||1);last=t;if(playing&&!paused)physics(dt);render();requestAnimationFrame(loop)}

function setPress(el,set){
 const down=e=>{e.preventDefault();set(true)};const up=e=>{e.preventDefault();set(false)};
 el.addEventListener('pointerdown',down,{passive:false});el.addEventListener('pointerup',up,{passive:false});el.addEventListener('pointercancel',up,{passive:false});el.addEventListener('pointerleave',up,{passive:false});
 el.addEventListener('touchstart',down,{passive:false});el.addEventListener('touchend',up,{passive:false});el.addEventListener('touchcancel',up,{passive:false});
}
setPress(flLeft,v=>keys.left=v);setPress(flRight,v=>keys.right=v);setPress(plunger,v=>keys.launch=v);
addEventListener('keydown',e=>{if(e.key==='ArrowLeft')keys.left=true;if(e.key==='ArrowRight')keys.right=true;if(e.key==='ArrowUp')keys.upper=true;if(e.code==='Space')keys.launch=true;if(e.key.toLowerCase()==='p')togglePause()});
addEventListener('keyup',e=>{if(e.key==='ArrowLeft')keys.left=false;if(e.key==='ArrowRight')keys.right=false;if(e.key==='ArrowUp')keys.upper=false;if(e.code==='Space')keys.launch=false});
function safeTap(el,fn){let lock=false;const run=e=>{if(e){e.preventDefault();e.stopPropagation()}if(lock)return;lock=true;fn(e);setTimeout(()=>lock=false,420)};el.addEventListener('pointerup',run,{passive:false});el.addEventListener('touchend',run,{passive:false});el.addEventListener('click',run)}
function togglePause(){if(!playing)return;paused=!paused;pauseOverlay.classList.toggle('hidden',!paused);pauseBtn.textContent=paused?'▶ RESUME':'Ⅱ PAUSE'}
safeTap(startBtn,()=>newGame());safeTap(pauseBtn,togglePause);safeTap(soundBtn,()=>{audioOn=!audioOn;soundBtn.textContent=audioOn?'🔊 SOUND':'🔇 MUTED'});safeTap(newGameBtn,newGame);
// iPad first-tap fallback: tapping anywhere inside the card starts the game, except if the button itself handled it.
overlay.addEventListener('pointerup',e=>{if(e.target.closest&&e.target.closest('#start'))return;if(!playing)newGame()},{passive:false});
overlay.addEventListener('touchend',e=>{if(e.target.closest&&e.target.closest('#start'))return;if(!playing){e.preventDefault();newGame()}},{passive:false});
// Initial state
setMode('ramps');hud();requestAnimationFrame(loop);
