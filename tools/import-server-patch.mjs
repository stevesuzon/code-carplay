export function patchIndex(s){
 const start=s.indexOf('async function adminJdmStage('),end=s.indexOf('\n__name(',start);
 if(start<0||end<start)throw Error('adminJdmStage missing');
 const original=s.slice(start,end);
 if(!original.includes('ORDER BY updated_at,fingerprint LIMIT 40'))throw Error('Import query changed');
 s=s.slice(0,start)+original.replace('ORDER BY updated_at,fingerprint LIMIT 40','ORDER BY updated_at,fingerprint LIMIT 5')+s.slice(end);
 const old='for (let milestone = 50; milestone <= total - baseline; milestone += 50) {';
 const replacement='const last = Number((await env.DB.prepare("SELECT COALESCE(MAX(milestone),0) AS n FROM market_milestone_events").first()).n || 0);\n  for (let milestone = Math.max(50, last + 50); milestone <= total - baseline; milestone += 50) {';
 if(s.split(old).length!==2)throw Error('Milestone loop changed');
 return s.replace(old,replacement);
}