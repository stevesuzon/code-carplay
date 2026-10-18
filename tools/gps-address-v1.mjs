import previous from './nearby-layout-v1.mjs';

export const addressCss=`
#gpsAddressPage{position:fixed;inset:0;z-index:2000;overflow:auto;background:#071321;color:#fff;font-family:Arial,sans-serif;padding:calc(12px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));box-sizing:border-box}
#gpsAddressPage *{box-sizing:border-box}
.ga-shell{max-width:1050px;margin:auto}.ga-top{display:flex;align-items:center;gap:16px;margin-bottom:12px}.ga-top a{display:flex;align-items:center;min-height:48px;padding:10px 14px;border:2px solid #ffa923;border-radius:14px;color:#fff;text-decoration:none;font-size:17px;font-weight:800}.ga-top h1{margin:0;font-size:clamp(23px,5vw,32px);line-height:1.1}
.ga-layout{display:grid;gap:14px}.ga-label{display:block;font-size:19px;font-weight:800;margin-bottom:7px}
#gaInput{display:block;width:100%;height:90px;padding:12px;border:3px solid #62d8ff;border-radius:16px;background:#f8fbff;color:#071321;font:800 26px/1.15 Arial;resize:none;outline:none;overflow:auto}
#gaInput:focus{border-color:#ffbd55;box-shadow:0 0 0 3px #ffbd5533}
#gaStatus{font-size:16px;line-height:1.3;min-height:23px;margin:9px 0;color:#c8e8ff}
#gaResults{display:grid;gap:7px;max-height:22dvh;overflow:auto;overscroll-behavior:contain}
#gaResults button{display:block;width:100%;padding:12px;text-align:left;border:2px solid #436582;border-radius:13px;background:#152b43;color:#fff;font:800 19px/1.2 Arial;min-height:54px;white-space:normal}
#gaResults button[aria-pressed="true"]{border-color:#61e3a7;background:#114332}
#gaConfirm{width:100%;min-height:60px;margin-top:10px;padding:12px;border:0;border-radius:16px;background:#16ae70;color:#fff;font:900 24px Arial}
#gaConfirm:disabled{background:#34485c;color:#b8c4cf}
.ga-keyboard{display:grid;gap:6px;align-content:start}.ga-row{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}.ga-row button{min-width:0;min-height:54px;padding:0;border:1px solid #577b9e;border-radius:9px;background:#253e59;color:white;font:800 clamp(19px,5.5vw,26px) Arial;touch-action:manipulation;box-shadow:0 3px 0 #020812}
.ga-row button:active{background:#008dd1}.ga-actions{display:grid;grid-template-columns:1fr 2fr 1fr;gap:5px}.ga-actions button{min-width:0;min-height:52px;border:1px solid #577b9e;border-radius:10px;background:#1d3650;color:#fff;font:800 16px Arial;touch-action:manipulation}
#gaNative{justify-self:center;border:0;background:transparent;color:#8edfff;font:700 15px Arial;text-decoration:underline;padding:9px}
@media(orientation:landscape) and (min-width:640px){.ga-layout{grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:18px}.ga-top{margin-bottom:8px}.ga-top a{min-height:40px;padding:6px 12px}.ga-top h1{font-size:25px}#gaInput{height:74px;font-size:25px}#gaResults{max-height:23dvh}.ga-row button{min-height:42px;font-size:23px}.ga-actions button{min-height:42px}#gaConfirm{min-height:52px;margin-top:7px}.ga-keyboard{gap:5px}#gaNative{padding:5px}}
`;

