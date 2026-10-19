import previous from './nearby-complete-v1.mjs';
export const client=`(()=>{
 function wire(){document.querySelectorAll('a[href]').forEach(a=>{
  if(a.dataset.directRegistration==='1')return;
  let url;try{url=new URL(a.getAttribute('href'),location.href)}catch(_){return}
  if(url.origin!==location.origin||!/^\\/event-registration(?:\\.html)?\\/?$/.test(url.pathname))return;
  if(url.searchParams.get('mode')==='email')return;
  const destination=url.searchParams.get('url');if(!destination)return;
  let target;try{target=new URL(destination)}catch(_){return}
  if(!['https:','http:'].includes(target.protocol))return;
  a.dataset.directRegistration='1';a.href=target.href;a.target='_self';a.rel='noopener';a.textContent='S’INSCRIRE';
 })}
 function ready(){wire();new MutationObserver(wire).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();`;
export default {...previous,async fetch(request,env,ctx){
 const response=await previous.fetch(request,env,ctx);
 if(!['/nearby-markets','/nearby-markets/','/nearby-markets.html','/special-marches','/special-marches/','/special-marches.html'].includes(new URL(request.url).pathname)||!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
 const out=new HTMLRewriter().on('head',{element(e){e.append('<script>'+client+'</script>',{html:true})}}).transform(response);
 const h=new Headers(out.headers);h.delete('content-length');h.delete('etag');h.set('cache-control','no-store');h.set('x-registration-direct','1');return new Response(out.body,{status:out.status,headers:h});
}};
