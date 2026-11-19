import assert from 'node:assert/strict';
import vm from 'node:vm';
import {addressClient} from './account/address-page.mjs';
function element(){return {children:[],append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children}}}
for(const gps of ['Waze','Google Maps','Plans Apple','Mon GPS']){
 const form=element(),list=element(),status=element(),back=element(),events={};
 const row={name:'Jan Test',address:'Grote Markt 1, 3800 Sint-Truiden',phone:'0102030405',author:'Jan Test'};
 const env={crypto,URLSearchParams,location:{search:'?retour=traducteur'},localStorage:{getItem:()=> 'Google Maps'},window:{addEventListener(name,fn){events[name]=fn}},document:{createElement:element,querySelector(selector){return {'form':form,'section':list,'[role=status]':status,a:back}[selector]},addEventListener(){}},fetch:async url=>({ok:true,json:()=>url.includes('preferences')?{gps_pref:gps}:[row]})};
 vm.runInNewContext('('+addressClient.toString()+')()',env);await events.pageshow();
 const card=list.children[0],go=card.children[2];
 assert(go.textContent.includes(gps));
 const u=new URL(go.href,'https://couteau-suisse.appli-suzon.workers.dev');
 assert.equal(u.searchParams.get(gps==='Waze'?'q':gps==='Plans Apple'?'daddr':'destination'),row.address);
 assert.equal(card.children[0].children[0].href,go.href);
 assert.equal(back.href,'/traducteur/');
}
console.log('OK — carnet accessible depuis le traducteur, adresse cliquable et 4 choix de GPS du compte.');