export const addressBody=`<div id="gpsAddressPage"><div class="ga-shell">
<header class="ga-top"><a href="/index.html">← Accueil</a><h1>Où voulez-vous aller ?</h1></header>
<div class="ga-layout"><section aria-label="Adresse de destination">
<label class="ga-label" for="gaInput">Écrivez l’adresse et la ville</label>
<textarea id="gaInput" rows="2" readonly inputmode="none" autocomplete="street-address" placeholder="Ex. : 12 rue de Paris, Montlhéry" spellcheck="false"></textarea>
<div id="gaStatus" role="status" aria-live="polite">Utilisez le grand clavier ci-dessous.</div>
<div id="gaResults" aria-label="Adresses trouvées"></div>
<button id="gaConfirm" disabled>CONFIRMER</button>
</section><section class="ga-keyboard" id="gaKeyboard" aria-label="Grand clavier AZERTY">
<div class="ga-row" data-keys="1234567890"></div><div class="ga-row" data-keys="AZERTYUIOP"></div><div class="ga-row" data-keys="QSDFGHJKLM"></div><div class="ga-row" data-keys="WXCVBNÉ-'."></div>
<div class="ga-actions"><button type="button" data-edit="back" aria-label="Effacer le dernier caractère">⌫</button><button type="button" data-edit="space">ESPACE</button><button type="button" data-edit="clear">Tout effacer</button></div>
<button id="gaNative" type="button">Clavier du téléphone / dictée</button>
</section></div></div></div>`;

export const addressClient=`(()=>{
 const input=document.getElementById('gaInput'),results=document.getElementById('gaResults'),status=document.getElementById('gaStatus'),confirm=document.getElementById('gaConfirm'),keyboard=document.getElementById('gaKeyboard');
 let chosen=null,timer=0,controller=null,sequence=0;
 const valid=p=>p&&typeof p.name==='string'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=41&&p.lat<=51.6&&p.lon>=-5.6&&p.lon<=10;
 function save(){try{sessionStorage.setItem('gps-address-v1',JSON.stringify({text:input.value,chosen}))}catch(_){}}
 function select(p,button){chosen=p;input.value=p.name;confirm.disabled=false;status.textContent='Adresse choisie. Appuyez sur Confirmer.';results.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));save();}
 async function search(){
  const q=input.value.trim();if(q.length<3)return;
  const id=++sequence;controller?.abort();controller=new AbortController();const active=controller,timeout=setTimeout(()=>active.abort(),12000);
  status.textContent='Recherche de l’adresse…';
  try{
   const response=await fetch('/gps-address-search?q='+encodeURIComponent(q),{signal:active.signal,cache:'no-store'});const data=await response.json();
   if(id!==sequence)return;if(!response.ok)throw Error(data.error||'Recherche indisponible.');
   const places=(data.results||[]).filter(valid).slice(0,7);results.replaceChildren();
   places.forEach(p=>{const b=document.createElement('button');b.type='button';b.textContent=p.name;b.setAttribute('aria-pressed','false');b.onclick=()=>select(p,b);results.appendChild(b)});
   status.textContent=places.length?'Touchez l’adresse exacte dans la liste.':'Adresse introuvable. Ajoutez le numéro et la ville.';
  }catch(error){if(id===sequence)status.textContent=error.name==='AbortError'?'La recherche prend trop de temps. Modifiez l’adresse pour réessayer.':'Recherche indisponible. Vérifiez la connexion puis réessayez.';}
  finally{clearTimeout(timeout)}
 }
 function changed(){clearTimeout(timer);sequence++;controller?.abort();chosen=null;confirm.disabled=true;results.replaceChildren();save();status.textContent=input.value.trim().length<3?'Écrivez au moins 3 caractères.':'Recherche de l’adresse…';if(input.value.trim().length>=3)timer=setTimeout(search,450);}
 function edit(value){
  let start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
  if(value==='back'){if(start===end)start=Math.max(0,start-1);value='';}
  if(value==='clear'){start=0;end=input.value.length;value='';}
  input.setRangeText(value,start,end,'end');changed();
 }
 keyboard.querySelectorAll('[data-keys]').forEach(row=>{for(const char of row.dataset.keys){const b=document.createElement('button');b.type='button';b.textContent=char;b.dataset.key=char;b.setAttribute('aria-label',char);row.appendChild(b)}});
 keyboard.addEventListener('pointerdown',event=>{if(event.target.closest('[data-key],[data-edit]'))event.preventDefault();});
 keyboard.addEventListener('click',event=>{const b=event.target.closest('[data-key],[data-edit]');if(!b)return;input.readOnly=true;input.inputMode='none';input.blur();edit(b.dataset.key||({space:' ',back:'back',clear:'clear'})[b.dataset.edit]);});
 input.addEventListener('input',changed);
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();clearTimeout(timer);search();}});
 document.getElementById('gaNative').onclick=()=>{input.readOnly=false;input.inputMode='text';input.focus();input.setSelectionRange(input.value.length,input.value.length);};
 confirm.onclick=()=>{if(!valid(chosen))return;save();const params=new URLSearchParams({destination:chosen.lat+','+chosen.lon,name:chosen.name,from:'address'});location.assign('/gps?'+params);};
 try{const saved=JSON.parse(sessionStorage.getItem('gps-address-v1')||'null');if(saved){input.value=String(saved.text||'').slice(0,300);input.setSelectionRange(input.value.length,input.value.length);if(valid(saved.chosen)&&saved.chosen.name===input.value){chosen=saved.chosen;confirm.disabled=false;status.textContent='Modifiez l’adresse ou confirmez pour repartir.';}else if(input.value.trim().length>=3)timer=setTimeout(search,100);}}catch(_){}
})();`;

