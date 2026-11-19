const send=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store',vary:'Cookie'}});
const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const base64=value=>btoa(String.fromCharCode(...new Uint8Array(value)));
async function crypt(env,owner,id,data,decrypt=false){
 const key=await crypto.subtle.importKey('raw',bytes(env.ADDRESS_VAULT_KEY),'AES-GCM',false,['encrypt','decrypt']);
 const iv=decrypt?bytes(data.iv):crypto.getRandomValues(new Uint8Array(12));
 const algorithm={name:'AES-GCM',iv,additionalData:new TextEncoder().encode(JSON.stringify([owner,id]))};
 if(decrypt)return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt(algorithm,key,bytes(data.body))));
 const body=await crypto.subtle.encrypt(algorithm,key,new TextEncoder().encode(JSON.stringify(data)));
 return JSON.stringify({iv:base64(iv),body:base64(body)});
}
export async function addresses(request,env,plan){
 if(!plan?.authenticated||!plan.premium)return send({error:'Accès refusé'},403);
 const url=new URL(request.url),id=url.searchParams.get('id'),owner=plan.owner;
 if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return send({error:'Origine refusée'},403);
 if(request.method==='GET'){
  const {results}=await env.DB.prepare('SELECT id,envelope FROM cs_private_addresses WHERE owner=? ORDER BY rowid DESC').bind(owner).all();
  return send(await Promise.all(results.map(async row=>({id:row.id,...await crypt(env,owner,row.id,JSON.parse(row.envelope),true)}))));
 }
 if(!id||!/^\w{8}-[\da-f-]{27}$/i.test(id))return send({error:'Identifiant invalide'},400);
 if(request.method==='DELETE'){
  await env.DB.prepare('DELETE FROM cs_private_addresses WHERE owner=? AND id=?').bind(owner,id).run();
  return send({ok:true});
 }
 if(request.method!=='PUT')return send({error:'Méthode invalide'},405);
 const input=await request.json().catch(()=>null),data={};
 for(const k of ['name','phone','address','author']){
  const value=input?.[k];if(typeof value!=='string'||!value.trim()||value.length>500)return send({error:'Champ manquant ou trop long'},400);data[k]=value.trim();
 }
 const envelope=await crypt(env,owner,id,data);
 await env.DB.prepare('INSERT INTO cs_private_addresses(owner,id,envelope) VALUES(?,?,?) ON CONFLICT(owner,id) DO NOTHING').bind(owner,id,envelope).run();
 return send({ok:true});
}
