/* ---------- View routing ---------- */
(function(){
  const views = ["home","research","publications","talks"];
  const alias = {about:"home", techniques:"research"};
  function show(){
    let h = location.hash.slice(1);
    h = alias[h] || h;
    if(!views.includes(h)) h = "home";
    views.forEach(v=>{
      document.getElementById("view-"+v).classList.toggle("active", v===h);
    });
    document.querySelectorAll("nav a").forEach(a=>{
      if(a.dataset.view===h) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
    });
    window.scrollTo(0,0);
    if(window.__fov) window.__fov.visible(h==="research");
  }
  window.addEventListener("hashchange", show);
  document.addEventListener("DOMContentLoaded", show);
  if(document.readyState!=="loading") show();
})();

/* ---------- Simulated field of view ---------- */
(function(){
  const field = document.getElementById("field");
  const cv = document.getElementById("fov");
  const ctx = cv.getContext("2d");
  const stamp = document.getElementById("stamp");
  const btn = document.getElementById("pause");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // seeded random so the layout is stable
  let seed = 7;
  const rnd = ()=>{ seed = (seed*16807)%2147483647; return (seed-1)/2147483646; };

  let W=0,H=0,dpr=1, nuclei=[], simSeconds=0, running=!reduce, onScreen=true, raf=null, last=0, acc=0;

  function layout(){
    nuclei = []; seed = 7;
    const target = W/H > 1.8 ? 11 : 7;
    const base = Math.min(W,H);
    let tries = 0;
    while(nuclei.length<target && tries<3000){
      tries++;
      const r = base*(0.11 + rnd()*0.09);
      const ax = r*(1+rnd()*0.35), ay = r*(0.78+rnd()*0.2);
      const x = ax + rnd()*(W-2*ax), y = ay + rnd()*(H-2*ay);
      if(nuclei.some(n=>Math.hypot(n.x-x,n.y-y) < (Math.max(n.ax,n.ay)+Math.max(ax,ay))*0.92)) continue;
      nuclei.push({x,y,ax,ay,rot:(rnd()-.5)*1.2,sites:[]});
    }
    const meanA = nuclei.reduce((s,n)=>s+n.ax*n.ay,0)/nuclei.length;
    nuclei.forEach(n=>{
      n.size = (n.ax*n.ay)/meanA;              // relative size
      const count = n.size>1.15 ? 2 : 1;       // big nuclei: replicated alleles
      for(let i=0;i<count;i++){
        const a = rnd()*Math.PI*2, d = 0.15+rnd()*0.45;
        n.sites.push({
          dx:Math.cos(a)*d*n.ax, dy:Math.sin(a)*d*n.ay,
          on: rnd()<0.3, I: rnd()*0.4, kon:0.035*n.size, koff:0.09
        });
      }
      n.img = renderNucleus(n);
    });
  }

  function renderNucleus(n){
    const pad = 6*dpr;
    const w = Math.ceil(n.ax*2+pad*2), h = Math.ceil(n.ay*2+pad*2);
    const off = document.createElement("canvas"); off.width=w; off.height=h;
    const c = off.getContext("2d");
    c.save(); c.translate(w/2,h/2);
    c.beginPath(); c.ellipse(0,0,n.ax,n.ay,0,0,Math.PI*2); c.clip();
    const g = c.createRadialGradient(0,0,0,0,0,Math.max(n.ax,n.ay));
    g.addColorStop(0,"rgba(70,120,130,0.55)"); g.addColorStop(0.85,"rgba(52,96,106,0.45)"); g.addColorStop(1,"rgba(80,140,150,0.6)");
    c.fillStyle=g; c.fillRect(-n.ax,-n.ay,n.ax*2,n.ay*2);
    // chromatin texture
    for(let i=0;i<Math.round(60*n.size);i++){
      const x=(rnd()*2-1)*n.ax, y=(rnd()*2-1)*n.ay, r=(1.5+rnd()*5)*dpr;
      c.fillStyle = rnd()<.5 ? "rgba(140,190,200,0.10)" : "rgba(0,0,0,0.18)";
      c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
    }
    // nucleoli
    for(let i=0;i<2;i++){
      const x=(rnd()*2-1)*n.ax*.45, y=(rnd()*2-1)*n.ay*.45;
      c.fillStyle="rgba(0,0,0,0.35)";
      c.beginPath(); c.ellipse(x,y,n.ax*.16,n.ay*.13,rnd()*3,0,Math.PI*2); c.fill();
    }
    c.restore();
    return off;
  }

  function resize(){
    const r = field.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio||1, 2);
    W = Math.max(1,Math.round(r.width*dpr)); H = Math.max(1,Math.round(r.height*dpr));
    cv.width=W; cv.height=H;
    layout(); draw();
  }

  function step(){
    simSeconds += 6;
    nuclei.forEach(n=>n.sites.forEach(s=>{
      if(s.on){ if(Math.random()<s.koff) s.on=false; }
      else if(Math.random()<s.kon) s.on=true;
    }));
  }
  function relax(){
    nuclei.forEach(n=>n.sites.forEach(s=>{
      const target = s.on ? 1 : 0;
      s.I += (target - s.I) * (s.on ? 0.06 : 0.025);
    }));
  }

  function draw(){
    ctx.globalCompositeOperation="source-over";
    ctx.fillStyle="#000"; ctx.fillRect(0,0,W,H);
    nuclei.forEach(n=>{
      ctx.save(); ctx.translate(n.x,n.y); ctx.rotate(n.rot);
      ctx.drawImage(n.img,-n.img.width/2,-n.img.height/2);
      ctx.restore();
    });
    ctx.globalCompositeOperation="lighter";
    nuclei.forEach(n=>{
      const c=Math.cos(n.rot), s_=Math.sin(n.rot);
      n.sites.forEach(s=>{
        if(s.I<0.02) return;
        const x = n.x + s.dx*c - s.dy*s_, y = n.y + s.dx*s_ + s.dy*c;
        const R = (5 + 9*s.I)*dpr;
        const g = ctx.createRadialGradient(x,y,0,x,y,R);
        g.addColorStop(0,`rgba(255,255,235,${0.95*s.I})`);
        g.addColorStop(0.25,`rgba(240,250,130,${0.75*s.I})`);
        g.addColorStop(1,"rgba(120,200,60,0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,R,0,Math.PI*2); ctx.fill();
      });
    });
    const t=simSeconds, hh=String(Math.floor(t/3600)).padStart(2,"0"),
          mm=String(Math.floor(t/60)%60).padStart(2,"0"), ss=String(t%60).padStart(2,"0");
    stamp.textContent = `${hh}:${mm}:${ss}`;
  }

  function loop(ts){
    if(!last) last=ts;
    acc += ts-last; last=ts;
    while(acc>100){ step(); acc-=100; }
    relax(); draw();
    raf = requestAnimationFrame(loop);
  }
  function start(){ if(raf||!running||!onScreen) return; last=0; raf=requestAnimationFrame(loop); }
  function stop(){ if(raf) cancelAnimationFrame(raf); raf=null; }

  btn.addEventListener("click",()=>{
    running=!running; btn.textContent = running ? "Pause" : "Play";
    running ? start() : stop();
  });

  onScreen = field.offsetParent !== null;
  if(reduce){
    // single static frame with a few sites lit
    resize();
    nuclei.forEach(n=>n.sites.forEach(s=>{ s.I = s.on ? 1 : 0; }));
    draw();
  } else {
    resize();
    // warm up so it opens mid-movie
    for(let i=0;i<40;i++){ step(); for(let j=0;j<6;j++) relax(); }
    draw(); start();
  }

  let rt; new ResizeObserver(()=>{ clearTimeout(rt); rt=setTimeout(()=>{
    resize();
    if(reduce){ nuclei.forEach(n=>n.sites.forEach(s=>{ s.I=s.on?1:0; })); draw(); }
  },120); }).observe(field);

  window.__fov = { visible(v){ onScreen=v; if(v){ resize(); start(); } else stop(); } };
})();

/* ---------- Compare slider ---------- */
(function(){
  const c=document.getElementById("compare"); if(!c) return;
  const r=c.querySelector("input");
  r.addEventListener("input",()=>c.style.setProperty("--pos", r.value+"%"));
})();
/* ---------- Pipeline lightbox ---------- */
(function(){
  const lb=document.getElementById("lightbox"), open=document.getElementById("openPipe"), close=document.getElementById("closePipe");
  open.addEventListener("click",()=>{ lb.classList.add("open"); document.body.style.overflow="hidden"; close.focus(); });
  function shut(){ lb.classList.remove("open"); document.body.style.overflow=""; open.focus(); }
  close.addEventListener("click",shut);
  lb.addEventListener("click",e=>{ if(e.target===lb) shut(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape" && lb.classList.contains("open")) shut(); });
})();

/* ---------- Cell movie ---------- */
(function(){
  const v=document.getElementById("cellVideo"); if(!v) return;
  const reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce) return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ const pr=v.play(); if(pr) pr.catch(()=>{}); } else v.pause();
  }),{threshold:.35});
  io.observe(v);
})();