function noCache(response){const h=new Headers(response.headers);h.delete('content-length');h.delete('etag');h.set('cache-control','no-store');h.set('x-gps-address-screen','1');return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});}

export default {...previous,async fetch(request,env,ctx){
 const url=new URL(request.url),path=url.pathname,gps=['/gps','/gps/','/gps.html'].includes(path);
 if(path==='/gps-address-search'){
  if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
  const q=(url.searchParams.get('q')||'').trim().slice(0,300);if(q.length<3)return Response.json({results:[]});
  const endpoint=new URL('https://couteau-suisse-gps.appli-suzon.workers.dev/gps/api/search');endpoint.searchParams.set('q',q);
  try{const r=await fetch(endpoint,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});if(!r.ok)throw Error('search');const h=new Headers({'content-type':'application/json','cache-control':'no-store'});return new Response(r.body,{headers:h});}
  catch{return Response.json({results:[],error:'Recherche indisponible. Réessayez.'},{status:503,headers:{'cache-control':'no-store'}});}
 }
 if(gps&&!url.searchParams.get('destination'))return new Response(null,{status:302,headers:{location:'/gps-adresse','cache-control':'no-store'}});
 if(['/gps-adresse','/gps-adresse/'].includes(path)){
  const base=new URL(request.url);base.pathname='/gps';base.search='';
  const r=await previous.fetch(new Request(base,request),env,ctx);
  if(!r.ok||!(r.headers.get('content-type')||'').includes('text/html'))return r;
  return noCache(new HTMLRewriter().on('iframe[title="GPS Couteau Suisse"],#homeReturn',{element(e){e.remove();}})
   .on('head',{element(e){e.append('<style>'+addressCss+'</style>',{html:true});}})
   .on('body',{element(e){e.append(addressBody+'<script>'+addressClient+'</script>',{html:true});}}).transform(r));
 }
 const r=await previous.fetch(request,env,ctx);
 if(!r.ok||!(r.headers.get('content-type')||'').includes('text/html'))return r;
 if(gps){
  const destination=(url.searchParams.get('destination')||'').slice(0,300),name=(url.searchParams.get('name')||destination).slice(0,300);
  return noCache(new HTMLRewriter().on('#homeReturn',{element(e){e.setAttribute('href','/gps-adresse');e.setAttribute('aria-label','Retour pour changer l’adresse');e.setAttribute('title','Changer l’adresse');e.setInnerContent('←<br>Adresse',{html:true});}})
   .on('iframe[title="GPS Couteau Suisse"]',{element(e){const src=e.getAttribute('src');if(!src)return;const target=new URL(src,request.url);if(target.origin!=='https://couteau-suisse-gps.appli-suzon.workers.dev')return;const hash=new URLSearchParams(target.hash.slice(1));hash.set('destination',destination);hash.set('name',name);target.hash=hash.toString();e.setAttribute('src',target.href);}}).transform(r));
 }
 if(['/','/index','/index.html'].includes(path))return noCache(new HTMLRewriter().on('#homeGpsBtn',{element(e){e.setAttribute('href','/gps-adresse');e.setAttribute('aria-label','GPS — choisir une adresse');e.setAttribute('data-voice-help','Choisir une adresse avec le grand clavier puis confirmer pour ouvrir le GPS.');}}).transform(r));
 return r;
}};
