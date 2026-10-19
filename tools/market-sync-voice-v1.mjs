import previous from './nearby-alerts-v2.mjs';
export function patchVoice(source){
 const old="preferredVoice=vv.find(function(v){return /^fr(?:-|_)/i.test(v.lang||'')})||vv.find(function(v){return /français|french/i.test(v.name||'')})||null;";
 const replacement=`var french=vv.filter(function(v){return /^fr(?:[-_]|$)/i.test(v.lang||'')||/français|french/i.test(v.name||'')});
      function score(v){var n=String(v.name||'');return (/^fr[-_]FR$/i.test(v.lang||'')?100:0)+(/premium|enhanced|amélior|natural|neural/i.test(n)?40:0)+(/google|microsoft/i.test(n)?20:0)+(v.localService?5:0);}
      french.sort(function(a,b){return score(b)-score(a)});preferredVoice=french[0]||null;`;
 if(!source.includes(old))throw Error('Unexpected voice source');
 return source.replace(old,replacement).replaceAll('.rate=.92','.rate=.78');
}
export function patchNearby(source){
 if(!source.includes('function loadShared(list){'))return source;
 return source.replace('function loadShared(list){',`let latestSharedList=[];
  setInterval(()=>{if(!document.hidden&&latestSharedList.length)loadShared(latestSharedList)},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&latestSharedList.length)loadShared(latestSharedList)});
  window.addEventListener('pageshow',()=>{if(latestSharedList.length)loadShared(latestSharedList)});
  function loadShared(list){
    latestSharedList=list;`);
}
export async function batchRead(request,env,ctx,handler){
 let input;try{input=await request.clone().json()}catch(_){return handler(request,env,ctx)}
 const keys=Array.isArray(input.keys)?[...new Set(input.keys)]:[];
 if(keys.length<=60)return handler(request,env,ctx);
 if(keys.length>2000)return Response.json({ok:false,error:'TROP_DE_FICHES'},{status:400});
 const property=new URL(request.url).pathname.includes('photos')?'photos':'states';
 const merged={ok:true,[property]:{}};
 for(let i=0;i<keys.length;i+=60){
  const part=new Request(request,{body:JSON.stringify({...input,keys:keys.slice(i,i+60)})});
  const response=await handler(part,env,ctx);
  if(!response.ok)return response;
  const data=await response.json();if(!data.ok)return Response.json(data,{status:502});
  Object.assign(merged[property],data[property]||{});
  if(data.required!==undefined)merged.required=data.required;
 }
 return Response.json(merged,{headers:{'cache-control':'no-store','x-market-batch':'60'}});
}
export default {...previous,async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 if(request.method==='POST'&&['/api/market-verifications/batch','/api/market-photos/batch'].includes(path))return batchRead(request,env,ctx,(r,e,c)=>previous.fetch(r,e,c));
 const response=await previous.fetch(request,env,ctx);
 if(!response.ok)return response;
 if(path==='/voice-assist-v486.js')return new Response(patchVoice(await response.text()),{headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-voice-clear':'1'}});
 if(['/nearby-markets','/nearby-markets/','/nearby-markets.html'].includes(path)&&(response.headers.get('content-type')||'').includes('text/html')){
  let text='';const out=new HTMLRewriter().on('script:not([src])',{element(){text=''},text(t){text+=t.text;if(t.lastInTextNode){t.replace(patchNearby(text),{html:true});text=''}else t.remove()}}).transform(response);
  const headers=new Headers(out.headers);headers.delete('content-length');headers.delete('etag');headers.set('cache-control','no-store');headers.set('x-market-sync','1');
  return new Response(out.body,{status:out.status,headers});
 }
 return response;
}};
