const $=id=>document.getElementById(id),S={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const DUR={pomodoro:1500,shortBreak:300,longBreak:900},PETS=['🐱','🐶','🐼','🦊','🐰'],
TITLES=['Sleepy Seedling','Curious Cub','Cozy Explorer','Brave Buddy','Focus Ranger','Zen Master','Legendary Pal'],
SAY={idle:['Ready when you are!','Pick a quest and let\'s go!','I believe in you!'],focus:['Shh… deep focus mode 🤫','You\'re doing amazing!','Keep going, I\'m right here!','One tiny step at a time.'],snack:['Snack time! Stretch a bit 🍓','Drink some water!'],nap:['Nap time… zzz','Rest those eyes 🌙'],win:['Yay!! Session complete! 🎉','You did it! +XP!','So proud of you! ✨']},
TROPHY=[['🌱','First session',()=>sessions>=1],['🔥','3 sessions in a day',()=>done>=3],['⭐','100 XP',()=>xp>=100],['👑','Reach level 5',()=>level()>=5]];
const today=new Date().toDateString();
if(S.get('ff_day')!==today){S.set('ff_day',today);S.set('ff_hist',[]);S.set('ff_mins',0);S.set('ff_done',0)}
let mode='pomodoro',total=DUR.pomodoro,left=total,iv=null,endAt=0,running=false,
done=S.get('ff_done',0),mins=S.get('ff_mins',0),hist=S.get('ff_hist',[]),tasks=S.get('ff_tasks',[]),active=S.get('ff_active','My first quest'),
xp=S.get('ff_xp',0),sessions=S.get('ff_sessions',0),pet=S.get('ff_pet',0),unlocked=S.get('ff_trophies',[]);
const pick=a=>a[Math.floor(Math.random()*a.length)],level=()=>Math.floor(xp/50)+1;
function say(k){$('bubble').textContent=pick(SAY[k])}
function draw(){
  const m=String(Math.floor(left/60)).padStart(2,'0'),s=String(left%60).padStart(2,'0');
  $('time').textContent=m+':'+s;document.title=`${m}:${s} · ${active}`;
  $('ring').style.strokeDashoffset=867*(1-left/total);
  $('go').textContent=running?'⏸ Pause':(left<total?'▶ Resume':(mode==='pomodoro'?'▶ Start quest':'▶ Start break'));
  $('go').classList.toggle('run',running);$('timerCard').classList.toggle('run',running&&mode==='pomodoro');$('timerCard').classList.toggle('sleep',running&&mode!=='pomodoro');
}
function tick(){left=Math.max(0,Math.ceil((endAt-Date.now())/1000));draw();if(left===0)finish()}
function start(){if(running)return;running=true;endAt=Date.now()+left*1000;iv=setInterval(tick,250);say(mode==='pomodoro'?'focus':mode==='shortBreak'?'snack':'nap');draw()}
function pause(){if(!running)return;running=false;clearInterval(iv);draw()}
function toggle(){running?pause():start()}
function reset(){pause();left=total;draw()}
function setMode(m){
  mode=m;total=left=DUR[m];pause();document.body.dataset.mode=m;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.mode===m));
  $('lbl').textContent=m==='pomodoro'?`Quest ${done%4+1} of 4`:m==='shortBreak'?'Snack break':'Long nap';
  document.querySelectorAll('#dots i').forEach((d,i)=>d.classList.toggle('on',i<(done%4||(m==='longBreak'?4:0))));
  $('pet').textContent=m==='pomodoro'?PETS[pet]:'😴'.replace('😴',PETS[pet]);say(m==='pomodoro'?'idle':m==='shortBreak'?'snack':'nap');draw();
}
function finish(){
  pause();chime();confetti();
  if(mode==='pomodoro'){
    const n=Math.round(total/60),before=level();done++;sessions++;mins+=n;xp+=n;
    hist.unshift({task:active,min:n,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});
    S.set('ff_done',done);S.set('ff_mins',mins);S.set('ff_hist',hist);S.set('ff_xp',xp);S.set('ff_sessions',sessions);
    renderHist();stats();setMode(done%4===0?'longBreak':'shortBreak');
    $('pet').classList.add('cheer');setTimeout(()=>$('pet').classList.remove('cheer'),1700);
    say('win');toast(level()>before?`🎊 Level up! You're now level ${level()}`:`+${n} XP earned!`);
  }else{toast('Break over. Your buddy is ready!');setMode('pomodoro')}
}
function stats(){
  const l=level();$('lvl').textContent='Lv '+l;$('lvlTitle').textContent=TITLES[Math.min(l-1,TITLES.length-1)];
  $('xpTxt').textContent=`${xp%50}/50 XP`;$('barFill').style.width=(xp%50)*2+'%';
  $('today').textContent=`Today: ${Math.floor(mins/60)}h ${String(mins%60).padStart(2,'0')}m`;
  const t=$('trophies');t.innerHTML='';
  TROPHY.forEach(([e,n,ok],i)=>{const d=document.createElement('div'),on=ok();d.className='tr'+(on?' on':'');d.innerHTML=`<b>${e}</b>`;d.append(n);t.append(d);
    if(on&&!unlocked.includes(i)){unlocked.push(i);S.set('ff_trophies',unlocked);if(started)toast(`🏆 Trophy unlocked: ${n}`)}});
  const p=$('picker');p.innerHTML='';
  PETS.forEach((e,i)=>{const b=document.createElement('button');b.textContent=e;b.className=i===pet?'on':'';b.title='Choose buddy';
    b.onclick=()=>{pet=i;S.set('ff_pet',i);$('pet').textContent=e;stats();say('idle')};p.append(b)});
}
function renderHist(){
  const hl=$('hl');hl.innerHTML='';
  if(!hist.length){hl.innerHTML='<p class="empty">Nothing hatched yet today.<br>Finish a quest to fill your log!</p>';return}
  hist.slice(0,8).forEach(h=>{const d=document.createElement('div');d.className='hi';
    const a=document.createElement('span'),b=document.createElement('span');a.textContent='🐾 '+h.task;b.textContent=`+${h.min} XP · ${h.time}`;d.append(a,b);hl.append(d)});
}
function setActive(t){active=t;S.set('ff_active',t);$('pillText').textContent=t;draw();renderTasks()}
function renderTasks(){
  const ul=$('tl');ul.innerHTML='';$('cnt').textContent=`${tasks.filter(t=>t.done).length} of ${tasks.length} done`;
  tasks.forEach(t=>{
    const li=document.createElement('li');li.className=(t.done?'done ':'')+(t.title===active?'act':'');
    const lb=document.createElement('label'),cb=document.createElement('input'),sp=document.createElement('span'),x=document.createElement('button');
    cb.type='checkbox';cb.checked=t.done;sp.textContent=t.title;x.textContent='×';x.title='Remove quest';
    cb.onchange=()=>{t.done=cb.checked;S.set('ff_tasks',tasks);renderTasks();if(t.done){say('win');toast('Quest complete! ⭐')}};
    sp.onclick=e=>{e.preventDefault();setActive(t.title);toast(`Active quest: "${t.title}"`)};
    x.onclick=()=>{tasks=tasks.filter(k=>k.id!==t.id);S.set('ff_tasks',tasks);renderTasks()};
    lb.append(cb,sp);li.append(lb,x);ul.append(li);
  });
}
$('tf').onsubmit=e=>{e.preventDefault();const t=$('ti').value.trim();if(!t)return;
  tasks.push({id:Date.now(),title:t,done:false});S.set('ff_tasks',tasks);$('ti').value='';setActive(t);toast(`New quest: "${t}"`)};
