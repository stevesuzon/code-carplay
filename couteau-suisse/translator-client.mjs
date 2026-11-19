(function translatorClient(){
 'use strict';
 const $=id=>document.getElementById(id),buttons={fr:$('talkFr'),nl:$('talkNl')};
 let recording=null,pending=false,revision=0,abort=null,speaking=null,voiceTimer=0,offline=null,installing=false,voiceRevision=0;
 let conversation=false, nextLanguage='fr';
 function continueAfterVoice(){
  if(conversation) setTimeout(()=>{if(conversation&&!recording&&!pending&&!speaking)void start(nextLanguage,'auto')},220);
 }
 const latest={fr:'',nl:''};
 const status=t=>{$('translatorStatus').textContent=t};
 const text=(lang,value,received)=>{
  const area=$(lang==='fr'?'textFr':'textNl');area.querySelector('p')?.remove();
  const bubble=document.createElement('div');bubble.className='bubble'+(received?' received':'');
  const label=document.createElement('small');label.textContent=lang==='fr'?(received?'Traduction':'Vous'):(received?'Vertaling':'U');
  bubble.append(label,document.createTextNode(value));area.append(bubble);while(area.children.length>12)area.firstElementChild.remove();area.scrollTop=area.scrollHeight;latest[lang]=value;$(lang==='fr'?'replayFr':'replayNl').disabled=false;
 };
 function stopVoice(){voiceRevision++;clearTimeout(voiceTimer);speaking=null;offline?.stopSpeech();try{window.speechSynthesis?.cancel()}catch{}}
 function voice(lang,value){
  stopVoice();if(!value)return;offline?.unlockAudio();const run=voiceRevision;
  const fallback=async()=>{if(run!==voiceRevision)return;clearTimeout(voiceTimer);speaking=null;try{window.speechSynthesis?.cancel()}catch{}
   try{if(!offline||!await offline.ready())throw Error();if(run!==voiceRevision)return;status(lang==='nl'?'Lecture en flamand…':'Lecture en français…');await offline.speak(lang,value);if(run===voiceRevision)continueAfterVoice();}
   catch{if(run===voiceRevision){conversation=false;status('Voix indisponible. Touchez Réécouter ou installez les langues.');}}
  };
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){void fallback();return;}
  const u=new SpeechSynthesisUtterance(value),locale=lang==='nl'?'nl-BE':'fr-FR',voices=speechSynthesis.getVoices();
  const local=voices.filter(v=>v.localService),pool=(!navigator.onLine||$('useOffline').checked)?local:voices;
  u.voice=pool.find(v=>v.lang.toLowerCase()===locale.toLowerCase())||pool.find(v=>v.lang.toLowerCase().startsWith(lang))||null;u.lang=u.voice?.lang||locale;u.rate=.95;speaking=u;
  if(!u.voice){void fallback();return;}
  let started=false,failed=false;const retry=()=>{if(failed||run!==voiceRevision)return;failed=true;void fallback()};
  u.onstart=()=>{if(speaking!==u||run!==voiceRevision)return;started=true;clearTimeout(voiceTimer);status(lang==='nl'?'Lecture en flamand…':'Lecture en français…');};
  u.onend=()=>{if(speaking!==u||run!==voiceRevision)return;clearTimeout(voiceTimer);speaking=null;continueAfterVoice();};
  u.onerror=()=>{if(speaking===u)retry()};
  try{speechSynthesis.resume();speechSynthesis.speak(u);voiceTimer=setTimeout(()=>{if(speaking===u&&!started)retry()},2500);}catch{retry()}
 }
 function unlockVoice(){offline?.unlockAudio();try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;window.speechSynthesis?.speak(u)}catch{}}
 function stopTracks(state){if(state){clearInterval(state.monitor);if(state.context&&state.context.state!=='closed')void state.context.close().catch(()=>{});state.context=null;}state?.stream?.getTracks().forEach(t=>t.stop());}
 function resetButtons(){for(const b of Object.values(buttons)){b.dataset.recording='false';b.setAttribute('aria-pressed','false');b.disabled=pending;}}
 function cancel(){conversation=false;revision++;abort?.abort();abort=null;pending=false;const state=recording;recording=null;if(state){state.cancelled=true;clearTimeout(state.timer);try{if(state.recorder?.state==='recording')state.recorder.stop()}catch{}stopTracks(state)}stopVoice();resetButtons();}
 async function translate(blob,lang,run){
  if(run!==revision)return;pending=true;resetButtons();status('Traduction en cours…');
  try{
   let result;
   const local=$('useOffline').checked||!navigator.onLine;
   if(local && typeof blob==="string")throw Error("La traduction écrite nécessite Internet.");
   if(local){if(!offline||!await offline.ready())throw Error('Téléchargez les langues avec Internet avant de traduire sans réseau.');status('Traduction sur le téléphone…');result=await offline.translate(blob,lang);}
   else{
    abort=new AbortController();const timer=setTimeout(()=>abort?.abort(),45000);
    try{const response=await fetch('/traducteur/api?lang='+lang,{method:'POST',headers:{'content-type':typeof blob==='string'?'text/plain;charset=utf-8':blob.type||'audio/mp4'},credentials:'same-origin',cache:'no-store',body:blob,signal:abort.signal});result=await response.json();if(!response.ok)throw Error(result.error||'Traduction indisponible.');}
    catch(error){if(run===revision&&error.name!=='AbortError'&&typeof blob!=='string'&&error instanceof TypeError&&offline&&await offline.ready()){status('Connexion coupée. Traduction sur le téléphone…');result=await offline.translate(blob,lang)}else throw error}
    finally{clearTimeout(timer);abort=null;}
   }
   if(run!==revision)return;
   if(!result?.text||!result?.translation)throw Error('Je n’ai rien entendu. Recommencez.');
   const target=lang==='fr'?'nl':'fr';nextLanguage=target;text(lang,result.text,false);text(target,result.translation,true);status('Traduction prête.');voice(target,result.translation);
  }catch(error){if(run===revision){conversation=false;status(error.name==='AbortError'?'La traduction prend trop de temps. Réessayez.':error.message||'Traduction indisponible.');}}
  finally{if(run===revision){pending=false;resetButtons()}}
 }
 async function start(lang,pointer){
  if(recording||pending||installing)return;
  stopVoice();
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status('Ce navigateur ne permet pas l’enregistrement. Ouvrez Couteau Suisse dans Safari ou Chrome.');return;}
  const run=++revision,state={lang,pointer,run,held:true,cancelled:false,chunks:[],started:0};recording=state;
  status('Autorisation du microphone…');buttons[lang].setAttribute('aria-pressed','true');
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   state.context=new Context();
   await state.context.resume();
   if(recording!==state)return;
   const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});state.stream=stream;
   if(recording!==state||!state.held||state.cancelled||run!==revision){stopTracks(state);if(run===revision)status('Micro autorisé. Maintenez le bouton pour parler.');return;}
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));
   const recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:64000});state.recorder=recorder;
   recorder.ondataavailable=e=>{if(e.data?.size)state.chunks.push(e.data)};
   recorder.onstop=()=>{stopTracks(state);if(state.cancelled||run!==revision)return;const blob=new Blob(state.chunks,{type:recorder.mimeType||mime||'audio/mp4'});state.chunks=[];if(Date.now()-state.started<350||blob.size<100){pending=false;status('Maintenez le bouton pendant votre phrase.');resetButtons();return;}void translate(blob,lang,run);};
   recorder.onerror=()=>{if(run===revision){cancel();status('Micro indisponible. Réessayez.');}};
   recorder.start();state.started=Date.now();buttons[lang].dataset.recording='true';status(lang==='nl'?'Ik luister…':'Je vous écoute…');
   const analyser=state.context.createAnalyser();analyser.fftSize=1024;
   state.context.createMediaStreamSource(stream).connect(analyser);
   const samples=new Float32Array(analyser.fftSize);
   let lastSpeech=null;
   state.monitor=setInterval(()=>{
    analyser.getFloatTimeDomainData(samples);
    let energy=0;for(const sample of samples)energy+=sample*sample;
    const now=performance.now();
    if(Math.sqrt(energy/samples.length)>0.016)lastSpeech=now;
    if(lastSpeech!==null&&now-lastSpeech>=2000)finish(pointer,false);
   },50);
   state.timer=setTimeout(()=>{cancel();status('Temps de micro écoulé. Touchez Parler pour reprendre.');},120000);
  }catch(error){if(recording===state){conversation=false;recording=null;resetButtons();status(error.name==='NotAllowedError'?'Autorisez le microphone dans les réglages de ce site, puis réessayez.':'Micro indisponible. Réessayez.');}stopTracks(state)}
 }
 function finish(pointer,cancelled){
  const state=recording;if(!state||state.pointer!==pointer)return;state.held=false;state.cancelled=cancelled;clearTimeout(state.timer);recording=null;
  if(state.recorder?.state==='recording'){if(!cancelled){pending=true;status('Traduction en cours…');}state.recorder.stop();}
  stopTracks(state);resetButtons();if(cancelled)status('Enregistrement annulé.');
 }
 for(const [lang,button] of Object.entries(buttons))button.onclick=()=>{
  cancel();conversation=true;nextLanguage=lang;void start(lang,'auto');
 };
 $('stopTurn').onclick=()=>{cancel();status('Conversation arrêtée.');};
 $('writeTurn').onclick=()=>{
  const lang=nextLanguage;
  const resume=conversation;cancel();
  const value=window.prompt(lang==='fr'?'Écrivez en français':'Schrijf in het Nederlands');
  if(value?.trim()){conversation=resume;void translate(value.trim(),lang,revision);}
  else if(resume){conversation=true;void start(lang,'auto');}
 };
 for(const lang of ['fr','nl'])$(lang==='fr'?'replayFr':'replayNl').onclick=()=>{
  const resume=conversation;cancel();conversation=resume;voice(lang,latest[lang]);
 };
 window.addEventListener('pagehide',()=>{cancel();offline?.dispose()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();offline?.dispose();status('Micro arrêté. Maintenez le bouton pour reprendre.');}});
 const dialog=$('languageDialog');
 $('languageSettings').onclick=()=>{cancel();dialog.showModal();void refreshPack()};$('closeLanguages').onclick=()=>{offline?.cancelDownload();dialog.close()};dialog.addEventListener('cancel',()=>{offline?.cancelDownload()});
 window.addEventListener('cs:preferences-restored',async()=>{
  const active=localStorage.getItem('cs-translator-local')==='1';
  $('useOffline').checked=!!(active&&offline&&await offline.ready());connection();
 });
 function connection(){const local=$('useOffline').checked||!navigator.onLine;$('connectionState').textContent=local?'Sans Internet · sur ce téléphone':'Avec Internet';}
 $('useOffline').onchange=()=>{try{localStorage.setItem('cs-translator-local',$('useOffline').checked?'1':'0')}catch{}connection()};window.addEventListener('online',connection);window.addEventListener('offline',connection);
 async function refreshPack(){
  if(!offline||installing)return;
  const ready=await offline.ready();if(installing)return;
  $('downloadLanguages').textContent=ready?'Langues et voix installées ✓':'Installer français + flamand';$('downloadLanguages').disabled=ready;$('offlineChoice').hidden=!ready;$('removeLanguages').hidden=!ready;
  if(!ready)$('useOffline').checked=false;
  $('packSize').textContent='Les deux langues et leurs voix : environ '+Math.ceil(offline.size/1000000)+' Mo. Wi-Fi conseillé. Les fichiers déjà téléchargés sont conservés en cas de coupure.';
  $('voiceStatus').textContent='Les voix française et flamande sont incluses. Aucune installation séparée dans les réglages du téléphone.';
  connection();
 }
 $('downloadLanguages').onclick=async()=>{
  if(!offline||installing)return;cancel();offline.unlockAudio();installing=true;$('downloadLanguages').disabled=true;$('downloadLanguages').textContent='Installation en cours…';$('removeLanguages').disabled=true;$('languageProgress').hidden=false;$('languageStatus').className='';
  try{await offline.install(p=>{$('languageProgress').value=p.percent;$('languageStatus').textContent=p.message});$('languageStatus').textContent='Installation terminée. Français, flamand et voix prêts sans Internet.';$('useOffline').checked=true;try{localStorage.setItem('cs-translator-local','1')}catch{}}
  catch(error){$('languageStatus').className='error';$('languageStatus').textContent=error.message||'Installation interrompue. Appuyez pour reprendre.';}
  finally{installing=false;$('removeLanguages').disabled=false;$('languageProgress').hidden=true;await refreshPack();}
 };
 $('removeLanguages').onclick=async()=>{if(installing)return;cancel();await offline.remove();$('useOffline').checked=false;try{localStorage.removeItem('cs-translator-local')}catch{}$('languageStatus').textContent='Langues supprimées de ce téléphone.';await refreshPack();};
 (async()=>{try{offline=(await import('/traducteur/offline.js?v=2')).offline;try{$('useOffline').checked=localStorage.getItem('cs-translator-local')==='1'}catch{}await refreshPack();if(new URLSearchParams(location.search).has('langues'))dialog.showModal();}catch{$('packSize').textContent='Installation indisponible pour le moment.';$('downloadLanguages').disabled=true;}})();
 window.speechSynthesis?.addEventListener?.('voiceschanged',()=>void refreshPack());connection();
})();