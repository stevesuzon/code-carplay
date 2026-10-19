import previous from './nearby-pages-v3.mjs';

export const addressCss=`
#gpsAddressPage{position:fixed;inset:0;z-index:2000;overflow:auto;background:#071321;color:#fff;font-family:Arial,sans-serif;padding:calc(12px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));box-sizing:border-box}
#gpsAddressPage *{box-sizing:border-box}
.ga-shell{max-width:1050px;margin:auto}.ga-top{display:flex;align-items:center;gap:16px;margin-bottom:12px}.ga-top a{display:flex;align-items:center;min-height:48px;padding:10px 14px;border:2px solid #ffa923;border-radius:14px;color:#fff;text-decoration:none;font-size:17px;font-weight:800}.ga-top h1{margin:0;font-size:clamp(23px,5vw,32px);line-height:1.1}
.ga-layout{display:grid;gap:14px}.ga-label{display:block;font-size:19px;font-weight:800;margin-bottom:7px}
#gaInput{display:block;width:100%;height:90px;padding:12px;border:3px solid #62d8ff;border-radius:16px;background:#f8fbff;color:#071321;font:800 30px/1.15 Arial;resize:none;outline:none;overflow:auto}
#gaInput:focus{border-color:#ffbd55;box-shadow:0 0 0 3px #ffbd5533}
#gaStatus{font-size:16px;line-height:1.3;min-height:23px;margin:9px 0;color:#c8e8ff}
#gaResults{display:grid;gap:7px;max-height:22dvh;overflow:auto;overscroll-behavior:contain}
#gaResults button{display:block;width:100%;padding:12px;text-align:left;border:2px solid #436582;border-radius:13px;background:#152b43;color:#fff;font:800 19px/1.2 Arial;min-height:54px;white-space:normal}
#gaResults button[aria-pressed="true"]{border-color:#61e3a7;background:#114332}
#gaConfirm{width:100%;min-height:60px;margin-top:10px;padding:12px;border:0;border-radius:16px;background:#16ae70;color:#fff;font:900 24px Arial}
#gaConfirm:disabled{background:#34485c;color:#b8c4cf}
.ga-keyboard{display:grid;gap:6px;align-content:start}.ga-row{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}.ga-row button{min-width:0;min-height:60px;padding:0;border:1px solid #577b9e;border-radius:9px;background:#253e59;color:white;font:800 clamp(24px,6.5vw,32px) Arial;touch-action:manipulation;box-shadow:0 3px 0 #020812}
.ga-row button:active{background:#008dd1}.ga-actions{display:grid;grid-template-columns:1fr 2fr 1fr;gap:5px}.ga-actions button{min-width:0;min-height:52px;border:1px solid #577b9e;border-radius:10px;background:#1d3650;color:#fff;font:800 16px Arial;touch-action:manipulation}
#gaMic[aria-pressed="true"]{background:#b82c3a;border-color:#fff}#gaMic svg{vertical-align:middle}
#gaNative{justify-self:center;border:0;background:transparent;color:#8edfff;font:700 15px Arial;text-decoration:underline;padding:9px}
@media(orientation:landscape) and (min-width:640px){.ga-layout{grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:18px}.ga-top{margin-bottom:8px}.ga-top a{min-height:40px;padding:6px 12px}.ga-top h1{font-size:25px}#gaInput{height:84px;font-size:30px}#gaResults{max-height:23dvh}.ga-row button{min-height:48px;font-size:29px}.ga-actions button{min-height:42px}#gaConfirm{min-height:52px;margin-top:7px}.ga-keyboard{gap:5px}#gaNative{padding:5px}}
#gpsAddressPage{height:100dvh;overflow:hidden;padding-top:8px;padding-bottom:max(8px,env(safe-area-inset-bottom,0px))}.ga-shell{height:100%;display:flex;flex-direction:column}.ga-top{flex:0 0 auto;margin-bottom:8px;gap:10px}.ga-top h1{font-size:24px}.ga-top a{font-size:16px;min-height:42px}.ga-layout{display:flex;flex-direction:column;flex:1;min-height:0;gap:10px}.ga-layout>section:first-child{display:flex;flex-direction:column;flex:1;min-height:0}.ga-label{font-size:18px;margin-bottom:5px}#gaInput{height:76px;min-height:76px;font-size:28px}#gaStatus{flex:0 0 20px;min-height:20px;font-size:14px;margin:4px 0;overflow:auto}#gaResults{flex:1;min-height:0;max-height:none;overflow-y:auto;align-content:start}#gaResults button{font-size:18px;min-height:48px;padding:8px}#gaConfirm{flex:0 0 52px;min-height:52px;margin-top:7px}.ga-keyboard{flex:0 0 auto;gap:5px}.ga-row button{min-height:48px}.ga-actions button{min-height:50px}#gaNative{padding:4px}
@media(orientation:landscape) and (min-width:640px){.ga-layout{display:grid;grid-template-columns:1fr 1.25fr;min-height:0}.ga-keyboard{align-self:end}.ga-row button{min-height:40px}.ga-actions button{min-height:42px}.ga-top h1{font-size:22px}#gaInput{height:64px;min-height:64px}#gaConfirm{min-height:44px;flex-basis:44px}}
@media(max-height:680px) and (orientation:portrait){.ga-top h1{font-size:21px}.ga-row button{min-height:40px;font-size:26px}.ga-actions button{min-height:44px}#gaInput{height:62px;min-height:62px}.ga-label{font-size:16px}}

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
<div class="ga-row" data-keys="1234567890"></div><div class="ga-row" data-keys="AZERTYUIOP"></div><div class="ga-row" data-keys="QSDFGHJKLM"></div><div class="ga-row" data-keys="WXCVBN" style="grid-template-columns:repeat(6,minmax(0,1fr))"></div>
<div class="ga-actions"><button id="gaMic" type="button" aria-label="Dicter l’adresse" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/></svg></button><button type="button" data-edit="space">ESPACE</button><button type="button" data-edit="back" aria-label="Effacer le dernier caractère" style="font-size:34px">⌫</button></div>
<button id="gaNative" type="button">Clavier du téléphone</button>
</section></div></div></div>`;