$('pill').onclick=()=>{const n=prompt('Name your quest:',active);if(n&&n.trim())setActive(n.trim())};
$('clr').onclick=()=>{if(confirm("Clear today's adventure log?")){hist=[];S.set('ff_hist',hist);renderHist()}};
$('pet').onclick=()=>{$('pet').classList.add('cheer');setTimeout(()=>$('pet').classList.remove('cheer'),1700);say(running?(mode==='pomodoro'?'focus':'nap'):'idle')};
$('go').onclick=toggle;$('reset').onclick=reset;
$('plus').onclick=()=>{left+=300;total+=300;if(running)endAt+=300000;draw();toast('Added 5 minutes')};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>setMode(t.dataset.mode));
$('fs').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});
document.addEventListener('click',e=>{const b=e.target.closest('.btn,.tab,.tb');if(b)b.blur()});
addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(e.code==='Space'){e.preventDefault();toggle()}else if(/^r$/i.test(e.key))reset();else if(/^f$/i.test(e.key))$('fs').click();
});
let ctx,src,gain,rainOn=false;
const AC=()=>ctx||(ctx=new(window.AudioContext||window.webkitAudioContext)());
$('rain').onclick=()=>{
  const c=AC();c.resume();
  if(rainOn){src.stop();rainOn=false;$('rain').classList.remove('on');return}
  const buf=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=buf.getChannelData(0);let last=0;
  for(let i=0;i<d.length;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.5}
  src=c.createBufferSource();src.buffer=buf;src.loop=true;
  const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1100;
  gain=c.createGain();gain.gain.value=$('vol').value/160;
  src.connect(f);f.connect(gain);gain.connect(c.destination);src.start();rainOn=true;$('rain').classList.add('on');
};
$('vol').oninput=e=>{if(gain)gain.gain.value=e.target.value/160};
function chime(){try{const c=AC(),t=c.currentTime;[659,784,988].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=f;
  g.gain.setValueAtTime(.001,t+i*.14);g.gain.exponentialRampToValueAtTime(.18,t+i*.14+.03);g.gain.exponentialRampToValueAtTime(.0001,t+i*.14+.7);o.connect(g);g.connect(c.destination);o.start(t+i*.14);o.stop(t+i*.14+.8)})}catch{}}
function confetti(){
  const em=['⭐','🍓','🐾','🌸','✨','💜'];
  for(let i=0;i<30;i++){const p=document.createElement('i'),a=Math.random()*Math.PI*2,r=140+Math.random()*280;
    p.className='cf';p.textContent=em[i%6];
    p.style.setProperty('--x',Math.cos(a)*r+'px');p.style.setProperty('--y',Math.sin(a)*r-60+'px');p.style.setProperty('--r',Math.random()*540-270+'deg');
    document.body.append(p);setTimeout(()=>p.remove(),1600)}
}
let tt;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),3200)}
let started=false;const h=new Date().getHours();
$('greet').textContent=(h<5?'Late night grind':h<12?'Good morning':h<18?'Good afternoon':'Good evening')+'! Let\'s grow together 🌱';
$('pillText').textContent=active;setMode('pomodoro');renderTasks();renderHist();stats();started=true;

