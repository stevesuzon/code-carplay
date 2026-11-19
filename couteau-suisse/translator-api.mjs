export const TRANSLATION_MODEL='@cf/meta/m2m100-1.2b';
export const SPEECH_MODEL='@cf/openai/whisper-large-v3-turbo';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store',vary:'Cookie','x-content-type-options':'nosniff'}});
export async function translatorAccess(request,env){
 const headers=new Headers();for(const key of ['cookie','user-agent'])if(request.headers.has(key))headers.set(key,request.headers.get(key));
 const r=await env.APPLICATION.fetch(new Request(new URL('/api/document-plan',request.url),{headers,redirect:'manual'}));
 const plan=r.ok?await r.json().catch(()=>null):null;
 return {allowed:plan?.authenticated===true&&plan?.premium===true,expiresAt:plan?.expiresAt||null,status:r.status};
}
export async function translatorAPI(request,env){
 if(request.method!=='POST')return reply({error:'Méthode invalide.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Origine invalide.'},403);
 const lang=new URL(request.url).searchParams.get('lang');
 if(!['fr','nl'].includes(lang))return reply({error:'Choisissez français ou flamand.'},400);
 const access=await translatorAccess(request,env);
 if(!access.allowed)return reply({error:'Revenez à l’accueil pour vérifier votre abonnement.'},access.status===503?503:403);
 const mime=request.headers.get('content-type')?.split(';')[0];
 const typed=mime==='text/plain';
 if(!typed&&!['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/x-wav','video/mp4'].includes(mime))return reply({error:'Format audio non pris en charge.'},415);
 const max=typed?6000:1200000,reader=request.body?.getReader();
 if(!reader)return reply({error:'Je n’ai rien entendu. Maintenez le bouton pour parler.'},400);
 if(Number(request.headers.get('content-length'))>max)return reply({error:'La phrase est trop longue. Recommencez avec une phrase plus courte.'},413);
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return reply({error:'La phrase est trop longue.'},413)}chunks.push(value)}}catch{return reply({error:'Enregistrement incomplet. Réessayez.'},400)}
 if(!typed&&size<100)return reply({error:'Je n’ai rien entendu. Maintenez le bouton pour parler.'},422);
 if(env.PHOTO_LIMIT&&!((await env.PHOTO_LIMIT.limit({key:'translator:'+lang+':'+(request.headers.get('cf-connecting-ip')||'unknown')})).success))return reply({error:'Patientez quelques instants avant de recommencer.'},429);
 if(!env.AI)return reply({error:'Traduction momentanément indisponible.'},503);
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 let binary='';for(let i=0;i<size;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 try{
  const heard=typed?{text:new TextDecoder().decode(bytes)}:await env.AI.run(SPEECH_MODEL,{audio:btoa(binary),task:'transcribe',language:lang,vad_filter:true,condition_on_previous_text:false});
  const text=typeof heard?.text==='string'?heard.text.trim():'';
  if(!text)return reply({error:lang==='nl'?'Niets gehoord. Houd de knop ingedrukt en spreek opnieuw.':'Je n’ai rien entendu. Maintenez le bouton et recommencez.'},422);
  if(text.length>1500)return reply({error:'Faites une phrase plus courte, s’il vous plaît.'},422);
  const target=lang==='fr'?'nl':'fr';
  const translated=await env.AI.run(TRANSLATION_MODEL,{text,source_lang:lang,target_lang:target});
  if(typeof translated?.translated_text!=='string'||!translated.translated_text.trim())throw Error('NO_TRANSLATION');
  return reply({source:lang,target,text,translation:translated.translated_text.trim()});
 }catch{return reply({error:'Traduction indisponible. Réessayez ou utilisez les langues téléchargées.'},503)}
}