export const addressClient=`(()=>{
 const input=document.getElementById('gaInput'),results=document.getElementById('gaResults'),status=document.getElementById('gaStatus'),confirm=document.getElementById('gaConfirm'),keyboard=document.getElementById('gaKeyboard');
 let chosen=null,timer=0,controller=null,sequence=0;
 const valid=p=>p&&typeof p.name==='string'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=41&&p.lat<=51.6&&p.lon>=-5.6&&p.lon<=10;
 function save(){try{sessionStorage.setItem('gps-address-v1',JSON.stringify({text:input.value,chosen}))}catch(_){}}
 function select(p,button){chosen=p;input.value=p.name;confirm.disabled=false;status.textContent='';results.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));save();}
 async function search(){
  const q=input.value.trim();if(q.length<3)return;
  const id=++sequence;controller?.abort();controller=new AbortController();const active=controller,timeout=setTimeout(()=>active.abort(),12000);
  status.textContent='Recherche de l’adresse…';
  try{
   const response=await fetch('/gps-address-search?q='+encodeURIComponent(q),{signal:active.signal,cache:'no-store'});const data=await response.json();
   if(id!==sequence)return;if(!response.ok)throw Error(data.error||'Recherche indisponible.');
   const places=(data.results||[]).filter(valid).slice(0,7);results.replaceChildren();
   places.forEach(p=>{const b=document.createElement('button');b.type='button';b.textContent=p.name;b.setAttribute('aria-pressed','false');b.onclick=()=>select(p,b);results.appendChild(b)});
   status.textContent=places.length?'':'Adresse introuvable. Ajoutez le numéro et la ville.';
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
 const mic=document.getElementById('gaMic');let recognition=null,dictating=false,voiceBase='';
 function nativeKeyboard(){input.readOnly=false;input.inputMode='text';input.focus();input.setSelectionRange(input.value.length,input.value.length);status.textContent='Touchez le micro du clavier du téléphone pour dicter votre adresse.';}
 mic.onclick=()=>{
  if(dictating){recognition?.stop();return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){nativeKeyboard();return;}
  clearTimeout(timer);controller?.abort();sequence++;voiceBase=input.value.trim();
  recognition=new Recognition();recognition.lang='fr-FR';recognition.interimResults=true;recognition.continuous=false;
  recognition.onstart=()=>{dictating=true;mic.setAttribute('aria-pressed','true');status.textContent='Je vous écoute… Dites le numéro, la rue et la ville.';};
  recognition.onresult=event=>{let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0].transcript+' ';input.value=(voiceBase?voiceBase+' ':'')+text.trim();input.setSelectionRange(input.value.length,input.value.length);changed();clearTimeout(timer);status.textContent='Je vous écoute…';};
  recognition.onerror=event=>{status.textContent=event.error==='not-allowed'?'Autorisez le microphone pour dicter, ou utilisez le clavier du téléphone.':'Dictée indisponible. Réessayez ou utilisez le clavier du téléphone.';};
  recognition.onend=()=>{dictating=false;mic.setAttribute('aria-pressed','false');if(input.value.trim().length>=3){clearTimeout(timer);timer=setTimeout(search,100);}};
  try{recognition.start()}catch(_){dictating=false;mic.setAttribute('aria-pressed','false');nativeKeyboard();}
 };
 window.addEventListener('pagehide',()=>recognition?.abort());
 confirm.onclick=()=>{if(!valid(chosen))return;save();const params=new URLSearchParams({destination:chosen.lat+','+chosen.lon,name:chosen.name,from:'address'});location.assign('/gps?'+params);};
 try{const saved=JSON.parse(sessionStorage.getItem('gps-address-v1')||'null');if(saved){input.value=String(saved.text||'').slice(0,300);input.setSelectionRange(input.value.length,input.value.length);if(valid(saved.chosen)&&saved.chosen.name===input.value){chosen=saved.chosen;confirm.disabled=false;status.textContent='Modifiez l’adresse ou confirmez pour repartir.';}else if(input.value.trim().length>=3)timer=setTimeout(search,100);}}catch(_){}
})();`;

