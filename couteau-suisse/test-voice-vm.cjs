const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),speech=[],requests=[],saved=[];let sound=false,clock=0,streams=0,next=0;const jobs=new Map();
function element(){return {dataset:{},children:[],value:'',setAttribute(){},setPointerCapture(){},append(){},querySelector(){},querySelectorAll(){return []},addEventListener(){},focus(){this.onfocus?.()},blur(){},showModal(){this.open=true},close(){this.open=false},reset(){this.fields={}}}}
function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)}
function timer(fn,delay,repeat){const id=++next;jobs.set(id,{fn,due:clock+delay,repeat});return id}
async function tick(ms){const until=clock+ms;while(true){const first=[...jobs].sort((a,b)=>a[1].due-b[1].due)[0];if(!first||first[1].due>until)break;clock=first[1].due;if(first[1].repeat)first[1].due+=first[1].repeat;else jobs.delete(first[0]);first[1].fn();await new Promise(r=>setImmediate(r))}clock=until;await new Promise(r=>setImmediate(r))}
class Recorder{static isTypeSupported(){return true}start(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['x'.repeat(300)])});queueMicrotask(()=>this.onstop())}}
const synth={getVoices:()=>[{lang:'fr-FR'},{lang:'nl-BE'}],resume(){},cancel(){},speak(u){assert.equal(streams,0);speech.push(u.lang);u.onstart();timer(()=>u.onend(),500)}};
const env={crypto,FormData:class {constructor(form){this.form=form}*[Symbol.iterator](){yield*Object.entries(this.form.fields)}},document:{getElementById:get,createElement:element,createTextNode:t=>t,addEventListener(){}},navigator:{onLine:true,mediaDevices:{async getUserMedia(){streams++;let stopped=false;return {getTracks:()=>[{stop(){if(!stopped){stopped=true;streams--}}}]}}}},speechSynthesis:synth,SpeechSynthesisUtterance:class{},MediaRecorder:Recorder,Blob,AbortController,URLSearchParams,performance:{now:()=>clock},Date:{now:()=>clock},setInterval:(f,d)=>timer(f,d,d),setTimeout:timer,clearInterval:id=>jobs.delete(id),clearTimeout:id=>jobs.delete(id),addEventListener(){},AudioContext:class{async resume(){}async close(){this.state='closed'}createAnalyser(){return {fftSize:128,getFloatTimeDomainData:a=>a.fill(sound?.2:0)}}createMediaStreamSource(){return {connect(){}}}},fetch:async (url,options)=>{
 if(url.startsWith('/api/private-addresses')){saved.push([url,JSON.parse(options.body)]);return {ok:true}};
 requests.push([url,options]);return {ok:true,json:()=>({text:typeof options.body==='string'?options.body:'Bonjour',translation:'Hallo'})}
}};
env.window=env;
(async()=>{vm.runInNewContext(fs.readFileSync(__dirname+'/translator-client.mjs','utf8'),env);get('conversation').onclick();await tick(0);
sound=true;await tick(400);sound=false;await tick(1500);assert.equal(requests.length,0);
sound=true;await tick(350);sound=false;await tick(1950);assert.equal(requests.length,0);await tick(50);assert.equal(requests.length,1);
await tick(750);assert.equal(streams,1);sound=true;await tick(300);sound=false;await tick(2000);await tick(750);assert.deepEqual(speech,['nl-BE','fr-FR']);assert(requests[1][0].endsWith('lang=nl'));get('stopTurn').onclick();await tick(2500);assert.equal(streams,0);assert.equal(requests.length,2);const event={isPrimary:true,button:0,pointerId:7,preventDefault(){}};
 get('talkNl').onpointerdown(event);await tick(0);
 assert.equal(get('turnFr').textContent,'Patientez…');assert.equal(get('turnNl').textContent,'U bent aan de beurt');
 sound=true;await tick(450);sound=false;await tick(2500);assert.equal(requests.length,2);
 get('talkNl').onpointerup(event);await tick(0);assert.equal(requests.length,3);
 assert.equal(get('turnFr').textContent,'Patientez…');await tick(700);assert.equal(streams,0);
 for(const side of ['Fr','Nl']){
  get('input'+side).focus();get('input'+side).value=side==='Fr'?'Où habitez-vous ?':'Ik woon in Sint-Truiden.';get('input'+side).oninput();
  assert.equal(get('send'+side).hidden,false);await get('form'+side).onsubmit(event);await tick(700);
  assert(requests.at(-1)[0].endsWith('lang='+side.toLowerCase()));assert.equal(requests.at(-1)[1].headers['content-type'],'text/plain;charset=utf-8');
 }
 get('openAddress').onclick();assert.equal(get('nlAddress').open,true);
 get('nlAddressForm').fields={name:'Jan Test',phone:'0102030405',address:'Grote Markt 1, 3800 Sint-Truiden'};
 await get('nlAddressForm').onsubmit(event);
 assert.equal(saved.length,1);assert.equal(saved[0][1].author,'Jan Test');assert.equal(saved[0][1].address,'Grote Markt 1, 3800 Sint-Truiden');assert.equal(get('nlAddress').open,false);
 assert.equal(get('turnNl').textContent,'Uw adres is opgeslagen.');
 console.log('OK — appui maintenu, conversation à 2 secondes, signaux FR/NL, saisie dans les deux bulles, enregistrement du formulaire flamand.')})().catch(e=>{console.error(e);process.exitCode=1});
