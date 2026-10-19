export function patchCounter(source){
 const needle='  const added = (imported.results || []).map((m) => countEntry({ ...m, sourceUrl: m.source_url }));';
 if(!source.includes(needle))throw Error('Counter source mismatch');
 source=source.replace(needle,`  const review = await env.DB.prepare("SELECT r.market_key,r.payload_json,r.confidence,d.action FROM market_duplicate_review_v2 r LEFT JOIN market_duplicate_decisions d ON d.market_key=r.market_key").all();
  for (const item of review.results || []) {
    if (item.action === 'restored') {
      const restored = JSON.parse(item.payload_json);
      entries.push({country:restored.country,row:restored.row});
    } else if (item.action === 'deleted' || item.confidence === 'confirmed') {
      decisions[item.market_key] = 'deleted';
    }
  }
`+needle);
 const start=source.indexOf('async function publicMarketCounts(env) {'),end=source.indexOf('__name(publicMarketCounts,',start);
 if(start<0||end<0)throw Error('Public count handler missing');
 source=source.slice(0,start)+`async function publicMarketCounts(env) {
  if (!env.DB) return json({ok:false,error:'DB_INDISPONIBLE'},503);
  await ensureMarketTable(env);await ensureJdmStaging(env);
  const counters=await applicationMarketCounts(env);
  return json({ok:true,inApplication:Math.max(0,Number(counters.applicationTotal)||0)});
}
`+source.slice(end);
 return source;
}
