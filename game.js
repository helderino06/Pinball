const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('score'),bestEl=document.getElementById('best'),ballsEl=document.getElementById('balls');
const overlay=document.getElementById('overlay'),start=document.getElementById('start'),pause=document.getElementById('pause'),sound=document.getElementById('sound'),hint=document.getElementById('hint');
let W=720,H=1180,dpr=1,playing=false,paused=false,left=false,right=false,score=0,balls=3,best=+localStorage.getItem('neonPinballBest')||0,audioOn=true,raf,last=0,shake=0;
bestEl.textContent=best;
const ball={x:360,y:1010,vx:0,vy:0,r:12};
const fl={l:{x:280,y:1050,len:115,a:.28},r:{x:440,y:1050,len:115,a:Math.PI-.28}};
const bumpers=[{x:220,y:330,r:48,v:10},{x:360,y:270,r:52,v:15},{x:500,y:330,r:48,v:10},{x:270,y:470,r:35,v:8},{x:450,y:470,r:35,v:8}];
const targets=[{x:170,y:600,on:false},{x:550,y:600,on:false},{x:360,y:560,on:false}];
const walls=[{x1:90,y1:130,x2:90,y2:1000},{x1:630,y1:130,x2:630,y2:1000},{x1:90,y1:130,x2:630,y2:130}];
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);canvas.width=r.width*dpr;canvas.height=r.height*dpr;W=720;H=1180;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0)}
addEventListener('resize',resize); resize();
function resetBall(){ball.x=360;ball.y=1000;ball.vx=(Math.random()-.5)*5;ball.vy=-7}
function newGame(){score=0;balls=3;targets.forEach(t=>t.on=false);resetBall();playing=true;paused=false;overlay.classList.add('hidden');hint.classList.remove('hidden');updateHud()}
function updateHud(){scoreEl.textContent=score.toLocaleString('es-ES');bestEl.textContent=best.toLocaleString('es-ES');ballsEl.textContent=balls}
function addScore(n){score+=n;if(score>best){best=score;localStorage.setItem('neonPinballBest',best)}updateHud()}
function audio(){if(!audioOn)return;try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=160+Math.random()*180;o.type='sine';g.gain.value=.035;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.045)}catch{}}
function dist(a,b,c,d){return Math.hypot(a-c,b-d)}
function hitCircle(c){const dx=ball.x-c.x,dy=ball.y-c.y,d=Math.hypot(dx,dy),min=ball.r+c.r;if(d<min){const nx=dx/d,ny=dy/d;ball.x=c.x+nx*min;ball.y=c.y+ny*min;const dot=ball.vx*nx+ball.vy*ny;ball.vx-=2*dot*nx;ball.vy-=2*dot*ny;ball.vx*=1.06;ball.vy*=1.06;addScore(c.v);audio();shake=5;return true}}
function segmentCollision(x1,y1,x2,y2){const vx=x2-x1,vy=y2-y1,wx=ball.x-x1,wy=ball.y-y1,t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/(vx*vx+vy*vy))),px=x1+t*vx,py=y1+t*vy,dx=ball.x-px,dy=ball.y-py,d=Math.hypot(dx,dy);if(d<ball.r+5){const nx=dx/(d||1),ny=dy/(d||1);ball.x=px+nx*(ball.r+6);ball.y=py+ny*(ball.r+6);const dot=ball.vx*nx+ball.vy*ny;ball.vx-=2*dot*nx;ball.vy-=2*dot*ny;return true}}
function flipper(f,active,mirror){const a=active?(mirror?Math.PI+.55:-.55):(mirror?Math.PI-.28:.28);f.a+=(a-f.a)*.35;const ex=f.x+Math.cos(f.a)*f.len,ey=f.y+Math.sin(f.a)*f.len;segmentCollision(f.x,f.y,ex,ey);drawFlipper(f,active);return [ex,ey]}
function drawFlipper(f,active){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.shadowBlur=18;ctx.shadowColor='#63eaff';ctx.fillStyle='#65eaff';ctx.beginPath();ctx.roundRect(0,-11,f.len,22,11);ctx.fill();ctx.fillStyle='#dffbff';ctx.beginPath();ctx.arc(8,0,7,0,Math.PI*2);ctx.fill();ctx.restore()}
function update(dt){ball.vy+=.22*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=.999;ball.vy*=.999;
for(const w of walls)segmentCollision(w.x1,w.y1,w.x2,w.y2);for(const b of bumpers)hitCircle(b);
for(const t of targets){if(!t.on&&dist(ball.x,ball.y,t.x,t.y)<30){t.on=true;addScore(250);audio();if(targets.every(q=>q.on)){addScore(2000);targets.forEach(q=>q.on=false)}}}
flipper(fl.l,left,false);flipper(fl.r,right,true);
if(ball.x<105||ball.x>615)ball.vx*=-1;
if(ball.y>1145){balls--;updateHud();audio();if(balls<=0){playing=false;overlay.classList.remove('hidden');overlay.querySelector('h2').textContent='GAME OVER';overlay.querySelector('p').textContent=`Puntuación: ${score.toLocaleString('es-ES')} · Récord: ${best.toLocaleString('es-ES')}`;start.textContent='JUGAR DE NUEVO'}else resetBall()}
}
function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake--}ctx.clearRect(0,0,W,H);
const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#101a38');g.addColorStop(1,'#080b17');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
ctx.strokeStyle='#27345d';ctx.lineWidth=8;ctx.strokeRect(90,130,540,1000);
ctx.strokeStyle='#1b75a5';ctx.lineWidth=2;ctx.strokeRect(102,142,516,976);
ctx.fillStyle='#131d3d';ctx.fillRect(120,165,480,60);ctx.fillStyle='#6de9ff';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('NEON PINBALL',360,202);
for(const t of targets){ctx.shadowBlur=18;ctx.shadowColor=t.on?'#fff':'#9b5cff';ctx.fillStyle=t.on?'#fff':'#9b5cff';ctx.beginPath();ctx.arc(t.x,t.y,16,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
for(const b of bumpers){ctx.shadowBlur=22;ctx.shadowColor='#28dcff';ctx.fillStyle='#182d50';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#54e8ff';ctx.stroke();ctx.fillStyle='#dffcff';ctx.beginPath();ctx.arc(b.x,b.y,13,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
ctx.strokeStyle='#ff4fd8';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(135,720);ctx.quadraticCurveTo(260,780,180,910);ctx.stroke();ctx.strokeStyle='#54e8ff';ctx.beginPath();ctx.moveTo(585,720);ctx.quadraticCurveTo(460,780,540,910);ctx.stroke();
ctx.fillStyle='#f4fbff';ctx.shadowBlur=22;ctx.shadowColor='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
flipper(fl.l,left,false);flipper(fl.r,right,true);
ctx.restore()}
function loop(t){const dt=Math.min((t-last)/16.67,2)||1;last=t;if(playing&&!paused)update(dt);draw();raf=requestAnimationFrame(loop)}
function setSide(e){const x=(e.touches?e.touches[0].clientX:e.clientX),mid=innerWidth/2;if(x<mid)left=true;else right=true}
function clearSide(e){left=false;right=false}
canvas.addEventListener('touchstart',e=>{e.preventDefault();setSide(e)},{passive:false});canvas.addEventListener('touchend',e=>{e.preventDefault();clearSide(e)},{passive:false});canvas.addEventListener('mousedown',setSide);addEventListener('mouseup',clearSide);
addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='a')left=true;if(e.key==='ArrowRight'||e.key==='d')right=true;if(e.key===' ')paused=!paused});addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a')left=false;if(e.key==='ArrowRight'||e.key==='d')right=false});
start.onclick=newGame;pause.onclick=()=>{if(playing)paused=!paused};sound.onclick=()=>{audioOn=!audioOn;sound.textContent=audioOn?'🔊':'🔇'};loop(0);
