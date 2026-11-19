const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const pageHtml=(await import('./translator-page.mjs')).translatorPage(),app=fs.readFileSync(__dirname+'/translator-client.mjs','utf8');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const page=await browser.newPage();
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname.endsWith('/app.js'))return route.fulfill({contentType:'application/javascript',body:app});
  if(u.pathname.endsWith('/api'))return route.fulfill({json:{text:'Bonjour',translation:'Goedendag'}});
  if(u.pathname==='/traducteur/')return route.fulfill({contentType:'text/html',body:pageHtml.replace(/if\(navigator.onLine[\s\S]+?import\("\/traducteur\/app/,'import("/traducteur/app')});
  return route.fulfill({status:404,body:''});
 });
 await page.addInitScript(()=>{
  window.activeTracks=0;window.sound=true;window.spoken=[];window.overlap=false;
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const c=new (window.webkitAudioContext||OriginalAudio)(),o=c.createOscillator(),g=c.createGain(),dest=c.createMediaStreamDestination();o.connect(g).connect(dest);o.start();await c.resume();window.activeTracks++;
   const timer=setInterval(()=>g.gain.value=window.sound?.12:0,10);
   const track=dest.stream.getTracks()[0],stop=track.stop.bind(track);let done=false;
   track.stop=()=>{if(!done){done=true;window.activeTracks--;clearInterval(timer);stop();void c.close()}};return dest.stream;
  }});
  const OriginalAudio=window.AudioContext;
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'nl-BE'},{lang:'fr-FR'}],cancel(){},resume(){},speak(u){window.spoken.push(u.lang);if(activeTracks)window.overlap=true;u.onstart?.();setTimeout(()=>u.onend?.(),250)},addEventListener(){}}});
  window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
 });
 await page.goto('https://test.invalid/traducteur/');
 await page.locator('#talkFr').click();await page.waitForFunction(()=>document.querySelector('#talkFr').dataset.recording==='true');
 const sound=async(on,ms)=>{await page.evaluate(s=>window.sound=s,on);await page.waitForTimeout(ms)};
 await sound(true,300);await sound(false,1100);await sound(true,350);await sound(false,1200);
 assert.equal(await page.evaluate(()=>spoken.length),0);
 await page.waitForFunction(()=>document.querySelector('#talkNl').dataset.recording==='true');
 await sound(true,320);await sound(false,2200);await page.waitForFunction(()=>document.querySelector('#talkFr').dataset.recording==='true');
 assert.deepEqual(await page.evaluate(()=>spoken),['nl-BE','fr-FR']);assert.equal(await page.evaluate(()=>overlap),false);
 await page.locator('#stopTurn').click();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>activeTracks),0);
 console.log('OK Chromium — reprise de parole, deux secondes, alternance, lecture micro fermé, arrêt.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
