import previous from './duplicate-review-v2.mjs';
export const paging=`
  let nearbyPageV3=0,nearbyAllV3=[];
  function paginateNearbyV3(list){
    nearbyAllV3=list.filter(x=>!x.special).sort((a,b)=>a.d-b.d).concat(list.filter(x=>!!x.special).sort((a,b)=>a.d-b.d));
    const total=nearbyAllV3.length,pages=Math.max(1,Math.ceil(total/20));nearbyPageV3=Math.max(0,Math.min(nearbyPageV3,pages-1));
    cards.dataset.totalMarkets=String(total);
    for(const side of ['top','bottom']){
      let nav=document.getElementById('nearbyPagerV3-'+side);if(!nav){nav=document.createElement('nav');nav.id='nearbyPagerV3-'+side;nav.className='nearbyPagerV3';nav.setAttribute('aria-label','Pages des marchés');if(side==='top')cards.before(nav);else cards.after(nav)}
      nav.replaceChildren();nav.hidden=total===0;
      const label=document.createElement('strong');label.textContent='Page '+(nearbyPageV3+1)+' / '+pages+' — '+total+' marchés';nav.append(label);
      for(const [title,delta,disabled] of [['← PAGE PRÉCÉDENTE',-1,nearbyPageV3===0],['PAGE SUIVANTE →',1,nearbyPageV3>=pages-1]]){
        const button=document.createElement('button');button.type='button';button.textContent=title;button.disabled=disabled;button.onclick=()=>{nearbyPageV3+=delta;render(nearbyAllV3);document.getElementById('nearbyPagerV3-top').scrollIntoView({block:'start',behavior:'instant'})};nav.append(button);
      }
    }
    return nearbyAllV3.slice(nearbyPageV3*20,(nearbyPageV3+1)*20);
  }
`;
export function patchPage(source){
 let removed=0;
 source=source.replace(/<script>([\s\S]*?)<\/script>/g,(tag,code)=>{if(code.includes('const layout=window.CouteauNearbyLayout')&&code.includes("let page=0,html=''")&&code.includes('const size=20')){removed++;return ''}return tag});
 if(removed!==1)throw Error('Old pagination hook not found');
 const needle='function render(list){';if(!source.includes(needle))throw Error('Render hook not found');source=source.replace(needle,paging+'\n'+needle);
 const dedup='list=window.MarketDedupV511.visible(list,selectedDay);';if(!source.includes(dedup))throw Error('Dedup hook not found');
 source=source.replace(dedup,dedup+'\n    list=paginateNearbyV3(list);');
 source=source.replace('statusCopy(list.length);','statusCopy(nearbyAllV3.length);');
 return source.replace('</head>','<style id="nearby-pages-v3">.nearbyPagerV3{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:center;padding:18px 0;grid-column:1/-1}.nearbyPagerV3[hidden]{display:none}.nearbyPagerV3 strong{width:100%;text-align:center;font:800 20px Arial}.nearbyPagerV3 button{flex:1;min-width:140px;min-height:64px;padding:14px 10px;border:2px solid #ffa500;border-radius:14px;background:#126fb9;color:white;font:900 18px Arial}.nearbyPagerV3 button:disabled{opacity:.4}#cards{content-visibility:visible!important;contain:none!important}#nearbyPages{display:none!important}</style></head>');
}
export default {...previous,async fetch(request,env,ctx){const r=await previous.fetch(request,env,ctx);if(!/^\/nearby-markets(?:\.html)?\/?$/.test(new URL(request.url).pathname)||!r.ok||!(r.headers.get('content-type')||'').includes('text/html'))return r;const text=patchPage(await r.text()),headers=new Headers(r.headers);headers.delete('content-length');headers.delete('etag');headers.set('cache-control','no-store');headers.set('x-nearby-pagination','20-before-render');return new Response(text,{status:r.status,headers})}};
