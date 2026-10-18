// Scoped patch over the deployed Worker. Existing modules and bindings are retained.
import previous from './home-gps-logo.js';

export const css = `
html[data-nearby-layout="1"]{height:auto!important;min-height:100%!important;overflow-x:clip!important;overflow-y:visible!important}
html[data-nearby-layout="1"] body{height:auto!important;min-height:100vh;max-height:none!important;overflow:visible!important;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)!important}
html[data-nearby-layout="1"] main.wrap{width:100%!important;max-width:920px!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:12px!important}
html[data-nearby-layout="1"] #cards{height:auto!important;max-height:none!important;overflow:visible!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:stretch!important;content-visibility:visible!important;contain:none!important}
html[data-nearby-layout="1"] #cards>.card{height:auto!important;max-height:none!important;min-width:0!important;overflow:visible!important;content-visibility:visible!important;contain:none!important;padding:12px!important}
html[data-nearby-layout="1"] #cards .eventCityBig{overflow-wrap:anywhere}
html[data-nearby-layout="1"] #cards .market-actions a{overflow-wrap:anywhere;white-space:normal!important;min-height:44px!important}
html[data-nearby-layout="1"] #weatherBubble{position:static!important;inset:auto!important;transform:none!important;opacity:1!important;width:100%!important;min-width:0!important;max-width:none!important;margin:0 0 12px!important;transition:none!important;pointer-events:auto!important}
html[data-nearby-layout="1"] #weatherBubble .weatherMain{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere}
html[data-nearby-layout="1"] .nearby-photo-error{display:block;padding:8px 4px;color:#fff;font:800 10px/1.3 Arial;text-align:center}
`;

export const client = `(() => {
  if(window.CouteauNearbyLayout)return;
  const sources=new WeakMap();
  let restoreDone=false,userMoved=false;
  function key(node){return node.dataset.marketKey||'title:'+node.textContent;}
  window.CouteauNearbyLayout={
    setCards(html){
      const cards=document.getElementById('cards');
      const anchor=Array.from(cards.children).find(n=>n.dataset.marketKey&&n.getBoundingClientRect().bottom>0);
      const anchorTop=anchor?anchor.getBoundingClientRect().top:0;
      const old=new Map();
      for(const n of cards.children){const id=key(n);if(!old.has(id))old.set(id,[]);old.get(id).push(n);}
      const template=document.createElement('template');template.innerHTML=html;
      let cursor=cards.firstElementChild;
      for(const fresh of Array.from(template.content.children)){
        const id=key(fresh),existing=old.get(id)?.shift(),source=fresh.outerHTML;
        const node=existing&&sources.get(existing)===source?existing:fresh;
        sources.set(node,source);
        if(node===cursor)cursor=cursor.nextElementSibling;
        else cards.insertBefore(node,cursor);
        if(existing&&existing!==node){if(existing===cursor)cursor=cursor.nextElementSibling;existing.remove();}
      }
      old.forEach(nodes=>nodes.forEach(n=>n.remove()));
      if(anchor&&anchor.isConnected&&window.scrollY>0){
        const delta=anchor.getBoundingClientRect().top-anchorTop;
        if(Math.abs(delta)>1)window.scrollBy(0,delta);
      }
    },
    restoreScroll(){
      if(restoreDone||userMoved)return;
      let y=0;try{y=Number(sessionStorage.getItem('nearby100ScrollV519')||0)}catch(_){}
      if(!Number.isFinite(y)||y<=0){restoreDone=true;return;}
      // Wait for enough results, then restore once. Later refreshes must not jump back.
      if(document.documentElement.scrollHeight-window.innerHeight+2<y)return;
      restoreDone=true;requestAnimationFrame(()=>{if(!userMoved)window.scrollTo(0,y)});
    }
  };
  ['touchstart','wheel','keydown'].forEach(type=>window.addEventListener(type,()=>{userMoved=true},{passive:true,once:true}));
  function placeWeather(){
    const bubble=document.getElementById('weatherBubble'),wrap=document.querySelector('main.wrap');
    if(bubble&&wrap&&bubble.parentNode!==wrap)wrap.insertBefore(bubble,wrap.firstChild);
  }
  function ready(){
    placeWeather();
    new MutationObserver(placeWeather).observe(document.body,{childList:true});
    document.addEventListener('error',event=>{
      const img=event.target;if(!img.matches||!img.matches('#cards .market-photo img'))return;
      const button=img.closest('.market-photo');if(button.querySelector('.nearby-photo-error'))return;
      img.style.setProperty('display','none','important');button.dataset.photoFailed='1';
      const label=document.createElement('span');label.className='nearby-photo-error';label.textContent='Photo indisponible — Réessayer';button.appendChild(label);
    },true);
    document.addEventListener('click',event=>{
      const button=event.target.closest&&event.target.closest('#cards .market-photo[data-photo-failed="1"]');
      if(!button)return;event.preventDefault();event.stopImmediatePropagation();
      const img=button.querySelector('img');button.removeAttribute('data-photo-failed');button.querySelector('.nearby-photo-error')?.remove();
      if(img){img.style.removeProperty('display');const src=button.dataset.src||img.src;img.removeAttribute('src');img.src=src;}
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();`;

export function patchScript(source){
  if(!source.includes('function render(list)')||!source.includes('cards.innerHTML=html;'))return source;
  return source.replace('cards.innerHTML=html;','window.CouteauNearbyLayout.setCards(html);')
    .replace('    restoreNearbyScroll();','    window.CouteauNearbyLayout.restoreScroll();');
}

export default {...previous,async fetch(request,env,ctx){
  const response=await previous.fetch(request,env,ctx);
  if(!['/nearby-markets.html','/nearby-markets','/nearby-markets/'].includes(new URL(request.url).pathname)||!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let scriptText='';
  const out=new HTMLRewriter()
    .on('html',{element(e){e.setAttribute('data-nearby-layout','1');}})
    .on('head',{element(e){e.append('<style id="nearby-layout-v1">'+css+'</style><script>'+client+'</script>',{html:true});}})
    .on('script:not([src])',{
      element(){scriptText='';},
      text(t){scriptText+=t.text;if(t.lastInTextNode){t.replace(patchScript(scriptText),{html:true});scriptText='';}else t.remove();}
    }).transform(response);
  const headers=new Headers(out.headers);
  headers.delete('content-length');headers.delete('etag');
  headers.set('cache-control','no-store, no-cache, must-revalidate');
  headers.set('x-nearby-layout','1');
  return new Response(out.body,{status:out.status,statusText:out.statusText,headers});
}};