function noCache(response){const h=new Headers(response.headers);h.delete('content-length');h.delete('etag');h.set('cache-control','no-store');h.set('x-gps-address-screen','6');return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});}

export default {...previous,async fetch(request,env,ctx){
 const url=new URL(request.url),path=url.pathname,gps=['/gps','/gps/','/gps.html'].includes(path);
 if(path==='/gps-address-search'){
  if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
  const q=(url.searchParams.get('q')||'').trim().slice(0,300);if(q.length<3)return Response.json({results:[]});
  const cityEndpoint=new URL('https://geo.api.gouv.fr/communes');cityEndpoint.search=new URLSearchParams({nom:q,fields:'nom,codesPostaux,centre',boost:'population',limit:'4'}).toString();
  const citySearch=!/\d/.test(q)?fetch(cityEndpoint,{signal:AbortSignal.timeout(4000)}).then(r=>r.ok?r.json():[]).catch(()=>[]):Promise.resolve([]);
  const endpoint=new URL('https://data.geopf.fr/geocodage/search');endpoint.searchParams.set('q',q);endpoint.searchParams.set('limit','10');
  try{
   const r=await fetch(endpoint,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});if(!r.ok)throw Error('search');const data=await r.json();
   const results=(data.features||[]).map(f=>{const p=f.properties||{},c=f.geometry?.coordinates||[];let name=p.label||p.name||'';if(p.type==='municipality'&&p.postcode&&!name.includes(p.postcode))name+=' '+p.postcode;return {name,lat:c[1],lon:c[0],precision:p.type};}).filter(p=>p.name&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=41&&p.lat<=51.6&&p.lon>=-5.6&&p.lon<=10);
   const cities=(await citySearch).map(c=>({name:c.nom+' '+(c.codesPostaux?.[0]||''),lat:c.centre?.coordinates?.[1],lon:c.centre?.coordinates?.[0],precision:'municipality'})).filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lon)&&c.lat>=41&&c.lat<=51.6&&c.lon>=-5.6&&c.lon<=10);
   const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
   const exact=c=>norm(c.name.replace(/\s+\d{5}$/,''))===norm(q);const merged=[...cities.filter(exact),...results.filter(c=>c.precision==='municipality'&&exact(c)),...cities.filter(c=>!exact(c)).slice(0,3),...results];const seen=new Set();
   return Response.json({results:merged.filter(c=>{const key=c.lat.toFixed(4)+','+c.lon.toFixed(4);if(seen.has(key))return false;seen.add(key);return true}).slice(0,10)},{headers:{'cache-control':'no-store'}});
  }catch{return Response.json({results:[],error:'Recherche indisponible. Réessayez.'},{status:503,headers:{'cache-control':'no-store'}});}

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
