export function addressClient(){
 const form=document.querySelector('form'),list=document.querySelector('section'),status=document.querySelector('[role=status]');
 const fail=()=>status.textContent='Connexion impossible. Réessayez.';
 let generation=0;
 async function load(){
  const run=++generation;
  const [r,p]=await Promise.all([fetch('/api/private-addresses',{cache:'no-store'}),fetch('/api/private-preferences',{cache:'no-store'}).catch(()=>null)]);
  if(!r.ok)throw Error();
  const preferences=p?.ok?await p.json():{};
  const rows=await r.json();if(run!==generation)return;list.replaceChildren();
  const gps=preferences.gps_pref||localStorage.getItem('gps_pref')||'Mon GPS';
  if(!rows.length)list.textContent='Votre carnet est vide.';
  for(const row of rows){
   const card=document.createElement('article'),name=document.createElement('h2'),details=document.createElement('p'),go=document.createElement('a'),del=document.createElement('button');
   name.textContent=row.name;details.textContent=[row.address,row.phone,'Enregistrée par '+row.author].join('\n');
   const q=encodeURIComponent(row.address);
   go.textContent='Y aller · '+gps;go.href=gps==='Waze'?'https://waze.com/ul?q='+q+'&navigate=yes':gps==='Plans Apple'?'https://maps.apple.com/?daddr='+q:gps==='Google Maps'?'https://www.google.com/maps/dir/?api=1&destination='+q:'/gps/?destination='+q;
   const addressLink=document.createElement('a');addressLink.href=go.href;addressLink.textContent=row.name;
   name.replaceChildren(addressLink);
   del.textContent='Effacer';del.onclick=async()=>{if(!confirm('Effacer cette adresse sur tous vos appareils ?'))return;
    try{const r=await fetch('/api/private-addresses?id='+row.id,{method:'DELETE'});if(!r.ok)throw Error();await load();}catch{fail()}};
   card.append(name,details,go,del);list.append(card);
  }
 }
 if(new URLSearchParams(location.search).get('retour')==='traducteur')document.querySelector('a').href='/traducteur/';
 let id=crypto.randomUUID();
 form.onsubmit=async event=>{event.preventDefault();form.querySelector('button').disabled=true;
  try{const r=await fetch('/api/private-addresses?id='+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});if(!r.ok)throw Error();id=crypto.randomUUID();form.reset();status.textContent='Adresse enregistrée.';await load();}catch{fail()}finally{form.querySelector('button').disabled=false}};
 window.addEventListener('pageshow',()=>load().catch(fail));document.addEventListener('visibilitychange',()=>{if(!document.hidden)load().catch(fail)});
}
export function addressPage(){return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mes adresses</title><style>body{max-width:36rem;margin:auto;padding:20px;background:#11241e;color:#fff;font:18px system-ui}input,button,a{font:inherit;padding:12px;border-radius:10px}input{display:block;box-sizing:border-box;width:100%;margin:5px 0 12px}a{display:inline-block;color:#fff}button{margin:4px;background:#efd59d}article{border-top:1px solid #abbcaf}p{white-space:pre-line}</style><a href="/">← Retour</a><h1>Mes adresses</h1><form>${[['name','Nom'],['phone','Téléphone'],['address','Adresse complète'],['author','Enregistrée par']].map(([k,l])=>'<label>'+l+'<input required maxlength="500" name="'+k+'" type="'+(k==='phone'?'tel':'text')+'"></label>').join('')}<button>Enregistrer</button></form><p role="status"></p><section></section><script>(${addressClient})();</script></html>`,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'private, no-store'}})}

