/* SubSyncAI install guide - copy buttons (was an inline script; moved out for the Content-Security-Policy). */
document.addEventListener('click',function(e){var b=e.target.closest('.copybtn');if(!b)return;var t=b.getAttribute('data-copy');
function done(){b.textContent=(window.subsyncT&&window.subsyncT('copied'))||'Copied!';b.classList.add('ok');setTimeout(function(){b.textContent=(window.subsyncT&&window.subsyncT('copy'))||'Copy';b.classList.remove('ok')},1600)}
function fallback(){var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(_){}document.body.removeChild(ta)}
if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done,fallback)}else{fallback()}});
