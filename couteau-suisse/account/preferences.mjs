const options={'cs-location-allowed':['true','false'],'gps_pref':['Mon GPS','Waze','Google Maps','Plans Apple'],'cs-translator-local':['1','0'],'cs-travel-mode-v1':['normal','convoi','motard','pieton'],'cs-gps-voice-enabled-v1':['true','false']};
export async function preferences(request,db,plan){
 const send=(v,status=200)=>Response.json(v,{status,headers:{'cache-control':'private, no-store',vary:'Cookie'}});
 if(!plan?.authenticated)return send({},403);
 if(request.method==='GET'){
  const {results}=await db.prepare('SELECT name,value FROM cs_preferences WHERE owner=?').bind(plan.owner).all();
  return send(Object.fromEntries(results.map(x=>[x.name,x.value])));
 }
 if(request.method!=='PUT'||request.headers.get('origin')!==new URL(request.url).origin)return send({},403);
 const data=await request.json().catch(()=>null);
 if(!options[data?.name]?.includes(data?.value))return send({},400);
 await db.prepare('INSERT INTO cs_preferences(owner,name,value) VALUES(?,?,?) ON CONFLICT(owner,name) DO UPDATE SET value=excluded.value').bind(plan.owner,data.name,data.value).run();
 return send({ok:true});
}
export async function applyLocationPreference(response,db,owner){
 if(!response.headers.get('content-type')?.includes('text/html'))return response;
 const pref=await db.prepare('SELECT value FROM cs_preferences WHERE owner=? AND name=?').bind(owner,'cs-location-allowed').first();
 if(pref?.value!=='false')return response;
 const headers=new Headers(response.headers),policy=(headers.get('permissions-policy')||'').split(',').filter(x=>x.trim()&&!/^geolocation\s*=/.test(x.trim()));
 headers.set('permissions-policy',[...policy,'geolocation=()'].join(', '));
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export function preferenceClient(){
 const keys=['cs-location-allowed','gps_pref','cs-translator-local','cs-travel-mode-v1','cs-gps-voice-enabled-v1'];
 const read=()=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)]));
 const initial=read(),queue=new Map();let sync=Promise.resolve(),ready=false;
 const save=(name,value)=>{if(value===null)return;queue.set(name,value);sync=sync.then(async()=>{
  const v=queue.get(name);if(v===undefined)return;
  const r=await fetch('/api/private-preferences',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({name,value:v})});
  if(r.ok&&queue.get(name)===v)queue.delete(name);
 }).catch(()=>{})};
 let previous=initial;
 function changed(){
  if(!ready)return;const next=read();for(const k of keys)if(previous[k]!==next[k]||queue.has(k))save(k,next[k]);previous=next;
 }
 fetch('/api/private-preferences',{cache:'no-store'}).then(async r=>{
  if(!r.ok)return;const remote=await r.json(),now=read();
  for(const k of keys){if(remote[k]!=null&&now[k]===initial[k])localStorage.setItem(k,remote[k]);else if(now[k]!==null)save(k,now[k]);}
  previous=read();ready=true;
  const input=document.getElementById('csAccountLocationAllowed');
  if(input){input.checked=remote['cs-location-allowed']!=='false';input.disabled=false;
   input.onchange=async()=>{input.disabled=true;const value=String(input.checked);
    try{const response=await fetch('/api/private-preferences',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({name:'cs-location-allowed',value})});
     if(!response.ok)throw Error();localStorage.setItem('cs-location-allowed',value);location.reload();
    }catch{input.checked=!input.checked;input.disabled=false;document.getElementById('csLocationStatus').textContent='Enregistrement impossible. Réessayez.'}
   };
  }
 window.CSGpsPreferences?.refresh();window.dispatchEvent(new Event('cs:preferences-restored'));
 }).catch(()=>{});
 document.addEventListener('change',()=>setTimeout(changed,0));window.addEventListener('online',changed);window.addEventListener('pageshow',changed);
}
