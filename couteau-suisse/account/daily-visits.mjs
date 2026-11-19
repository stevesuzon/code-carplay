const formatter=new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});
export const parisDay=(date=new Date())=>formatter.format(date);
export async function recordVisit(db,owner,day=parisDay()){
 await db.prepare('INSERT INTO cs_daily_visits(day,owner) VALUES(?,?) ON CONFLICT(day,owner) DO NOTHING').bind(day,owner).run();
}
export async function dailyVisits(db,plan){
 const headers={'cache-control':'private, no-store',vary:'Cookie'};
 if(!plan?.admin)return Response.json({error:'Accès refusé'},{status:403,headers});
 const day=parisDay();
 const {results}=await db.prepare(`SELECT a.first_name,a.last_name FROM cs_daily_visits v
 JOIN app_identities a ON v.owner=lower(a.email)||'|'||a.created_at
 WHERE v.day=? ORDER BY a.last_name,a.first_name`).bind(day).all();
 return Response.json({day,count:results.length,people:results},{headers});
}
export function dailyClient(){
 const panel=document.querySelector('#csDailyVisitors');if(!panel)return;
 const label=panel.querySelector('strong'),list=panel.querySelector('ul');
 const date=new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});
 let displayed='',loading=false,last=0;
 function tick(){
  const today=date.format(new Date());if(today!==displayed){displayed=today;label.textContent='0';list.replaceChildren();last=0;}
  if(loading||document.hidden||Date.now()-last<15000)return;
  loading=true;last=Date.now();
  fetch('/api/admin/daily-visits',{cache:'no-store'}).then(async r=>{
   if(!r.ok)throw Error();const data=await r.json();if(data.day!==date.format(new Date()))return;
   label.textContent=data.count;list.replaceChildren(...data.people.map(p=>{const li=document.createElement('li');li.textContent=[p.first_name,p.last_name].filter(Boolean).join(' ')||'Nom non renseigné';return li}));
  }).catch(()=>{label.textContent='Indisponible';list.replaceChildren()}).finally(()=>{loading=false});
 }
 tick();setInterval(tick,500);document.addEventListener('visibilitychange',tick);
}
