const C=document.getElementById('game'),ctx=C.getContext('2d');
const scoreEl=document.getElementById('score'),bestEl=document.getElementById('best'),ballsEl=document.getElementById('balls'),multiEl=document.getElementById('multi'),missionEl=document.getElementById('mission'),comboEl=document.getElementById('combo');
const overlay=document.getElementById('startOverlay'),start=document.getElementById('start'),pauseBtn=document.getElementById('pause'),pauseOverlay=document.getElementById('pauseOverlay'),soundBtn=document.getElementById('sound'),newGameBtn=document.getElementById('newGame'),message=document.getElementById('message');
const W=720,H=1180;let dpr=1,playing=false,paused=false,audioOn=true,score=0,best=+localStorage.getItem('neonPinballBest2')||0,balls=3,multi=1,combo=0,comboTimer=0,shake=0,last=0;
let left=false,right=false,launch=false,launched=false,ballTimer=0,extraBalls=0,multiBalls=[];
const ball={x:565,y:1050,vx:0,vy:0,r:10};
const flippers={L:{x:275,y:1055,len:130,angle:.30,target:.30},R:{x:445,y:1055,len:130,angle:Math.PI-.30,target:Math.PI-.30}};
const bumpers=[{x:220,y:310,r:45,pts:100,h:0},{x:360,y:250,r:51,pts:150,h:0},{x:500,y:310,r:45,pts:100,h:0},{x:270,y:430,r:34,pts:75,h:0},{x:450,y:430,r:34,pts:75,h:0}];
const targets=[{x:175,y:555,on:false,n:'A'},{x:360,y:520,on:false,n:'R'},{x:545,y:555,on:false,n:'C'}];
const lanes=[{x:140,y:185,w:36,h:210},{x:544,y:185,w:36,h:210}];
function resize(){dpr=Math.min(devicePixelRatio||1,2);C.width=W*dpr;C.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
function fmt(n){return String(Math.floor(n)).padStart(6,'0')}function hud(){scoreEl.textContent=fmt(score);bestEl.textContent=fmt(best);ballsEl.textContent=balls;multiEl.textContent='x'+multi;comboEl.textContent=combo?combo+' HIT':'—'}
function snd(freq=240,dur=.045){if(!audioOn)return;try{const a=new (AudioContext||webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+dur)}catch{}}
function flash(txt){message.textContent=txt;message.classList.remove('hidden');setTimeout(()=>message.classList.add('hidden'),700)}
function scoreAdd(n){score+=Math.round(n*multi);if(score>best){best=score;localStorage.setItem('neonPinballBest2',best)}hud()}
function resetBall(){ball.x=565;ball.y=1030;ball.vx=0;ball.vy=0;launched=false;ballTimer=0}
function newGame(){score=0;balls=3;multi=1;combo=0;extraBalls=0;targets.forEach(t=>t.on=false);multiBalls=[];resetBall();playing=true;paused=false;overlay.classList.add('hidden');pauseOverlay.classList.add('hidden');missionEl.textContent='LIGHT 3 TARGETS';hud();snd(300,.08)}
function launchBall(){if(launched)return;launched=true;ball.vx=-3.8;ball.vy=-11.5;snd(520,.06)}
function endBall(){balls--;multi=1;combo=0;hud();if(balls<=0){playing=false;flash('GAME OVER');setTimeout(()=>{overlay.classList.remove('hidden');overlay.querySelector('h1').textContent='GAME OVER';overlay.querySelector('p').textContent='Puntuación '+fmt(score)+' · Récord '+fmt(best);start.textContent='JUGAR DE NUEVO'},650)}else{resetBall();snd(90,.15)}}
function circle(c){const dx=ball.x-c.x,dy=ball.y-c.y,d=Math.hypot(dx,dy),m=ball.r+c.r;if(d<m){const nx=dx/(d||1),ny=dy/(d||1);ball.x=c.x+nx*m;ball.y=c.y+ny*m;const dot=ball.vx*nx+ball.vy*ny;ball.vx-=2*dot*nx;ball.vy-=2*dot*ny;ball.vx*=1.07;ball.vy*=1.07;c.h=1;scoreAdd(c.pts);combo++;comboTimer=90;shake=5;snd(180+c.pts, .045);hud();return true}}
function seg(x1,y1,x2,y2,force=1){const vx=x2-x1,vy=y2-y1,wx=ball.x-x1,wy=ball.y-y1,t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/(vx*vx+vy*vy))),px=x1+t*vx,py=y1+t*vy,dx=ball.x-px,dy=ball.y-py,d=Math.hypot(dx,dy);if(d<ball.r+6){const nx=dx/(d||1),ny=dy/(d||1);ball.x=px+nx*(ball.r+7);ball.y=py+ny*(ball.r+7);const dot=ball.vx*nx+ball.vy*ny;ball.vx-=2*dot*nx;ball.vy-=2*dot*ny;ball.vx*=force;ball.vy*=force;return true}}
function flipper(f,active){f.target=active?(f.x<f.y?-.55:Math.PI+.55):(f.x<f.y?.30:Math.PI-.30);f.angle+=(f.target-f.angle)*.35;const ex=f.x+Math.cos(f.angle)*f.len,ey=f.y+Math.sin(f.angle)*f.len;seg(f.x,f.y,ex,ey,1.08);return[ex,ey]}
function collide(){seg(105,155,105,1030);seg(615,155,615,1030);seg(105,155,615,155);
seg(105,1030,220,1135);seg(615,1030,500,1135);
seg(220,1135,275,1080);seg(500,1135,445,1080);
seg(150,650,235,720);seg(570,650,485,720);
for(const b of bumpers)circle(b);
for(const t of targets){if(!t.on&&Math.hypot(ball.x-t.x,ball.y-t.y)<29){t.on=true;scoreAdd(300);combo++;comboTimer=100;snd(760,.06);flash('TARGET '+t.n);if(targets.every(q=>q.on)){multi=Math.min(5,multi+1);targets.forEach(q=>q.on=false);scoreAdd(2000);flash('MULTIPLIER x'+multi);missionEl.textContent='MULTIPLIER ACTIVO';snd(980,.15)}}}
}
function update(dt){if(comboTimer>0)comboTimer-=dt;else combo=0;ball.vy+=.23*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=.999;ball.vy*=.999;
if(!launched){ball.y=1030-Math.min(80,ballTimer*1.5);ballTimer+=dt;if(launch)launchBall()}
collide();flipper(flippers.L,left);flipper(flippers.R,right);
if(ball.x<112||ball.x>608)ball.vx*=-.75;
if(ball.y>1150)endBall();
for(const b of bumpers)b.h=Math.max(0,b.h-dt*.05);
}
function drawTable(){const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#101b3b');bg.addColorStop(.55,'#071126');bg.addColorStop(1,'#030711');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
ctx.fillStyle='#0a0e1c';ctx.strokeStyle='#2b3c67';ctx.lineWidth=10;ctx.beginPath();ctx.roundRect(78,118,564,1030,34);ctx.fill();ctx.stroke();
ctx.strokeStyle='#4ee7ff';ctx.lineWidth=2;ctx.strokeRect(95,138,530,990);
ctx.fillStyle='#101a34';ctx.fillRect(125,160,470,55);ctx.fillStyle='#65eaff';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.fillText('NEON // PINBALL',360,195);
for(const l of lanes){ctx.fillStyle='#0d1630';ctx.fillRect(l.x,l.y,l.w,l.h);ctx.strokeStyle='#a04dff';ctx.lineWidth=3;ctx.strokeRect(l.x,l.y,l.w,l.h);for(let y=l.y+18;y<l.y+l.h;y+=35){ctx.fillStyle='#5deaff';ctx.fillRect(l.x+8,y,l.w-16,3)}}
ctx.strokeStyle='#ff43c8';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(145,640);ctx.quadraticCurveTo(240,715,170,835);ctx.stroke();ctx.strokeStyle='#54e8ff';ctx.beginPath();ctx.moveTo(575,640);ctx.quadraticCurveTo(480,715,550,835);ctx.stroke();
for(const t of targets){ctx.shadowBlur=20;ctx.shadowColor=t.on?'#fff':'#b34dff';ctx.fillStyle=t.on?'#fff':'#a04dff';ctx.beginPath();ctx.arc(t.x,t.y,14,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#aebbd4';ctx.font='bold 10px system-ui';ctx.fillText(t.n,t.x,t.y+4)}
for(const b of bumpers){ctx.shadowBlur=26;ctx.shadowColor='#3feaff';ctx.fillStyle='#10223f';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=6;ctx.strokeStyle=b.h?'#fff':'#4ee7ff';ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#dffcff';ctx.beginPath();ctx.arc(b.x,b.y,12,0,Math.PI*2);ctx.fill()}
ctx.fillStyle='#17233e';ctx.fillRect(535,940,54,150);ctx.strokeStyle='#5deaff';ctx.lineWidth=2;ctx.strokeRect(535,940,54,150);ctx.fillStyle='#56647f';ctx.font='9px system-ui';ctx.fillText('LAUNCH',562,930)
}
function drawFlipper(f,active){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.shadowBlur=22;ctx.shadowColor=f.x<360?'#ff43c8':'#4ee7ff';const g=ctx.createLinearGradient(0,-12,f.len,12);g.addColorStop(0,'#fff');g.addColorStop(.18,f.x<360?'#ff43c8':'#4ee7ff');g.addColorStop(1,'#18243e');ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(0,-13,f.len,26,13);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#0b1120';ctx.beginPath();ctx.arc(8,0,8,0,Math.PI*2);ctx.fill();ctx.restore()}
function drawBall(){ctx.shadowBlur=25;ctx.shadowColor='#fff';const g=ctx.createRadialGradient(ball.x-3,ball.y-4,1,ball.x,ball.y,ball.r);g.addColorStop(0,'#fff');g.addColorStop(.35,'#d8faff');g.addColorStop(1,'#6c819b');ctx.fillStyle=g;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake--}drawTable();drawBall();drawFlipper(flippers.L,left);drawFlipper(flippers.R,right);ctx.restore()}
function loop(t){const dt=Math.min(2,(t-last)/16.67||1);last=t;if(playing&&!paused)update(dt);draw();requestAnimationFrame(loop)}
function sideFromEvent(e){const x=e.touches?e.touches[0].clientX:e.clientX;if(x<innerWidth*.48)left=true;else if(x>innerWidth*.52)right=true;else launch=true}
function release(){left=false;right=false;launch=false}
C.addEventListener('touchstart',e=>{e.preventDefault();sideFromEvent(e)},{passive:false});C.addEventListener('touchend',e=>{e.preventDefault();release()},{passive:false});C.addEventListener('mousedown',sideFromEvent);addEventListener('mouseup',release);
addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')left=true;if(e.key==='ArrowRight'||e.key==='d')right=true;if(e.code==='Space')launch=true;if(e.key==='p')togglePause()});addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')left=false;if(e.key==='ArrowRight'||e.key==='d')right=false;if(e.code==='Space')launch=false});
function togglePause(){if(!playing)return;paused=!paused;pauseOverlay.classList.toggle('hidden',!paused)}
pauseBtn.onclick=togglePause;soundBtn.onclick=()=>{audioOn=!audioOn;soundBtn.textContent=audioOn?'🔊':'🔇'};newGameBtn.onclick=newGame;start.onclick=newGame;hud();requestAnimationFrame(loop);
