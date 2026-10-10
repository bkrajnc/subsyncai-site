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
