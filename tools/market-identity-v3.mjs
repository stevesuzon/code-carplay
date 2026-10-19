// Conservative identity: country, department, category and occurrence must agree.
export function foldMarket(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/œ/g,'oe').replace(/æ/g,'ae').replace(/[^a-z0-9]+/g,' ').trim().replace(/\bsaint\b/g,'st').replace(/\bsainte\b/g,'ste');}
function detail(v,city){const words=new Set(foldMarket(city).split(' '));return foldMarket(v).split(' ').filter(w=>!words.has(w)&&!/^\d{5}$/.test(w)&&!['marche','marches','de','du','des','d','le','la','les','a','au','aux'].includes(w)).join(' ');}
function address(m){const a=foldMarket(m.address);return /^(a verifier|non publie|inconnu)$/.test(a)?'':detail(a,m.city);}
function source(m){const u=String(m.source_url||m.sourceUrl||'');const j=u.match(/jours-de-marche\.fr\/marche\/[^/]+\/(\d+)/);if(j)return 'jdm:'+j[1];const o=u.match(/openstreetmap.org\/(node|way|relation)\/(\d+)/);return o?'osm:'+o[1]+':'+o[2]:'';}
function distance(a,b){if([a.latitude,a.longitude,b.latitude,b.longitude].some(x=>x==null||x===''||!Number.isFinite(Number(x))))return null;const p=Math.PI/180,t=Math.sin((b.latitude-a.latitude)*p/2)**2+Math.cos(a.latitude*p)*Math.cos(b.latitude*p)*Math.sin((b.longitude-a.longitude)*p/2)**2;return 12742000*Math.asin(Math.sqrt(Math.min(1,t)));}
function hours(v){const m=String(v||'').match(/^(\d{1,2})[h:](\d{2})?\s*[-–]\s*(\d{1,2})[h:](\d{2})?$/);return m?[+m[1]*60+(+m[2]||0),+m[3]*60+(+m[4]||0)]:null;}
export function sameMarket(a,b){
 for(const k of ['country','area','kind','city','day'])if(!foldMarket(a[k])||foldMarket(a[k])!==foldMarket(b[k]))return false;
 for(const k of ['start_date','end_date']){const alias=k==='start_date'?'startDate':'endDate',x=a[k]||a[alias],y=b[k]||b[alias];if(x&&y&&x!==y)return false;}
 const h=hours(a.hours),g=hours(b.hours);if(h&&g&&(h[1]<=g[0]||g[1]<=h[0]))return false;
 const d=distance(a,b);if(d!==null&&d>300)return false;
 const sa=source(a),sb=source(b);if(sa&&sb&&sa===sb)return true;
 const aa=address(a),ab=address(b);if(aa&&ab&&aa!==ab)return false;
 if(sa&&sb&&sa!==sb&&(!aa||!ab)&&foldMarket(a.name)!==foldMarket(b.name))return false;
 const nameCore=m=>detail(m.name,m.city).split(' ').filter(w=>w!==foldMarket(m.area)&&w!=='place').join(' ');
 const na=nameCore(a),nb=nameCore(b);
 if(foldMarket(a.area)==='94'&&foldMarket(a.city)==='rungis'&&['','international'].includes(na)&&['','international'].includes(nb))return true;
 return na===nb;
}
export async function resolveMarketIdentity(env,m){
 const result=await env.DB.prepare('SELECT * FROM imported_markets WHERE country=? AND area=? AND kind=? ORDER BY id').bind(m.country,m.area,m.kind).all();
 const decisions=await env.DB.prepare("SELECT market_key FROM market_duplicate_decisions WHERE action='restored'").all();
 const restored=new Set((decisions.results||[]).map(r=>r.market_key));
 const key=r=>[String(r.country).toLowerCase(),r.area,r.name,r.city,r.date_label||r.dateLabel||r.day,r.address||r.city].join('|');
 const matches=(result.results||[]).filter(r=>sameMarket(m,r)&&(!restored.has(key(r))||key(r)===key(m)));
 if(!matches.length)return m;
 // Do not resolve a generic label against two distinct sites.
 if(matches.some(r=>!sameMarket(matches[0],r)))return m;
 const kept=matches[0];m.fingerprint=kept.fingerprint;m.name=kept.name;m.city=kept.city;m.day=kept.day;
 // Keep identifiers used for contributed photos and verified information stable.
 m.address=kept.address;m.dateLabel=kept.date_label||kept.day;
 for(const k of ['hours','merchants','draw','registration','note','phone'])if(!m[k])m[k]=kept[k]||'';
 return m;
}
