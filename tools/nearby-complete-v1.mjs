import previous from './market-sync-voice-v1.mjs';
export const css=`html[data-nearby-layout="1"],html[data-nearby-layout="1"] body{overflow:visible!important;height:auto!important;max-height:none!important}#nearbyPages{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;padding:20px 0 40px}#nearbyPages button{min-height:54px;padding:12px 18px;border:2px solid #ffab24;border-radius:12px;background:#126fb9;color:white;font:900 18px Arial}#nearbyPages button:disabled{opacity:.45}#nearbyPages span{flex-basis:100%;text-align:center;font:800 17px Arial}`;
export const client=`(()=>{
 const layout=window.CouteauNearbyLayout;if(!layout)return;
 const original=layout.setCards.bind(layout);let page=0,html='',nav=null;const size=20;
 function show(move){
  const template=document.createElement('template');template.innerHTML=html;
  const all=Array.from(template.content.children),items=all.filter(n=>n.matches('.card'));
  const pages=Math.max(1,Math.ceil(items.length/size));page=Math.min(page,pages-1);
  const keep=new Set(items.slice(page*size,(page+1)*size));
  original(all.filter(n=>!n.matches('.card')||keep.has(n)).map(n=>n.outerHTML).join(''));
  const cards=document.getElementById('cards');cards.dataset.totalMarkets=String(items.length);
  if(!nav){nav=document.createElement('nav');nav.id='nearbyPages';nav.setAttribute('aria-label','Pages des marchés');cards.after(nav)}
  nav.replaceChildren();
  if(pages>1){
   const label=document.createElement('span');label.textContent='Marchés '+(page*size+1)+' à '+Math.min((page+1)*size,items.length)+' sur '+items.length+' — page '+(page+1)+' / '+pages;nav.append(label);
   for(const [text,delta,disabled] of [['← Précédents',-1,page===0],['Suivants →',1,page===pages-1]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;b.onclick=()=>{page+=delta;show(true)};nav.append(b)}
  }
  if(move){document.dispatchEvent(new Event('nearby-page-changed'));cards.scrollIntoView({block:'start'});}
 }
 layout.setCards=function(value){html=value;show(false)};
})();`;
export function patchSource(s){
 if(!s.includes('async function fetchNearbyJson(url)'))return s;
 s=s.replace('function loadShared(list){',"document.addEventListener('nearby-page-changed',()=>{wireFavorites();wirePhotos();if(latestSharedList.length)loadShared(latestSharedList)});\n  function loadShared(list){")
 .replace('async function fetchNearbyJson(url){','async function fetchNearbyJson(url,attempt=0){')
 .replace('setTimeout(()=>controller.abort(),4500)','setTimeout(()=>controller.abort(),15000)')
 .replace('return response.ok?await response.json():null;','if(!response.ok)throw new Error("ZONE_HTTP_"+response.status);return await response.json();')
 .replace('}catch(_){return null}\n      finally{clearTimeout(timer)}','}catch(_){if(attempt===0)return fetchNearbyJson(url,1);return null}\n      finally{clearTimeout(timer)}')
 .replace('const loads=candidates.map(async a=>{','const loads=candidates.map(a=>async()=>{')
 .replace('const packs=loads.map(job=>job.then(({a,shard,main})=>{','const run=async(job)=>job().then(({a,shard,main})=>{')
 .replace('}).catch(()=>{loaded++}));\n    await Promise.all(packs);','}).catch(()=>{loaded++});\n    let nextZone=0;await Promise.all(Array.from({length:Math.min(4,loads.length)},async()=>{while(nextZone<loads.length){const job=loads[nextZone++];await run(job)}}));')
 .replace("const n=cards.querySelectorAll('.card').length,period=", "const n=Number(cards.dataset.totalMarkets)||cards.querySelectorAll('.card').length,period=");
 return s;
}
export default {...previous,async fetch(request,env,ctx){
 const response=await previous.fetch(request,env,ctx);
 if(!['/nearby-markets','/nearby-markets/','/nearby-markets.html'].includes(new URL(request.url).pathname)||!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
 let source='';const out=new HTMLRewriter().on('head',{element(e){e.append('<style>'+css+'</style><script>'+client+'</script>',{html:true})}}).on('script:not([src])',{element(){source=''},text(t){source+=t.text;if(t.lastInTextNode){t.replace(patchSource(source),{html:true});source=''}else t.remove()}}).transform(response);
 const headers=new Headers(out.headers);headers.delete('content-length');headers.delete('etag');headers.set('cache-control','no-store');headers.set('x-nearby-complete','1');return new Response(out.body,{status:out.status,headers});
}};
