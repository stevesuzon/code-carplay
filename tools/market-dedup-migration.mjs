import {foldMarket,sameMarket} from './market-identity-v1.mjs';
export async function runDedup(cloudflare,accountId,apply=false,limit=20){
 const path='/accounts/'+accountId+'/d1/database/8c139641-68af-44cc-aa8f-2a68af669c4a/query';
 async function query(sql,params=[]){const r=await cloudflare.request({method:'POST',path,body:{sql,params}});if(!r.success||r.result.some(x=>!x.success))throw Error(JSON.stringify(r.errors));return r.result[0].results;}
 const rows=await query('SELECT * FROM imported_markets ORDER BY id');
 const tables=await query("SELECT name,sql FROM sqlite_master WHERE type='table'");
 const protectedTables=tables.filter(t=>(t.sql||'').includes('market_key')&&!['market_milestone_additions','market_dedup_archive_v1'].includes(t.name));
 const keys=new Set(); for(let i=0;i<protectedTables.length;i+=3){const items=await query(protectedTables.slice(i,i+3).map(t=>'SELECT market_key AS k FROM "'+t.name+'"').join(' UNION '));items.forEach(x=>keys.add(x.k));}
 function protectedRow(m){return [m.day,m.date_label||m.day].some(day=>keys.has([m.country.toLowerCase(),m.area,m.name,m.city,day,m.address||m.city].join('|'))||keys.has([m.country.toLowerCase(),m.area,m.name,m.city,day,m.address||''].join('|')));}
 const buckets=new Map();for(const m of rows){const k=['country','area','kind','city','day'].map(k=>foldMarket(m[k])).join('|');const b=buckets.get(k)||[];b.push(m);buckets.set(k,b);}
 const groups=[];let ambiguous=0;
 for(const b of buckets.values()){const used=new Set();for(const a of b){if(used.has(a.id))continue;const g=b.filter(x=>sameMarket(a,x));if(g.length<2)continue;
 if(g.some(x=>g.some(y=>!sameMarket(x,y)))||b.some(x=>!g.includes(x)&&g.some(y=>sameMarket(x,y)))){ambiguous++;continue;}
 g.forEach(x=>used.add(x.id));const protectedRows=g.filter(protectedRow);if(protectedRows.length>1){ambiguous++;continue;}const keep=protectedRows[0]||g[0];groups.push({keep,remove:g.filter(x=>x.id!==keep.id)});
 }}
 const candidates=groups.reduce((n,g)=>n+g.remove.length,0);
 if(!apply)return {rows:rows.length,candidates,groups:groups.length,ambiguous,examples:groups.slice(0,6).map(g=>({keep:g.keep.id,city:g.keep.city,names:[g.keep.name,...g.remove.map(x=>x.name)]}))};
 await query("CREATE TABLE IF NOT EXISTS market_dedup_archive_v1(id INTEGER PRIMARY KEY,kept_id INTEGER NOT NULL,row_json TEXT NOT NULL,kept_before_json TEXT NOT NULL,archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
 let removed=0;
 for(const g of groups.slice(0,limit)){
 for(const m of g.remove){
 await query('INSERT OR IGNORE INTO market_dedup_archive_v1(id,kept_id,row_json,kept_before_json) VALUES(?,?,?,?)',[m.id,g.keep.id,JSON.stringify(m),JSON.stringify(g.keep)]);
 const fields=['hours','merchants','draw','registration','note','phone','start_date','end_date','source_url'];
 await query('UPDATE imported_markets SET '+fields.map(k=>k+"=CASE WHEN trim(COALESCE("+k+",''))='' THEN ? ELSE "+k+" END").join(',')+' WHERE id=?',[...fields.map(k=>m[k]||''),g.keep.id]);
 const columns=Object.keys(m);
 const deleted=await query('DELETE FROM imported_markets WHERE '+columns.map(k=>'"'+k+'" IS ?').join(' AND ')+' AND EXISTS(SELECT 1 FROM market_dedup_archive_v1 WHERE id=?) AND EXISTS(SELECT 1 FROM imported_markets WHERE id=?) RETURNING id',[...columns.map(k=>m[k]),m.id,g.keep.id]);
 removed+=deleted.length;
 }}
 return {removed,candidatesBefore:candidates,groupsProcessed:Math.min(limit,groups.length),ambiguous};
}