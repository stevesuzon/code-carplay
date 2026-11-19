import {preferences,preferenceClient} from './preferences.mjs';
import {dailyVisits,recordVisit,dailyClient} from './daily-visits.mjs';
import {addresses} from './address-api.mjs';
import {addressPage} from './address-page.mjs';
import {readCookie} from './entry-ticket.mjs';
import {isRadioDevice,radioIdentity} from './radio-account.mjs';
import {adminInboxScript} from './admin-inbox-script.mjs';
export const BOOK_VERSION='2026-30f50f6df76516fa';
const BOOK_READY=true;
export const BOOK_LIMIT=2;
export const BOOK_LIMIT_MESSAGE='Vous avez téléchargé vos 2 livres en PDF. Attendez la prochaine mise à jour du livre pour le télécharger à nouveau, ou contactez Steve Suzon : 5 € l’envoi du livre en PDF.';
export const MESSAGE_LIFETIME=72*60*60*1000;
const headers={'cache-control':'private, no-store','vary':'Cookie','content-type':'application/json;charset=utf-8'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export function planStateMarkup(plan){
 if(!plan?.authenticated)return '';
 const safe={premium:plan.premium===true,admin:plan.admin===true,authenticated:true,expiresAt:plan.expiresAt||null,serverNow:Date.now()};
 return '<script type="application/json" id="csDocumentPlanState">'+JSON.stringify(safe).replace(/</g,'\\u003c')+'</script>';
}
const home=p=>['/','/index','/index.html'].includes(p);
const papers=p=>/^\/mes-papiers(?:\.html)?\/?$/.test(p);
const publicPage=p=>/^\/(?:admin|payment|installer|connexion|confidentialite|privacy|mentions-legales|conditions|cgu|cgv)(?:\.html)?\/?$/i.test(p);
const accountAPI=/^\/api\/(?:app-identity(?:\/|$)|cs-entry$|document-plan$|autoradio\/association$|payment[-/]|stripe[-/]|status$|activate$|recover-code$|recovery[-/]|subscription[-/]|freemium\/session$|admin(?:\/|$)|sanction\/status$|installations$|health$|referral(?:\/|$)|notifications\/start$)/;
export function requiresPlan(path,method='GET'){
 if(path.startsWith('/api/'))return !accountAPI.test(path);
 if(/^\/(?:market-chunks|nearby-shards|gps\/api)\//.test(path)||/^\/(?:market-count-catalog|traveller-markets-data|marches-noel|market-duplicate-catalog)/.test(path))return true;
 if(['/fiches-achat','/fiches-achat.html'].includes(path)||home(path)||papers(path)||publicPage(path)||path.startsWith('/.well-known/'))return false;
 // App code, styling and artwork remain available for the free document viewer.
 // Data feeds, downloadable books/apps and feature pages remain protected.
 if(/\.(?:js|css|png|jpe?g|webp|avif|svg|ico|gif|woff2?|ttf|webmanifest)$/i.test(path))return false;
 if(['/app-version.json','/autoradio-version.json','/manifest.json'].includes(path))return false;
 return true;
}
export async function accountPlan(request,env,helpers){
 const ticket=await readCookie(request,env);
 if(!ticket)return {premium:false,admin:false,authenticated:false};
 const account=isRadioDevice(ticket.device)?await radioIdentity(env.DB,ticket.email,ticket.device):await env.DB.prepare(`SELECT email,created_at FROM app_identities WHERE email=? COLLATE NOCASE AND email_verified_device_id=? AND email_verified_at>0 LIMIT 1`).bind(ticket.email,ticket.device).first();
 if(!account)return {premium:false,admin:false,authenticated:false};
 const blocked=await env.DB.prepare('SELECT 1 FROM market_user_sanctions WHERE (last_device_id=? OR lower(email)=?) AND app_banned=1 LIMIT 1').bind(ticket.device,ticket.email.toLowerCase()).first();
 if(blocked)return {premium:false,admin:false,authenticated:false};
 const owner=account.email.toLowerCase()+'|'+account.created_at;
 const admin=account.email.toLowerCase()==='appli.suzon@gmail.com';
 if(admin)return {premium:true,admin:true,authenticated:true,owner,expiresAt:null};
 const sub=await env.DB.prepare("SELECT * FROM subscriptions WHERE active=1 AND (lifetime=1 OR julianday(expires_at)>julianday('now')) AND lower(COALESCE(recovery_email_mask,''))=? AND (phone_device=? OR autoradio_device=?) ORDER BY lifetime DESC,expires_at DESC LIMIT 1").bind(ticket.email.toLowerCase(),ticket.device,ticket.device).first();
 const premium=!!sub&&!await helpers.isTrial(sub,env);
 return {premium,admin:false,authenticated:true,owner,expiresAt:premium&&!sub.lifetime?sub.expires_at:null};
}
async function bookTables(db){await db.batch([
 db.prepare('CREATE TABLE IF NOT EXISTS cs_book_exports(owner TEXT NOT NULL,version TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(owner,version))'),
 db.prepare('CREATE TABLE IF NOT EXISTS cs_book_grants(token TEXT PRIMARY KEY,owner TEXT NOT NULL,version TEXT NOT NULL,expires INTEGER NOT NULL)'),
 db.prepare('CREATE INDEX IF NOT EXISTS cs_book_grants_expiry ON cs_book_grants(expires)')
]);}
export async function bookAPI(request,env,plan){
 if(!plan.authenticated||!plan.premium)return json({error:'ABONNEMENT_REQUIS'},403);
 const action=new URL(request.url).pathname.split('/').pop();
 if(request.headers.has('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'ORIGINE_INVALIDE'},403);
 if(action==='status'&&request.method!=='GET'||action!=='status'&&request.method!=='POST')return json({error:'METHODE_INVALIDE'},405);
 const db=env.DB;await bookTables(db);
 if(action==='status'){
  if(plan.admin)return json({version:BOOK_VERSION,available:BOOK_READY,unlimited:true,limit:null,remaining:null});
  const row=await db.prepare('SELECT used FROM cs_book_exports WHERE owner=? AND version=?').bind(plan.owner,BOOK_VERSION).first();
  return json({version:BOOK_VERSION,available:BOOK_READY,limit:BOOK_LIMIT,remaining:Math.max(0,BOOK_LIMIT-(row?.used||0))});
 }
 if(action==='prepare'){
  if(!BOOK_READY)return json({error:'LIVRE_EN_PREPARATION',message:'Le livre sera bientôt disponible.'},503);
  const row=plan.admin?{used:0}:await db.prepare('INSERT INTO cs_book_exports(owner,version,used) VALUES(?,?,1) ON CONFLICT(owner,version) DO UPDATE SET used=used+1 WHERE used<? RETURNING used').bind(plan.owner,BOOK_VERSION,BOOK_LIMIT).first();
  if(!row)return json({error:'LIMITE_ATTEINTE',remaining:0,message:BOOK_LIMIT_MESSAGE},429);
  const token=crypto.randomUUID()+crypto.randomUUID();
  await db.prepare('INSERT INTO cs_book_grants(token,owner,version,expires) VALUES(?,?,?,?)').bind(token,plan.owner,BOOK_VERSION,Date.now()+300000).run();
  return json({version:BOOK_VERSION,unlimited:plan.admin,remaining:plan.admin?null:BOOK_LIMIT-row.used,url:'/livres/livre-des-marches-2026.pdf?envoi='+token});
 }
 if(action==='authorize'){
  const data=await request.json().catch(()=>({}));
  const row=await db.prepare('SELECT 1 FROM cs_book_grants WHERE token=? AND owner=? AND version=? AND expires>?').bind(String(data.token||''),plan.owner,BOOK_VERSION,Date.now()).first();
  return row?json({allowed:true}):json({error:'ENVOI_EXPIRE',allowed:false},403);
 }
 return json({error:'DEMANDE_INCONNUE'},404);
}
export async function cleanupMessages(env){
 const exists=await env.DB.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='account_inbox_notes'").first();
 if(exists)await env.DB.prepare('DELETE FROM account_inbox_notes WHERE created<=?').bind(Date.now()-MESSAGE_LIFETIME).run();
}
const lockedPage=()=>new Response('<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abonnement requis</title><style>body{background:#111;color:#fff;font:20px/1.5 system-ui;max-width:480px;margin:12vh auto;padding:24px}a{display:block;margin:16px 0;padding:16px;background:#234b3e;color:white;border-radius:12px;text-decoration:none}</style><h1>Réservé aux abonnés</h1><p>Vos papiers, devis et factures déjà enregistrés restent consultables.</p><a href="/index.html#reglages">Mon compte · Prendre un abonnement</a><a href="/index.html">Retour</a></html>',{status:403,headers:{'content-type':'text/html;charset=utf-8','cache-control':'private, no-store'}});
export function withDocumentPlan(worker,helpers){return {...worker,
 async scheduled(event,env,ctx){await cleanupMessages(env);if(worker.scheduled)await worker.scheduled(event,env,ctx);},
 async fetch(request,env,ctx){
  const u=new URL(request.url);let path;try{path=decodeURIComponent(u.pathname).replace(/\/{2,}/g,'/')}catch{return json({error:'URL_INVALIDE'},400)}
  if(!['couteau-suisse.appli-suzon.workers.dev','carplay-telephone.appli-suzon.workers.dev'].includes(u.hostname))return worker.fetch(request,env,ctx);
  if(path==='/cs-admin-inbox-72h.js')return new Response(adminInboxScript,{headers:{'content-type':'application/javascript;charset=utf-8','cache-control':'no-store'}});
  const isHome=home(path),isAdmin=/^\/admin(?:\.html)?\/?$/.test(path);
  const book=path.startsWith('/api/book-2026/');
  const protectedFeature=requiresPlan(path,request.method);
  let plan;
  try{
   if(book||path==='/api/admin/daily-visits'||path==='/api/document-plan'||protectedFeature||isHome||isAdmin)plan=await accountPlan(request,env,helpers);
   if(path==='/api/admin/daily-visits')return await dailyVisits(env.DB,plan);
   if(plan?.authenticated&&request.method==='GET'&&(isHome||path==='/api/document-plan'))ctx.waitUntil(recordVisit(env.DB,plan.owner));
   if(path==='/api/document-plan'){const {owner,...safe}=plan;return json({...safe,serverNow:Date.now()})}
   if(path==='/api/private-preferences')return await preferences(request,env.DB,plan);
   if(path==='/cs-private-preferences.js')return new Response('('+preferenceClient.toString()+')()',{headers:{'content-type':'text/javascript','cache-control':'no-cache'}});
   if(path==='/api/private-addresses')return await addresses(request,env,plan);
   if(path==='/mes-adresses'&&plan?.premium)return addressPage();
   if(book)return await bookAPI(request,env,plan);
   if(protectedFeature&&!plan.premium){
    // Existing account APIs and the document viewer remain independently usable.
    return path.startsWith('/api/')||!['GET','HEAD'].includes(request.method)?json({error:'ABONNEMENT_REQUIS'},403):lockedPage();
   }
   if(path.startsWith('/api/account-inbox/'))await cleanupMessages(env);
   let response=await worker.fetch(request,env,ctx);
   if(!response.ok||request.method!=='GET'||!response.headers.get('content-type')?.includes('text/html'))return response;
   if(!isHome&&!isAdmin&&!papers(path))return response;
   const h=new Headers(response.headers);for(const k of ['etag','content-length','content-encoding'])h.delete(k);h.set('cache-control','private, no-store');
   let rewrite=new HTMLRewriter();
   if(isHome&&plan.authenticated)rewrite=rewrite.on('head',{element(e){e.prepend(planStateMarkup(plan),{html:true})}});
   if(isHome&&plan.authenticated)rewrite=rewrite.on('body',{element(e){e.append('<script defer src="/cs-private-preferences.js"></script>',{html:true})}});
   if(isHome&&plan.premium)rewrite=rewrite.on('#csAccount',{element(e){e.before('<a class="settingHead" href="/mes-adresses">Mes adresses</a>',{html:true})}});
   if(isHome&&plan.admin)rewrite=rewrite.on('#csMessages',{element(e){e.remove()}});
   if(isAdmin){
    // The existing administration keeps its authentication. Message data is
    // fetched only for the verified signed administrator account.
    if(!plan.admin)return response;
    rewrite=rewrite.on('body',{element(e){e.append('<section id="csDailyVisitors"><h2>Connexions aujourd’hui · <strong>…</strong></h2><ul></ul></section><script>('+dailyClient.toString()+')()</script>',{html:true})}});
    rewrite=rewrite.on('#csRecentAccounts',{element(e){e.after('<details id="csMessages" class="settingRow csTools"><summary>Messages<span id="csMessageCount"></span></summary><p>Les messages s’effacent après 72 heures.</p><div id="csMessageList"></div></details>',{html:true})}})
     .on('body',{element(e){e.append('<script defer src="/cs-admin-inbox-72h.js"></script>',{html:true})}});
   }
   return rewrite.transform(new Response(response.body,{status:response.status,headers:h}));
  }catch(error){console.error('document-plan',String(error?.message||error));return json({error:'VERIFICATION_INDISPONIBLE'},503)}
 }
};}

