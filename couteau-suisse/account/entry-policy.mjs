import {recordVisit} from './daily-visits.mjs';
import {readCookie} from './entry-ticket.mjs';
export {readCookie};
import {isRadioDevice,radioIdentity,manageRadio} from './radio-account.mjs';
import {radioAsset} from './autoradio-assets.mjs';
import {returnByMail,cleanMail} from './account-email-return.mjs';
import {returningAccountScript} from './returning-account.mjs';
// Midnight in France on the date the owner ended free sign-ups.
export const cutoff=Date.parse('2026-11-11T00:00:00+01:00');
const day=86400000, cookieName='__Host-cs-entry', base='https://couteau-suisse.appli-suzon.workers.dev';
const utf=new TextEncoder();
const sqlActive="s.active=1 AND (s.lifetime=1 OR julianday(s.expires_at)>julianday('now'))";
// Use the same subscription/trial distinction as the paid features, including subscriptions activated by code.
export async function trialHash(device){return hex(await crypto.subtle.digest('SHA-256',utf.encode('contest-trial:'+device)))}
const referralEligible="s.code_hash NOT LIKE 'invite-week-%' AND s.code_hash NOT LIKE 'market-bonus-%' AND (s.lifetime=1 OR s.code_hash<>? OR EXISTS(SELECT 1 FROM contest_awards a WHERE a.subscription_id=s.id))";
export const rewardSubscriptionSql=`SELECT s.id FROM subscriptions s WHERE lower(s.recovery_email_mask)=? AND (s.phone_device=? OR s.autoradio_device=?) AND ${sqlActive} AND ${referralEligible} ORDER BY s.lifetime DESC,julianday(s.expires_at) DESC,s.id DESC LIMIT 1`;
const privacy={'cache-control':'private, no-store',vary:'Cookie'};
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{...privacy,...headers}});
function verificationOutage(req,error){
 const quota=/daily row (?:read|write) limit/i.test(String(error?.message||error)+' '+String(error?.cause||''));
 const seconds=quota?Math.ceil((86400000-Date.now()%86400000)/1000):60;
 const message=quota?'La limite de lectures du jour est atteinte. La vérification des comptes reprendra après la remise à zéro du serveur.':'La vérification de votre compte est momentanément indisponible.';
 const path=new URL(req.url).pathname;
 const headers={'retry-after':String(seconds)};
 if(!['GET','HEAD'].includes(req.method)||path.startsWith('/api/')||path.startsWith('/gps/api/')||/\.(?:json|js)$/i.test(path))return json({error:'VERIFICATION_INDISPONIBLE',message},503,headers);
 const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Couteau Suisse</title><style>body{max-width:30rem;margin:15vh auto;padding:20px;background:#111;color:white;font:20px/1.5 system-ui}button{width:100%;min-height:56px;border:0;border-radius:12px;background:#8fe1c3;color:#112820;font:bold 22px system-ui}</style><main><h1>Couteau Suisse</h1><p>'+message+'</p><button type="button" onclick="location.reload()">Réessayer</button></main></html>';
 return new Response(req.method==='HEAD'?null:html,{status:503,headers:{...privacy,...headers,'content-type':'text/html;charset=utf-8'}});
}
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(24)));
async function key(env){
 if(!env.PAYMENT_RECOVERY_SECRET)throw Error('Missing entry signing secret');
 return crypto.subtle.importKey('raw',utf.encode('cs-entry-v1:'+env.PAYMENT_RECOVERY_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
function to64(data){return btoa(String.fromCharCode(...data)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function from64(data){return Uint8Array.from(atob(data.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))}
async function setCookie(env,data){
 const encoded=to64(utf.encode(JSON.stringify(data)));
 const sig=to64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(env),utf.encode(encoded))));
 return cookieName+'='+encoded+'.'+sig+'; Secure; Path=/; HttpOnly; SameSite=Lax; Max-Age='+Math.max(0,Math.ceil((data.until-Date.now())/1000));
}
const clearCookie=cookieName+'=; Secure; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
async function identity(db,email,device){
 if(isRadioDevice(device))return radioIdentity(db,email,device);
 return db.prepare('SELECT email,first_name,last_name,created_at FROM app_identities WHERE email=? COLLATE NOCASE AND email_verified_at>0 AND email_verified_device_id=? LIMIT 1').bind(email,device).first();
}
// Called even when the legacy email confirmation handler invokes trial creation internally.
export async function registrationTrialPolicy(request,env){
 const data=await request.json().catch(()=>({})),email=String(data.email||'').toLowerCase().trim(), device=String(data.deviceId||'');
 if(isRadioDevice(device))return json({ok:true,trial:false});
 const account=await identity(env.DB,email,device);
 if(!account)return null;
 const legacy=Number(account.created_at)<cutoff;
 // A confirmed returning customer can move an existing purchase or gift to this device.
 const row=await env.DB.prepare('SELECT s.id,s.code_hash,s.phone_device,s.autoradio_device,s.lifetime,s.expires_at,s.account_first_name,s.account_last_name FROM subscriptions s WHERE '+sqlActive+' AND lower(s.recovery_email_mask)=? ORDER BY s.lifetime DESC,s.expires_at DESC LIMIT 1').bind(email).first();
 if(legacy&&(!row||row.phone_device===device||row.autoradio_device===device||!await env.DB.prepare('SELECT 1 FROM app_identity_email_links WHERE email=? COLLATE NOCASE AND device_id=? AND confirmed_at>0 LIMIT 1').bind(email,device).first()))return null;
 if(legacy&&await automaticTrial(env.DB,row,device))return null;
 if(!row||await automaticTrial(env.DB,row,device))return json({ok:true,trial:false,subscriptionRequired:true});
 const norm=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(row.phone_device!==device&&row.autoradio_device!==device){
  const namesMatch=norm(row.account_first_name)&&norm(row.account_last_name)&&norm(row.account_first_name)===norm(account.first_name)&&norm(row.account_last_name)===norm(account.last_name);
  if(!namesMatch&&!await env.DB.prepare('SELECT 1 FROM app_identity_email_links WHERE email=? COLLATE NOCASE AND device_id=? AND confirmed_at>0 LIMIT 1').bind(email,device).first())return json({ok:true,trial:false,subscriptionRequired:true});
  await env.DB.prepare('UPDATE subscriptions SET phone_device=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND lower(recovery_email_mask)=?').bind(device,row.id,email).run();
 }
 return json({ok:true,existingAccount:true,email,firstName:account.first_name,lastName:account.last_name,lifetime:!!row.lifetime,expiresAt:row.expires_at});
}
async function automaticTrial(db,row,device){
 if(row.lifetime||row.code_hash!==await trialHash(row.phone_device||row.autoradio_device||device))return false;
 return !await db.prepare('SELECT 1 FROM contest_awards WHERE subscription_id=?').bind(row.id).first();
}
async function subscription(db,email,device){
 const row=await db.prepare("SELECT s.id,s.lifetime,s.expires_at,s.code_hash,s.phone_device,s.autoradio_device FROM subscriptions s WHERE "+sqlActive+" AND lower(s.recovery_email_mask)=? AND (s.phone_device=? OR s.autoradio_device=?) ORDER BY s.lifetime DESC,s.expires_at DESC LIMIT 1").bind(email,device,device).first();
 if(!row)return null;
 row.trial=await automaticTrial(db,row,device);
 row.shareEligible=!row.trial&&!row.code_hash.startsWith('invite-week-')&&!row.code_hash.startsWith('market-bonus-');
 return row;
}
export async function invitation(db,row,email,device){
 if(!row?.shareEligible)return null;
 if(await db.prepare('SELECT 1 FROM cs_week_awards WHERE subscription_id=? OR sender_email=? OR recipient_email=? OR sender_device=? OR recipient_device=? LIMIT 1').bind(row.id,email,email,device,device).first())return null;
 const current=await db.prepare('SELECT token,email,device FROM cs_week_invites WHERE subscription_id=?').bind(row.id).first();
 if(current?.email===email&&current.device===device)return current.token;
 await db.prepare('INSERT INTO cs_week_invites(subscription_id,token,email,device,issued_at) VALUES(?,?,?,?,?) ON CONFLICT(subscription_id) DO UPDATE SET email=excluded.email,device=excluded.device').bind(row.id,random(),email,device,Date.now()).run();
 return (await db.prepare('SELECT token FROM cs_week_invites WHERE subscription_id=?').bind(row.id).first())?.token;
}
export async function redeemWeek(db,token,account,device){
 if(!/^[a-f0-9]{48}$/.test(token)||Number(account.created_at)<cutoff)return false;
 const sender=await db.prepare('SELECT s.phone_device,s.autoradio_device FROM cs_week_invites i JOIN subscriptions s ON s.id=i.subscription_id WHERE i.token=?').bind(token).first();
 if(!sender)return false;
 const hash=await trialHash(sender.phone_device||sender.autoradio_device||'');
 const grant=random(),now=Date.now(),expiry=new Date(now+7*day).toISOString();
 // The unique inviter and recipient constraints and transaction-only grant nonce make retries and simultaneous redemptions idempotent.
 const claim=db.prepare(`INSERT INTO cs_week_awards(grant_id,subscription_id,sender_email,sender_device,recipient_email,recipient_device,granted_at,sender_days)
 SELECT ?,i.subscription_id,i.email,i.device,?,?,?,15 FROM cs_week_invites i JOIN subscriptions s ON s.id=i.subscription_id
 WHERE EXISTS(SELECT 1 FROM app_identities a WHERE lower(a.email)=i.email AND a.email_verified_at>0 AND a.email_verified_device_id=i.device) AND i.token=? AND i.email<>? AND i.device<>? AND i.issued_at<=? AND ${sqlActive} AND ${referralEligible}
 AND (s.phone_device=i.device OR s.autoradio_device=i.device) AND lower(s.recovery_email_mask)=i.email
 AND NOT EXISTS(SELECT 1 FROM market_user_sanctions b WHERE b.app_banned=1 AND (b.last_device_id=i.device OR lower(b.email)=i.email))
 AND NOT EXISTS(SELECT 1 FROM subscriptions s WHERE ${sqlActive} AND (lower(s.recovery_email_mask)=? OR s.phone_device=? OR s.autoradio_device=?))
 AND NOT EXISTS(SELECT 1 FROM cs_week_awards w WHERE w.recipient_email=i.email OR w.recipient_device=i.device OR w.sender_email=? OR w.sender_device=?)
 ON CONFLICT DO NOTHING`).bind(grant,account.email,device,now,token,account.email,device,Number(account.created_at),hash,account.email,device,device,account.email,device);
 const credit=db.prepare(`INSERT INTO cs_bonus_wallet(source_id,owner,days,earned_at)
  SELECT 'parrain:'||w.grant_id,lower(a.email)||'|'||a.created_at,w.sender_days,w.granted_at
  FROM cs_week_awards w JOIN app_identities a ON lower(a.email)=w.sender_email
  WHERE w.grant_id=? AND a.email_verified_at>0 AND a.email_verified_device_id=w.sender_device`).bind(grant);
 const gift=db.prepare('INSERT INTO subscriptions(code_hash,expires_at,active,lifetime,phone_device,recovery_email_mask,account_first_name,account_last_name,duration_days,redeemed_at) SELECT ?,?,1,0,?,?,?,?,7,? WHERE EXISTS(SELECT 1 FROM cs_week_awards WHERE grant_id=?)').bind('invite-week-'+grant,expiry,device,account.email,account.first_name,account.last_name,now,grant);
 const results=await db.batch([claim,credit,gift]);return results[0]?.meta?.changes===1;
}
async function session(req,env,ctx){
 if(req.method!=='POST')return json({error:'METHODE_INVALIDE'},405);
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'ORIGINE_INVALIDE'},403);
 const d=await req.json().catch(()=>({})),email=cleanMail(d.email),device=String(d.deviceId||'').trim();
 const no={allowed:false,verified:false};
 if(!email||!device||device.length>140||email.length>254)return json(no,200,{'set-cookie':clearCookie});
 const account=await identity(env.DB,email,device);if(!account)return json(no,200,{'set-cookie':clearCookie});
 const banned=await env.DB.prepare('SELECT 1 FROM market_user_sanctions WHERE (last_device_id=? OR lower(email)=?) AND app_banned=1 LIMIT 1').bind(device,email).first();
 if(banned)return json({...no,banned:true},200,{'set-cookie':clearCookie});
 let sub=await subscription(env.DB,email,device),gift=false;
 if(Number(account.created_at)>=cutoff&&sub?.trial)sub=null;
 if(!sub&&Number(account.created_at)>=cutoff){
  const pending=await env.DB.prepare('SELECT token FROM cs_week_pending WHERE email=? AND device=?').bind(email,device).first();
  if(pending){gift=await redeemWeek(env.DB,pending.token,account,device);sub=await subscription(env.DB,email,device);if(sub?.trial)sub=null;}
 }
 const legacy=Number(account.created_at)<cutoff;
 // A verified phone account may enter to consult existing documents without a subscription.
 if(!sub&&!legacy&&isRadioDevice(device))return json({verified:true,allowed:false},200,{'set-cookie':clearCookie});
 const until=Date.now()+6*3600000;
 const previous=await readCookie(req,env);
 const share=isRadioDevice(device)?null:d.prepareShare?await invitation(env.DB,sub,email,device):sub?.shareEligible&&previous?.device===device?previous.invite:null;
 if(!previous||previous.device!==device||previous.email!==email||d.opened===true){
  const visit=recordVisit(env.DB,account.email.toLowerCase()+'|'+account.created_at);
  if(ctx)ctx.waitUntil(visit);else await visit;
 }
 const seen=Math.floor(Date.now()/1000);
 const activity=env.DB.prepare(`UPDATE app_identities SET last_connected_at_s=?
   WHERE email=? COLLATE NOCASE AND email_verified_device_id=?
     AND (last_connected_at_s IS NULL OR last_connected_at_s<?)`).bind(seen,email,device,seen).run().catch(()=>{});
 if(ctx)ctx.waitUntil(activity);else await activity;
 return json({verified:true,allowed:true,gift,invite:share||null},200,{'set-cookie':await setCookie(env,{email,device,until,invite:share||null,checked:Date.now(),id:sub?.id||0,legacy})});
}
function entryClient(){
 const host=document.getElementById('csEntry');window.csFriendInvite=document.querySelector('meta[name=cs-friend-invite]')?.content||null;let busy=false,retryAt=0;
 const query=new URLSearchParams(location.search),invite=query.get('invitation');
 if(invite&&/^[a-f0-9]{48}$/.test(invite))try{localStorage.setItem('cs_week_invitation',invite)}catch{}
 function saved(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return {}}}
 let firstOpen=true;
 async function sync(){
  if(busy||Date.now()<retryAt||new URLSearchParams(location.search).has('email_confirmed'))return;busy=true;
  try{
   if(window.CouteauUserDataReady)await window.CouteauUserDataReady.catch(()=>{});
   const i=saved('carplay_app_identity_v240'),s=saved('carplay_shared_subscription'),p=saved('carplay_account_profile');
   const email=i.email||s.email||p.email||'',deviceId=localStorage.getItem('carplay_device_id')||'';
   if(!email||!deviceId){if(host&&host.dataset.known==='1')location.reload();return}
   const response=await fetch('/api/cs-entry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,deviceId,opened:firstOpen,invite:localStorage.getItem('cs_week_invitation')||'',prepareShare:!!host||!!document.querySelector('#csShareWithFriend')}),cache:'no-store'});
   if(response.ok)firstOpen=false;
   if(!response.ok){
    retryAt=Date.now()+1000*(Number(response.headers.get('retry-after'))||60);
    if(host){const status=document.getElementById('csEntryLoading');status.hidden=false;status.textContent=(await response.json().catch(()=>null))?.message||'Vérification momentanément indisponible.';const retry=document.getElementById('csEntryRetry');if(retry)retry.hidden=false;}
    return;
   }
   const state=await response.json();if(host||document.querySelector('#csShareWithFriend'))window.csFriendInvite=state.invite||null;
   if(state.gift){sessionStorage.setItem('cs_week_received','1');localStorage.removeItem('cs_week_invitation')}
   if(host){
    if(state.allowed){const u=new URL(location.href);u.searchParams.delete('invitation');location.replace(u.href);return}
    if(state.banned){document.getElementById('csEntryLoading').textContent='Ce compte est banni.';return}
    if(state.verified){host.dataset.known='1';document.getElementById('csEntryNotice').hidden=false;document.getElementById('csEntryLoading').hidden=true;}
   }else if(!state.allowed){location.reload()}else if(sessionStorage.getItem('cs_week_received')==='1'){sessionStorage.removeItem('cs_week_received');alert('Bienvenue ! Votre semaine offerte est activée pour 7 jours.')}
  }catch{if(host){document.getElementById('csEntryLoading').textContent='Connexion indisponible. Rouvrez l’application avec Internet.';}}finally{busy=false}
 }
 document.getElementById('csEntryRetry')?.addEventListener('click',()=>{retryAt=0;void sync()});
 sync();window.addEventListener('pageshow',sync);window.addEventListener('focus',sync);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});setInterval(()=>{if(!document.hidden)sync()},host?7000:300000);
}
const text='Pour éviter la création de plusieurs comptes gratuits, un abonnement est désormais nécessaire pour déverrouiller Couteau Suisse. Merci de votre compréhension.';
function shell(head){
 const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#19292d"><link rel="manifest" href="/manifest.webmanifest"><title>Mon compte · Couteau Suisse</title><style>body{margin:0;background:#19292d;color:#f8edda;font:18px/1.5 system-ui}main{max-width:28rem;margin:12vh auto;padding:20px}h1{font-size:1.7rem}[hidden]{display:none!important}a,button{display:block;box-sizing:border-box;text-align:center;width:100%;padding:14px;margin:12px 0;border-radius:12px;border:1px solid #b99b6e;background:#f4d398;color:#19292d;text-decoration:none;font:700 18px system-ui}button{background:#263c40;color:#f8edda}</style></head><body><main id="csEntry"><p id="csEntryLoading">Vérification de votre accès…</p><button id="csEntryRetry" type="button" hidden>Réessayer</button><section id="csEntryNotice" role="alert" hidden><h1>Abonnement requis</h1><p>'+text+'</p><a href="/payment.html">Prendre un abonnement</a><button id="csSendApp" type="button">Partager l’appli à un ami</button><button id="csExistingCode" type="button">J’ai déjà un code</button></section></main><script src="/persistent-user-data-v283.js"></script><script src="/app-access-gate-v506.js?v=compte-email-3" defer></script><script src="/cs-entry.js?v=compte-email-3" defer></script></body></html>';
 return new Response(head?null:html,{headers:{...privacy,'content-type':'text/html;charset=utf-8','x-cs-entry':'registration'}});
}
async function guestActions(){
 const share=document.getElementById('csSendApp');if(!share)return;
 share.onclick=async()=>{const u='https://couteau-suisse.appli-suzon.workers.dev/';try{if(navigator.share){await navigator.share({title:'Couteau Suisse',url:u});return}}catch(e){if(e.name==='AbortError')return}try{await navigator.clipboard.writeText(u);alert('Lien copié.')}catch{prompt('Lien à envoyer',u)}};
 document.getElementById('csExistingCode').onclick=async()=>{const code=prompt('Votre code d’abonnement');if(!code)return;
 try{const i=JSON.parse(localStorage.getItem('carplay_app_identity_v240')||'{}');const r=await fetch('/api/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...i,code,deviceType:'phone',deviceId:localStorage.getItem('carplay_device_id')})});const j=await r.json();if(!r.ok||!j.ok)throw Error();localStorage.setItem('carplay_shared_subscription',JSON.stringify({...i,...j,code}));location.reload()}catch{alert('Activation impossible. Vérifiez le code puis réessayez.')}};
}
const openApi=/^\/api\/(?:app-identity(?:\/|$)|payment[-/]|stripe[-/]|status$|market-counts$|activate$|recover-code$|recovery[-/]|subscription[-/]|freemium\/session$|admin(?:\/|$)|account-inbox(?:\/|$)|contest\/trial-identity$|sanction\/status$|installations$|health$|notifications\/start$|mushroom(?:[-/]|$)|champignons(?:[-/]|$))/;
const openPage=/^\/(?:payment|installer|admin|connexion|confidentialite|privacy|mentions-legales|conditions|cgv)(?:\.html)?\/?$/i;
export function protectedPath(path,request){
 if(path.startsWith('/api/'))return !openApi.test(path);
 if(/^\/(?:market-chunks|nearby-shards|gps\/api)\//.test(path)||/^\/(?:market-count-catalog|traveller-markets-data|marches-noel|market-duplicate-catalog)/.test(path))return true;
 const doc=path==='/'||!path.split('/').pop().includes('.')||/\.html?$/i.test(path)||request.headers.get('sec-fetch-dest')==='document'&&!/\.[a-z\d]{1,8}$/i.test(path);
 return doc&&!openPage.test(path)&&!/^\/(?:\.well-known|download(?:s)?(?:[/-]|$)|api\/)/.test(path);
}
export async function entryRoute(req,env,ctx){
 const url=new URL(req.url);let path;try{path=decodeURIComponent(url.pathname).replace(/\/{2,}/g,'/')}catch{return new Response(null,{status:400})}
 if(path==='/cs-entry.js')return new Response('('+entryClient.toString()+')();('+guestActions.toString()+')();',{headers:{...privacy,'content-type':'text/javascript;charset=utf-8'}});
 if(path==='/api/cs-entry'){try{return await session(req,env,ctx)}catch(error){return verificationOutage(req,error)}}
 if(path==='/api/autoradio/association')return manageRadio(req,env,await readCookie(req,env));
 if(!protectedPath(path,req))return null;
 const ticket=await readCookie(req,env);
 if(ticket&&isRadioDevice(ticket.device)){
  const radio=await radioIdentity(env.DB,ticket.email,ticket.device);
  if(radio){
   const banned=await env.DB.prepare("SELECT 1 FROM market_user_sanctions WHERE (last_device_id=? OR lower(email)=?) AND app_banned=1 LIMIT 1").bind(ticket.device,ticket.email).first();
   if(!banned){if(Number(radio.created_at)<cutoff)return null;const sub=await subscription(env.DB,ticket.email,ticket.device);if(sub&&!sub.trial)return null;}
  }
 }else if(ticket){
  if(Date.now()-ticket.checked<60000)return null;
  const verified=await env.DB.prepare(`SELECT 1 FROM app_identities a WHERE a.email=? COLLATE NOCASE AND a.email_verified_device_id=? AND a.email_verified_at>0
   AND NOT EXISTS(SELECT 1 FROM market_user_sanctions b WHERE (b.last_device_id=? OR lower(b.email)=?) AND b.app_banned=1)
   `).bind(ticket.email,ticket.device,ticket.device,ticket.email).first();
  if(verified)return null;
 }
 if((req.method==='GET'||req.method==='HEAD')&&!path.startsWith('/api/')&&!path.startsWith('/gps/api/')&&!/\.(?:json|js)$/i.test(path))return shell(req.method==='HEAD');
 return json({ok:false,error:'ABONNEMENT_REQUIS'},403);
}
const inviteCookie='__Host-cs-invitation';
function arrivingInvite(req){
 const search=new URL(req.url).searchParams.get('invitation');
 const saved=(req.headers.get('cookie')||'').split(/;\s*/).find(v=>v.startsWith(inviteCookie+'='))?.slice(inviteCookie.length+1);
 const value=search||saved;return /^[a-f0-9]{48}$/.test(value||'')?value:null;
}
export function withEntry(worker){return {...worker,async fetch(req,env,ctx){
 const path=new URL(req.url).pathname;
 const asset=radioAsset(req,path);if(asset)return asset;
 if(path==='/api/app-identity/return'){try{return await returnByMail(req,env,ctx,worker)}catch{return json({error:'ENVOI_INDISPONIBLE'},503)}}
 const isStart=path==='/api/app-identity/start'&&req.method==='POST';
 let token=arrivingInvite(req);
 if(isStart&&!token){const hint=(await req.clone().json().catch(()=>({}))).invitation;if(/^[a-f0-9]{48}$/.test(hint||''))token=hint;}
 let registration=null;
 if(isStart&&token){
  const data=await req.clone().json().catch(()=>({})),email=String(data.email||'').trim().toLowerCase(),device=String(data.deviceId||'');
  if(email&&device&&!await env.DB.prepare('SELECT 1 FROM app_identities WHERE email=? COLLATE NOCASE AND email_verified_at>0').bind(email).first())registration={email,device};
 }
 let gate;
 try{gate=await entryRoute(req,env,ctx)}catch(error){return verificationOutage(req,error)}
 const r=gate||await worker.fetch(req,env,ctx);
 if(registration&&r.ok){
  const result=await r.clone().json().catch(()=>({}));
  if(result.ok)await env.DB.prepare("INSERT INTO cs_week_pending(email,device,token) SELECT ?,?,token FROM cs_week_invites WHERE token=? ON CONFLICT DO NOTHING").bind(registration.email,registration.device,token).run();
 }
 if(req.method!=='GET'||!r.ok)return r;
 if(path==='/app-access-gate-v506.js'){
  const js=await r.text(),h=new Headers(r.headers);for(const k of ['etag','content-length','content-encoding'])h.delete(k);
  h.set('cache-control','private, no-store');h.set('content-type','application/javascript; charset=utf-8');
  return new Response(returningAccountScript(js).replace("api('/api/app-identity/start',{deviceId:deviceId()", "api('/api/app-identity/start',{invitation:localStorage.getItem('cs_week_invitation')||'',deviceId:deviceId()").replace('Renseignez vos informations. Confirmez le mail reçu, puis revenez ici.', 'Confirmez votre adresse e-mail. Vos documents existants restent consultables sans abonnement. Une invitation valable offre les sept premiers jours.'),{headers:h});
 }
 if(!r.headers.get('content-type')?.includes('text/html'))return r;
 const protectedDoc=protectedPath(path,req);
 if(!protectedDoc&&!token)return r;
 const h=new Headers(r.headers);
 if(token&&new URL(req.url).searchParams.has('invitation'))h.append('set-cookie',inviteCookie+'='+token+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800');
 if(gate)return new Response(r.body,{status:r.status,headers:h});
 if(!protectedDoc)return new Response(r.body,{status:r.status,headers:h});
 const ticket=await readCookie(req,env);
 // Embed the inviter token in the HTML so even an immediate tap can open the native share sheet.
 const share=ticket?.invite&&/^[a-f0-9]{48}$/.test(ticket.invite)?'<meta name="cs-friend-invite" content="'+ticket.invite+'">':'';
 h.set('cache-control','private, no-store');h.set('x-cs-entry','account');h.append('vary','Cookie');h.delete('etag');h.delete('content-length');
 return new HTMLRewriter().on('head',{element(el){el.prepend(share+'<script src="/cs-entry.js?v=compte-email-3" defer></script>',{html:true})}}).transform(new Response(r.body,{status:r.status,headers:h}));
}};}
