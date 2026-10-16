/* SubSyncAI home page - scroll reveals, progress bar, pointer parallax (was an inline script; moved out for the Content-Security-Policy). */
// Scroll reveals, page progress and subtle pointer parallax.
const revealTargets=document.querySelectorAll('.center,.card,.step,.price,.logo-row,.cta');
revealTargets.forEach((el,i)=>{el.classList.add('reveal');el.style.transitionDelay=((i%3)*80)+'ms'});
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});
revealTargets.forEach(el=>io.observe(el));
const progress=document.getElementById('progress');
addEventListener('scroll',()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max?scrollY/max*100:0)+'%'},{passive:true});
const glow=document.getElementById('cursorGlow');
addEventListener('pointermove',e=>{glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'},{passive:true});
const screen=document.querySelector('.screen');
if(matchMedia('(pointer:fine)').matches){screen.addEventListener('pointermove',e=>{const r=screen.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;screen.style.animation='none';screen.style.transform=`perspective(1000px) rotateY(${x*7-2}deg) rotateX(${-y*5+1}deg) translateY(-4px)`});screen.addEventListener('pointerleave',()=>{screen.style.transform='';screen.style.animation=''})}

/* Carry the campaign tags (utm_*) to the Lemon Squeezy checkout as custom data, so the order can be attributed.
   Tags are kept for the rest of the visit (sessionStorage) only if the visitor accepted analytics. */
(function () {
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"], tags = {}, q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  KEYS.forEach(function (k) { var v = (q.get(k) || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 100); if (v) tags[k] = v; });
  var fresh = Object.keys(tags).length > 0;
  try {
    if (fresh && localStorage.getItem("subsync_analytics_consent") === "granted") sessionStorage.setItem("subsync_utm", JSON.stringify(tags));
    if (!fresh) { var saved = JSON.parse(sessionStorage.getItem("subsync_utm") || "null"); if (saved && typeof saved === "object") KEYS.forEach(function (k) { if (typeof saved[k] === "string") tags[k] = saved[k].slice(0, 100); }); }
  } catch (e) {}
  if (!Object.keys(tags).length) return;
  document.querySelectorAll('a[href*="lemonsqueezy.com/checkout"]').forEach(function (a) {
    try {
      var u = new URL(a.href);
      KEYS.forEach(function (k) { if (tags[k]) u.searchParams.set("checkout[custom][" + k + "]", tags[k]); });
      a.href = u.toString();
    } catch (e) {}
  });
})();
