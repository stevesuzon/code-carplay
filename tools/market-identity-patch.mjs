export function patchIdentityIndex(s){
 for(const name of ['importMarkets','upsertAutoMarket']){
  const start=s.indexOf('async function '+name+'('),end=s.indexOf('\n__name(',start);
  if(start<0||end<start)throw Error('Missing '+name);
  let f=s.slice(start,end);
  if(name==='importMarkets'){
   const needle='    const existing = await env.DB.prepare("SELECT fingerprint FROM imported_markets WHERE fingerprint=?")';
   if(!f.includes(needle))throw Error('Import changed');
   f=f.replace(needle,'    await resolveMarketIdentity(env, m);\n'+needle);
  }else{
   if(!f.includes('  let newKey = "";'))throw Error('Upsert changed');
   f=f.replace('  let newKey = "";','  await resolveMarketIdentity(env, m);\n  let newKey = "";');
  }
  s=s.slice(0,start)+f+s.slice(end);
 }
 const needle='async function stageJdmMarket(env, m) {\n  await ensureJdmStaging(env);';
 if(!s.includes(needle))throw Error('Staging changed');
 s=s.replace(needle,needle+'\n  await resolveMarketIdentity(env, m);');
 const fingerprint='const fingerprint = [country, area, kind, name, city, day].join("|").toLowerCase();';
 if(!s.includes(fingerprint))throw Error('Normalization changed');
 s=s.replace(fingerprint,'const fingerprint = [country, area, kind, foldMarket(name), foldMarket(city), foldMarket(day)].join("|").toLowerCase();');
 return 'import {resolveMarketIdentity,foldMarket} from "./market-identity-v1.mjs";\n'+s;
}