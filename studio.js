'use strict';
const terms = new Map(WORDS.map(w => [w.id,w]));
const navs = [['studio','compass','Lernstudio'],['library','book-open','Wortschatz'],['test','clipboard-list','Probetest'],['progress','chart-no-axes-column','Lernstand']];
const worldStyle = {
  london: ['bus-front', '#eadfff', '#6134aa'],
  country: ['trees', '#ceefe1', '#176747'],
  phone: ['phone-call', '#ffe0d1', '#943e22'],
  stories: ['notebook-pen', '#d9e9fe', '#29588c']
};
const integration=window.LERNSTUDIO_EMBED||null;
const KEY='folio-studio-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>'<i class="icon" aria-hidden="true" data-lucide="'+n+'"></i>';
const act=(a,label,style='btn',id='')=>'<button class="'+style+'" data-action="'+a+'" data-id="'+esc(id)+'">'+label+'</button>';
const main=document.querySelector('#main');
let storageOK=true;
function read(key){if(integration)return key===KEY?integration.readState():null;try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function initial(){
  const data=read(KEY);
  if(data?.version===1 && data.cards && Array.isArray(data.history))return data;
  const old=read('eng-v2');
  const state={version:1,mode:old?.mode==='paper'?'paper':'type',cards:{},history:[],session:null,notes:old?.notes||'',previous:0};
  for(const [id,value] of Object.entries(old?.words||{}))if(terms.has(id)&&value.learned){
    state.cards[id]={introduced:true};state.previous++;
  }
  return state;
}
const state=initial();
function save(){if(integration){integration.saveState(state);return}try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true}catch{if(storageOK)notify('Dieser Browser kann den Lernstand gerade nur für diese Sitzung behalten.');storageOK=false}}
const item=id=>state.cards[id]??(state.cards[id]={});
function day(t){return new Date(t).toLocaleDateString('sv-SE')}
function secure(c){return c?.write==='ok' && (c.validated||[]).length>=2}
function status(id){const c=state.cards[id];if(secure(c))return 'An zwei Tagen gekonnt';if(c?.write==='retry')return 'Weiter üben';if(c?.write==='ok')return 'Selbst gewusst';return c?.done?'Geübt':'Offen'}
function normalize(s){return s.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/…|\.{2,}/g,' ').replace(/\b(i|we|they|you)'ve\b/g,'$1 have').replace(/\b(he|she)\x27s (?=found|started|met)/g,'$1 has ').replace(/\b(who|this|that)'s\b/g,'$1 is').replace(/you're/g,'you are').replace(/don't/g,'do not').replace(/hasn't/g,'has not').replace(/haven't/g,'have not').replace(/mustn't/g,'must not').replace(/needn't/g,'need not').replace(/[.!?,:;]/g,'').replace(/\s+/g,' ').trim()}
function correct(w,v){const n=normalize(v);return w.ans.some(a=>normalize(a)===n)}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function rank(id){const c=state.cards[id];if(!c?.introduced)return 1;if(c.write==='retry')return !c.last||Date.now()-c.last>10*60000?0:4;if(!c.last||Date.now()-c.last>16*3600000)return 2;return 3}
function select(ids,n){return [...ids].sort((a,b)=>rank(a)-rank(b)||(state.cards[a]?.last||0)-(state.cards[b]?.last||0)).slice(0,n)}
// Kapitel-Fortschritt: Eine Wortkarte ist geschafft, wenn er sie in einer Runde selbst richtig geschrieben hat.
const doneIn=w=>w.ids.filter(id=>state.cards[id]?.done).length;
const openIn=w=>w.ids.length-doneIn(w);
const bar=(d,n)=>'<span class="minitrack" aria-hidden="true"><i style="width:'+Math.round(d/n*100)+'%"></i></span>';
let page='studio', filter='all', query='', playing=null, noticeTimer;
const session=()=>state.session;
function notify(msg){const el=document.querySelector('#notice');el.textContent=msg;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.textContent='',3500)}
function stopAudio(){
  const previous=playing;playing=null;
  if(previous){previous.pause();previous.remove()}
  document.querySelector('[data-playing]')?.removeAttribute('data-playing');
}
function play(id,kind='word',rate=1,button){
  stopAudio();
  const audio=document.createElement('audio');
  playing=audio;audio.hidden=true;audio.setAttribute('playsinline','');
  for(const [extension,type] of [['m4a','audio/mp4'],['wav','audio/wav']]){
    const source=document.createElement('source');
    source.src='audio/'+id+'-'+kind+'.'+extension;source.type=type;audio.append(source);
  }
  document.body.append(audio);audio.defaultPlaybackRate=rate;audio.playbackRate=rate;
  audio.addEventListener('playing',()=>{if(playing===audio)button?.setAttribute('data-playing','')});
  audio.addEventListener('ended',()=>{if(playing===audio)stopAudio()});
  const failed=()=>{
    if(playing!==audio)return;
    stopAudio();notify('Die Aufnahme konnte nicht abgespielt werden. Öffne das Lernstudio in Safari oder Chrome.');
  };
  audio.lastElementChild.addEventListener('error',failed);
  audio.addEventListener('error',failed);
  audio.play().catch(failed);
}
function audioButtons(w){return '<div class="actions">'+act('audio',icon('volume-2')+' Anhören','ghost',w.id)+act('slow',icon('snail')+' Langsam','ghost',w.id)+'</div>'}
const countLabel=n=>n===1?'1 Wortkarte':n+' Wortkarten';
function shell(title,html){
  releaseRecording();
  document.body.classList.toggle('focused',page==='run');
  const navigation=navs.map(([id,ic,label])=>`<button class="navitem ${page===id?'active':''}" ${page===id?'aria-current="page"':''} data-action="nav" data-id="${id}">${icon(ic)}${label}</button>`).join('');
  document.querySelector('#rail').innerHTML=`<div class="navwrap">
    <button class="brand" data-action="nav" data-id="studio" aria-label="Zur Startseite des Lernstudios"><span class="brandmark">${icon('layers-3')}</span><strong>Lernstudio</strong></button>
    <nav aria-label="Hauptmenü">${navigation}</nav>
    <button class="parentbtn${page==='parents'?' active':''}" ${page==='parents'?'aria-current="page"':''} data-action="nav" data-id="parents">${icon('user-round-cog')}<span>Für Eltern</span></button>
  </div>`;
  main.innerHTML='<div class="wrap">'+html+'</div>';
  lucide.createIcons();
}
function intro(h,p=''){return '<header class="intro"><h1>'+h+'</h1>'+(p?'<p>'+p+'</p>':'')+'</header>'}
function stamp(id){const [ic,bg,fg]=worldStyle[id];return '<span class="stamp" style="--shade:'+bg+';--tone:'+fg+'">'+icon(ic)+'</span>'}
function home(){
  const s=session()?.phase==='done'?null:session(), done=Object.values(state.cards).filter(c=>c.introduced).length;
  const worlds=SCENES.map((w,i)=>{const d=doneIn(w),n=w.ids.length,full=d===n;return `<button class="tile${full?' tile-done':''}" data-action="world" data-id="${w.id}">
    <span class="tile-top">${stamp(w.id)}<span class="tile-arrow">${icon(full?'check':'arrow-up-right')}</span></span>
    <span class="caption">Kapitel ${i+1}</span><strong>${esc(w.name)}</strong>
    <span class="caption">${full?'Kapitel geschafft!':d+' von '+n+' geschafft · noch '+(n-d)+' offen'}</span>${bar(d,n)}
  </button>`}).join('');
  const target=SCENES.find(w=>openIn(w)>0)||SCENES[0], targetNo=SCENES.indexOf(target)+1;
  const totalOpen=SCENES.reduce((n,w)=>n+openIn(w),0);
  const london=s?s.world==='london':target.id==='london';
  const artWorld=s?s.world:target.id;
  const art=london?'<img class="hero-art" src="assets/london-studio.jpg" alt="">':`<div class="resume-art" aria-hidden="true">${icon(artWorld?worldStyle[artWorld][0]:'book-open')}</div>`;
  shell('Lernstudio',`<header class="intro home-intro"><div><h1>Dein Lernstudio</h1><p>Englisch aus deinem Schulbuch · Seiten 154–156</p></div></header>
    <section class="hero">${art}<div class="hero-content"><div class="eyebrow">${icon('headphones')}${s?'Deine offene Runde':'Kapitel '+targetNo+' von '+SCENES.length}</div>
    <h2>${s?esc(s.label):esc(target.name)}</h2><p>${s?'Mach an der Stelle weiter, an der du aufgehört hast.':totalOpen?'Noch '+openIn(target)+' von '+target.ids.length+' Wortkarten offen. Eine Runde hat drei Wortkarten.':'Alle Kapitel geschafft! Wiederhol, was du magst.'}</p>
    ${act(s?'resume':'world',(s?'Runde fortsetzen':'Runde starten')+icon('arrow-right'),'btn',target.id)}</div></section>
    <ol class="howto"><li><b>Ansehen und anhören:</b> Du siehst das Wort und tippst auf „Anhören“.</li><li><b>Selbst schreiben:</b> Du schreibst das Wort auf Englisch. Wörter, die du schon geübt hast, schreibst du gleich aus dem Kopf.</li><li><b>Grüner Haken:</b> Richtig! Wenn nicht, zeigt dir die App, wo der Fehler ist, und hilft dir.</li></ol>
    <div class="section-head"><h2>Deine Kapitel</h2><span class="caption">${totalOpen?'Noch '+totalOpen+' Wortkarten offen':'Alles geschafft'}</span></div>
    <div class="worlds">${worlds}</div>
    <div class="studiofoot"><div class="row"><span class="collection-icon">${icon('library-big')}</span><div><b>Dein Wortschatz</b><p>${done} von ${WORDS.length} Karten kennengelernt</p></div></div>
    ${act('nav','Alle Karten '+icon('arrow-right'),'textbtn','library')}</div>`);

}
function rows(){
  const q=query.toLocaleLowerCase().trim();
  const results=WORDS.filter(w=>(filter==='all'||String(w.page)===filter)&&(w.en+' '+w.de+' '+w.prompt).toLowerCase().includes(q));
  return '<p class="caption">'+countLabel(results.length)+'</p>'+results.map(w=>'<div class="wordrow">'+act('audio',icon('volume-2')+'<span class="sr">Anhören: '+esc(w.en)+'</span>','iconbtn',w.id)+'<div><strong lang="en">'+esc(w.en)+'</strong><small>'+esc(w.de)+' · S. '+w.page+'</small></div><span class="tag">'+status(w.id)+'</span>'+act('single','Üben','ghost',w.id)+'</div>').join('')+(results.length?'':'<p class="helper">Für diese Suche gibt es keinen Treffer.</p>');
}
function library(){
  shell('Wortschatz',intro('Dein Wortschatz','Finde eine Karte, hör sie an oder übe sie einzeln.')+'<div class="panel stack"><label><b>Wort suchen</b><input class="search" id="search" value="'+esc(query)+'" placeholder="Englisch oder Deutsch" type="search"></label><div class="pills">'+['all','154','155','156'].map(x=>act('filter',x==='all'?'Alle Seiten':'Seite '+x,'pill '+(x===filter?'on':''),x)).join('')+'</div><div class="list" id="wordlist">'+rows()+'</div></div>');
}
function testView(){shell('Probetest',intro('Dein Probetest','Wie viel kannst du schon selbst schreiben?')+'<section class="panel test-cover"><div class="eyebrow">'+icon('clipboard-list')+' Schriftlich · 9 Aufgaben</div><h2>Drei Seiten, eine Stichprobe.</h2><p>Je drei zufällige Aufgaben von Seite 154, 155 und 156. Auch bisher offene Wörter können vorkommen. Die Lösungen siehst du am Ende.</p>'+modes()+'<div class="actions">'+act('probe','Probetest starten '+icon('arrow-right'))+'<a class="ghost" href="lernblatt-englisch-test.html">'+icon('printer')+' Druckstudio</a></div></section>')}
function modes(){return '<p class="mode-label">Wie möchtest du schreiben?</p><div class="pills">'+[['type','keyboard','Tastatur'],['paper','pencil','Papier']].map(([k,i,l])=>act('mode',icon(i)+' '+l,'pill '+(state.mode===k?'on':''),k)).join('')+'</div>'}
// Drei Stufen, überall gleich benannt: geübt → selbst gewusst → an zwei Tagen gekonnt
const practised=c=>!!c?.done, known=c=>c?.write==='ok';
function progress(){
  const cards=Object.values(state.cards), tricky=WORDS.filter(w=>state.cards[w.id]?.write==='retry');
  const facts=[[cards.filter(practised).length+'/'+WORDS.length,'Wörter geübt'],[cards.filter(known).length,'Selbst gewusst'],[cards.filter(secure).length,'An zwei Tagen gekonnt']];
  shell('Lernstand',intro('Dein Lernstand','Hier siehst du, was schon klappt und was wieder dran ist.')+'<div class="stack"><div class="stats">'+facts.map(([n,t])=>'<div class="stat"><strong>'+n+'</strong><span>'+t+'</span></div>').join('')+'</div><section class="panel stack"><h2>Weiter üben</h2><p>'+ (tricky.length?tricky.map(w=>'<b lang="en">'+esc(w.en)+'</b>').join(' · '):'Hier erscheinen Wörter, für die du zuletzt Hilfe gebraucht hast.')+'</p>'+(tricky.length?'<div>'+act('retry','Kurze Wiederholung starten '+icon('arrow-right'))+'</div>':'')+'</section></div>');
}
function parents(){
  const tests=state.history.filter(h=>h.test).slice(-5).reverse();
  const chapters=SCENES.map((w,i)=>{const cs=w.ids.map(id=>state.cards[id]);return '<tr><td>'+(i+1)+'. '+esc(w.name)+'</td><td>'+cs.filter(practised).length+' / '+w.ids.length+'</td><td>'+cs.filter(known).length+'</td><td>'+cs.filter(secure).length+'</td></tr>'}).join('');
  shell('Für Eltern',intro('Für Eltern','Einstellungen, Ergebnisse und Druckvorlagen an einem Ort.')+'<div class="stack">'
    +'<section class="panel stack"><h2>Stand nach Kapiteln</h2><div class="tablewrap"><table class="overview"><thead><tr><th>Kapitel</th><th>Geübt</th><th>Selbst gewusst</th><th>An zwei Tagen gekonnt</th></tr></thead><tbody>'+chapters+'</tbody></table></div>'
    +'<ul class="legend"><li><b>Geübt:</b> in einer Runde richtig geschrieben, nachdem das Wort gezeigt wurde.</li><li><b>Selbst gewusst:</b> beim ersten Versuch richtig, ohne dass das Wort vorher gezeigt wurde (spätere Runde, Wiederholung oder Probetest).</li><li><b>An zwei Tagen gekonnt:</b> selbst gewusst an zwei Tagen mit mindestens 16 Stunden Abstand.</li></ul>'
    +(state.previous?'<p class="caption">'+state.previous+' Wörter aus dem bisherigen Trainer wurden übernommen.</p>':'')+'</section>'
    +'<section class="panel stack"><h2>Letzte Probetests</h2>'+(tests.length?tests.map(t=>'<p>'+new Date(t.time).toLocaleDateString('de-DE')+' · <b>'+t.score+' von '+t.total+'</b> richtig</p>').join(''):'<p class="muted">Noch kein Probetest gemacht.</p>')+'</section>'
    +'<section class="panel stack"><h2>Einstellungen</h2>'+modes()+'<p class="caption">Bei Papier vergleicht ihr die Schreibweise selbst und bestätigt sie in der App.</p></section>'
    +'<section class="panel stack"><h2>Eure Beobachtungen</h2><label><span class="sr">Eure Beobachtungen</span><textarea id="notes" rows="4" placeholder="Was hat geholfen? Was war schwer?">'+esc(state.notes)+'</textarea></label><p class="caption">Bleibt nur auf diesem Gerät gespeichert.</p></section>'
    +'<section class="panel stack"><h2>Drucken</h2><p>Wortlisten, Schreibblätter und einen Probetest mit Lösungen auf Papier.</p><div><a class="btn" href="lernblatt-englisch-test.html">'+icon('printer')+' Druckstudio öffnen</a></div></section>'
    +'</div>');
}
function navigate(id){page=id;stopAudio();render();window.scrollTo(0,0);main.focus({preventScroll:true})}
function render(){({studio:home,library,test:testView,progress,parents,run:runView,replace:replaceView})[page]()}
function proposed(action,id){
  if(action==='probe'){
    const ids=shuffle([154,155,156].flatMap(p=>shuffle(WORDS.filter(w=>w.page===p)).slice(0,3).map(w=>w.id)));
    return {ids,label:'Probetest',test:true};
  }
  if(action==='single')return {ids:[id],label:'Ein Wort üben'};
  if(action==='retry')return {ids:select(WORDS.filter(w=>state.cards[w.id]?.write==='retry').map(w=>w.id),3),label:'Wiederholung'};
  const world=SCENES.find(s=>s.id===id);return {ids:select(world.ids,3),label:world.name,world:id};
}
let pending=null;
function begin(options){
  if(!options.ids.length)return;
  if(state.session?.phase==='done')state.session=null;
  if(state.session){pending=options;navigate('replace');return}
  install(options);
}
function install(o){
  // Ohne „Kennst du das schon?“: jedes neue Wort startet direkt mit Entdecken und Hören, geschrieben wird am Rundenende.
  const listen=id=>({kind:'listen',id,choices:shuffle([id,...shuffle(WORDS.filter(x=>x.id!==id&&x.de!==terms.get(id).de)).slice(0,2).map(x=>x.id)])});
  // solo: Das Wort wurde in dieser Runde vorher nicht gezeigt. Nur dann zählt ein richtiger erster Versuch als „selbst gewusst“.
  // In Kapitelrunden kommen schon geübte Wörter deshalb direkt zum Schreiben, neue Wörter weiterhin erst zum Ansehen.
  const steps=o.test?o.ids.map(id=>({kind:'test',id}))
    :o.label==='Wiederholung'?o.ids.map(id=>({kind:'write',id,solo:true}))
    :o.world?o.ids.flatMap(id=>practised(state.cards[id])?[{kind:'write',id,solo:true}]:[{kind:'learn',id},{kind:'write',id}])
    :o.ids.flatMap(id=>[{kind:'learn',id},{kind:'write',id}]);
  // Einfach gehalten: pro Wort nur ansehen/anhören, dann selbst schreiben. Keine Zusatzaufgaben.
  const finalIds=[];
  state.session={...o,runId:integration?integration.newRunId():undefined,steps,index:0,phase:'ask',draft:'',results:{},finalIds,mode:state.mode};pending=null;save();navigate('run');
}
function replaceView(){shell('Rundenwechsel',intro('Eine Runde ist noch offen.')+'<div class="panel stack"><p>Du kannst „'+esc(session().label)+'“ fortsetzen oder „'+esc(pending.label)+'“ beginnen. Bisher gespeicherte Lernergebnisse bleiben erhalten.</p><div class="actions">'+act('resume','Offene Runde fortsetzen')+act('replace','Neue Runde beginnen','ghost')+'</div></div>')}
function current(){return session()?.steps[session().index]}
function record(w,ok,independent){
  const c=item(w.id);c.introduced=true;c.last=Date.now();
  if(!ok){c.write='retry';c.validated=[];return}
  if(!independent)return;
  c.write='ok';const days=c.validated??=[];
  if(!days.length||(day(days.at(-1))!==day(c.last)&&c.last-days.at(-1)>=16*3600000))days.push(c.last);
  c.validated=days.slice(-2);
}
function advance(){
  const s=session();s.index++;s.phase='ask';s.draft='';s.chosen=null;s.result=null;s.helped=false;s.attempt='';s.wrong=0;s.retryWrong=0;s.lastWrong='';stopAudio();
  if(s.index===s.steps.length){
    if(!s.test && s.finalIds.length){s.steps.push(...shuffle(s.finalIds).map(id=>({id,kind:'write'})));s.finalIds=[]}
    else if(s.test && s.mode==='paper'&&!s.checked){s.steps.push(...s.ids.map((id,i)=>({id,kind:'grade',number:i+1})));s.checked=true}
    else {s.phase='done';state.history.push({runId:s.runId,time:Date.now(),test:!!s.test,world:s.world,score:Object.values(s.results).filter(r=>r==='known').length,total:s.ids.length});}
  }
  save();render();
}
function assess(ok){
  const s=session(),step=current(),w=terms.get(step.id);
  if(step.kind==='test'||step.kind==='grade'){
    s.results[w.id]=ok?'known':'again';record(w,ok,true);advance();return;
  }
  const fresh=step.kind==='check', solo=fresh||(step.solo&&!s.wrong);
  record(w,ok,solo);
  if(ok){
    item(w.id).done=true;
    s.results[w.id]=solo?'known':step.again?'later':'practised';
    s.result=true;s.phase='feedback';save();render();return;
  }
  s.results[w.id]='again';
  if(fresh){
    const distractors=shuffle(WORDS.filter(x=>x.id!==w.id && x.de!==w.de)).slice(0,2);
    s.steps.splice(s.index+1,0,{kind:'learn',id:w.id},{kind:'listen',id:w.id,choices:shuffle([w,...distractors].map(x=>x.id))});s.finalIds.push(w.id);
    s.result=false;s.phase='feedback';save();render();return;
  }
  // Nicht gewusst oder falsch geschrieben: Lösung zeigen, selbst einmal richtig schreiben,
  // am Ende der Runde noch einmal ohne Hilfe. Die Aufgabe wird nicht übersprungen.
  s.wrong=(s.wrong||0)+1;s.lastWrong=s.draft;if(s.mode==='paper')s.draft='';
  s.phase='ask';save();render();
}
// Rote Meldung bei falscher Antwort; ab dem 2. Versuch ein kleiner Tipp
// Rote Meldung bei falscher Antwort: zeigt genau, WO der Fehler ist, ohne die Lösung zu verraten
function bestAlign(w,attempt){
  const given=plain(attempt);let best=null;
  for(const t of w.ans)for(const goal of new Set([plain(t),normalize(t)])){const r=alignLetters(given,goal);if(!best||r.dist<best.dist)best={...r,goal}}
  return best;
}
function wrongBox(w,n,paper,attempt){
  let detail='';
  if(paper){
    if(n>=2){const count=w.en.replace(/[^a-z]/gi,'').length;detail='<span class="hint">Tipp: Das Wort hat '+count+' Buchstaben.</span>'}
  }else if(attempt&&attempt.trim()){
    // Vertauschte Nachbarbuchstaben (z. B. chruch, bougth) eigens erkennen
    const g=plain(attempt);let swap=-1;
    for(const t of w.ans)for(const goal of new Set([plain(t),normalize(t)])){
      if(goal.length!==g.length||goal===g)continue;
      const diff=[...g].map((c,k)=>c!==goal[k]?k:-1).filter(k=>k>=0);
      if(diff.length===2&&diff[1]===diff[0]+1&&g[diff[0]]===goal[diff[1]]&&g[diff[1]]===goal[diff[0]])swap=diff[0];
    }
    if(swap>=0){
      const tiles=[...g].map((c,k)=>c===' '?'<span class="lt sp"></span>':'<span class="lt'+(k===swap||k===swap+1?' bad-sub':'')+'">'+esc(c)+'</span>').join('');
      return '<div class="wrongbox" role="alert">'+icon('x')+'<div><b>Noch nicht richtig.</b> Probier es nochmal.<br><span class="hint">Zwei Buchstaben sind vertauscht.</span><span class="cmp-row mine">'+tiles+'</span></div></div>';
    }
    const {ops,goal}=bestAlign(w,attempt);
    const subs=[],extras=[];let missing=0,apos=0,pos=0;
    const tiles=ops.map(o=>{
      if(o.a!==null&&o.a!==' ')pos++;
      if(o.a!==null&&o.b!==null){if(o.ok)return o.a===' '?'<span class="lt sp"></span>':'<span class="lt">'+esc(o.a)+'</span>';subs.push(pos);return '<span class="lt bad-sub">'+esc(o.a)+'</span>'}
      if(o.a!==null){if(o.a===' ')return '<span class="lt sp"></span>';extras.push(pos);return '<span class="lt bad">'+esc(o.a)+'</span>'}
      if(o.b===' ')return '<span class="lt sp"></span>';
      if(o.b==="'")apos++;else missing++;
      return '<span class="lt gap" aria-label="hier fehlt etwas">?</span>';
    }).join('');
    const total=subs.length+extras.length+missing+apos;
    let msg;
    if(total>Math.max(3,goal.replace(/ /g,'').length*0.6))msg='Das ist noch ein anderes Wort.';
    else if(total===1&&subs.length)msg='Der '+subs[0]+'. Buchstabe stimmt nicht.';
    else if(total===1&&extras.length)msg='Ein Buchstabe ist zu viel.';
    else if(total===1&&missing)msg='Da fehlt ein Buchstabe.';
    else if(total===1&&apos)msg='Da fehlt ein Apostroph (\').';
    else msg=total+' Stellen stimmen noch nicht.';
    detail='<span class="hint">'+esc(msg)+'</span><span class="cmp-row mine">'+tiles+'</span>';
  }
  return '<div class="wrongbox" role="alert">'+icon('x')+'<div><b>Noch nicht richtig.</b> '+(paper?'Probier es nochmal auf deinem Papier.':'Probier es nochmal.')+(detail?'<br>'+detail:'')+'</div></div>';
}
function needHelp(){
  const s=session(),st=current(),w=terms.get(st.id);
  record(w,false);s.results[w.id]='again';s.attempt=s.lastWrong||'';s.draft='';s.phase='help';save();render();
}
function skipTask(){
  const s=session(),st=current(),w=terms.get(st.id);
  record(w,false);if(!(w.id in s.results)||s.results[w.id]!=='later')s.results[w.id]='again';
  if(!st.again&&!st.queued){s.steps.push({kind:'write',id:st.id,again:true});st.queued=true;notify('Kein Problem. Das Wort kommt am Ende der Runde noch einmal.')}
  advance();
}
function retryResult(ok){
  const s=session(),st=current();
  if(ok){
    if(!st.again&&!st.queued){s.steps.push({kind:'write',id:st.id,again:true});st.queued=true}
    s.helped=true;s.result=true;s.phase='feedback';save();render();return;
  }
  s.retryWrong=(s.retryWrong||0)+1;if(s.mode==='paper')s.draft='';s.phase='retry';save();render();
}
function finishHelp(){
  const s=session(),st=current();
  if(!st.again)s.steps.push({kind:'write',id:st.id,again:true});
  notify(st.again?'Gut abgeschrieben. Morgen kommt das Wort wieder.':'Gut. Am Ende der Runde kommt das Wort noch einmal ohne Hilfe.');
  s.attempt='';advance();
}
function goBack(){
  const s=session();if(!s||s.index===0)return;
  s.index--;s.phase='ask';s.draft='';s.chosen=null;s.result=null;s.attempt='';s.wrong=0;s.retryWrong=0;s.lastWrong='';stopAudio();save();render();
}
function postpone(){
  const s=session();
  if(s.index>=s.steps.length-1&&s.finalIds.length){s.steps.push(...shuffle(s.finalIds).map(id=>({id,kind:'write'})));s.finalIds=[]}
  if(s.index>=s.steps.length-1){notify('Das ist die letzte offene Aufgabe dieser Runde.');return}
  const [st]=s.steps.splice(s.index,1);s.steps.push(st);
  s.phase='ask';s.draft='';s.chosen=null;s.result=null;s.attempt='';stopAudio();
  notify('Kommt am Ende der Runde noch einmal.');save();render();
}
function summary(){
  const s=session();
  const good=id=>['known','practised','later'].includes(s.results[id]);
  const score=s.ids.filter(good).length;
  const lines=s.ids.map(id=>'<div class="resultline"><span><b lang="en">'+esc(terms.get(id).en)+'</b>'+(s.test&&s.answers?.[id]!==undefined&&!good(id)?'<br><small>Deine Antwort: '+esc(s.answers[id]||'ausgelassen')+'</small>':'')+'</span><span class="'+(good(id)?'ok':'again')+'">'+(good(id)?icon('check'):'kommt nochmal')+'</span></div>').join('');
  let next='',primary=act('finish','Fertig '+icon('arrow-right'),'btn big'),side='';
  if(s.world){
    const i=SCENES.findIndex(x=>x.id===s.world),w=SCENES[i],open=openIn(w),after=SCENES[i+1];
    const target=open?w:(after&&openIn(after)?after:SCENES.find(x=>openIn(x)>0));
    const others=SCENES.filter(x=>x.id!==w.id&&openIn(x)>0).map(x=>esc(x.name)+': '+openIn(x)).join(' · ');
    next='<p class="caption center">'+(open?'Kapitel „'+esc(w.name)+'“: noch '+open+' Wörter offen':'Kapitel „'+esc(w.name)+'“ geschafft ✓')+'</p>'
      +(others?'<p class="caption center">Noch offen · '+others+'</p>':'')
      +(open&&after?'<div class="actions center">'+act('world','Lieber zum nächsten Kapitel','textbtn',after.id)+'</div>':'');
    if(target){primary=act('world','Nächste Runde '+icon('arrow-right'),'btn big',target.id);side=act('finish',icon('house')+' Fertig für jetzt','ghost')}
  }
  return {html:'<div class="panel exercise stack">'+(score?'<div class="success" role="img" aria-label="Geschafft">'+icon('check')+'</div>':'')+'<h2 class="center">'+(s.test?'Dein Ergebnis':score?'Runde geschafft!':'Runde beendet')+'</h2><p class="large center">'+score+' von '+s.ids.length+' richtig geschrieben</p>'+lines+next+'</div>',primary,side};
}
// Feste Leiste unten in der Runde: rechts (Handy: oben, ganze Breite) immer der eine Hauptknopf,
// daneben klein „Zurück“ und, wo es etwas anderes bewirkt, „Überspringen“.
function runbar(primary,side){
  if(!primary&&!side)return '';
  return '<div class="runbar"><div class="runbar-in">'+(primary?'<div class="runbar-main">'+primary+'</div>':'')+(side?'<div class="runbar-side">'+side+'</div>':'')+'</div></div>';
}
// Ein Punkt pro Wort der Runde: gefüllt = erledigt, Ring = gerade dran, grau = kommt noch
function dots(s,st){
  const cur=s.ids.indexOf(st.id);
  return '<div class="dots" role="img" aria-label="Wort '+(cur+1)+' von '+s.ids.length+'">'+s.ids.map(id=>{
    const k=id===st.id?'cur':s.steps.slice(s.index).some(x=>x.id===id)||s.finalIds.includes(id)?'':'done';
    return '<span class="dot '+k+'"></span>';
  }).join('')+'</div>';
}
function highlight(w){const bits=(w.hl||[]).filter(x=>w.en.includes(x));if(!bits.length)return esc(w.en);let t=w.en,html='';while(t.length){const hit=bits.find(x=>t.startsWith(x));html+=hit?'<mark>'+esc(hit)+'</mark>':esc(t[0]);t=t.slice(hit?hit.length:1)}return html}
// Vergleich Buchstabe für Buchstabe: Was hat er geschrieben, was fehlt, was ist anders?
const plain=t=>String(t).toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?,:;]/g,'').replace(/\s+/g,' ').trim();
function alignLetters(a,b){
  const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>{const r=new Array(n+1).fill(0);r[0]=i;return r});
  for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  const ops=[];let i=m,j=n;
  while(i>0||j>0){
    if(j>0&&d[i][j]===d[i][j-1]+1){ops.push({a:null,b:b[j-1]});j--}
    else if(i>0&&j>0&&d[i][j]===d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){ops.push({a:a[i-1],b:b[j-1],ok:a[i-1]===b[j-1]});i--;j--}
    else{ops.push({a:a[i-1],b:null});i--}
  }
  return {ops:ops.reverse(),dist:d[m][n]};
}
function spellingHelp(w,attempt){
  const given=plain(attempt);
  let best=null;for(const t of w.ans)for(const goal of new Set([plain(t),normalize(t)])){const r=alignLetters(given,goal);if(!best||r.dist<best.dist)best=r}
  const ops=best.ops,tile=(c,cls)=>c===' '?'<span class="lt sp"></span>':'<span class="lt'+(cls?' '+cls:'')+'">'+esc(c)+'</span>';
  const mine=ops.filter(o=>o.a!==null).map(o=>tile(o.a,o.ok?'':'bad')).join('');
  const right=ops.filter(o=>o.b!==null).map(o=>tile(o.b,o.ok?'':'miss')).join('');
  const missing=ops.filter(o=>o.a===null).map(o=>o.b).filter(c=>/[a-z]/i.test(c));
  const apostrophe=ops.some(o=>o.a===null&&o.b==="'");
  const wrong=ops.filter(o=>o.a!==null&&!o.ok).length;
  const startOk=ops.length&&ops[0].ok;
  const extra=ops.filter(o=>o.b===null).length;
  let msg;
  if(!wrong&&!missing.length&&apostrophe)msg='Fast! Es fehlt nur der Apostroph (\').';
  else if(best.dist===1&&missing.length===1)msg='Fast! Es fehlt nur ein Buchstabe: '+missing[0];
  else if(best.dist===1&&extra===1)msg='Fast! Ein Buchstabe ist zu viel.';
  else if(best.dist===1)msg='Fast! Nur ein Buchstabe ist anders.';
  else if(!wrong&&missing.length)msg=(startOk?'Guter Anfang! ':'')+(missing.length===1?'Es fehlt noch 1 Buchstabe: ':'Es fehlen noch '+missing.length+' Buchstaben: ')+missing.join(' ')+(apostrophe?' und ein Apostroph (\')':'');
  else if(best.dist<=2)msg='Fast! Nur zwei Buchstaben sind anders.';
  else msg='Schau dir die grünen Buchstaben an. Die fehlen noch oder sind anders.';
  return '<div class="cmp"><p class="cmp-msg">'+icon('lightbulb')+'<span>'+esc(msg)+'</span></p>'
    +'<p class="cmp-label">Du hast geschrieben</p><div class="cmp-row">'+(mine||'<span class="caption">nichts</span>')+'</div>'
    +'<p class="cmp-label">Richtig ist</p><div class="cmp-row">'+right+'</div></div>';
}
function runView(){
  const s=session();if(!s){navigate('studio');return}
  if(s.phase==='done'){const r=summary();shell(s.label,'<section class="training">'+r.html+'</section>'+runbar(r.primary,r.side));return}
  const st=current(),w=terms.get(st.id),paper=s.mode==='paper';
  const bad=(s.phase==='retry'?s.retryWrong:s.wrong)?' wrong':'';
  const lab={check:'Schon bekannt?',learn:'Entdecken',listen:'Hörverständnis',write:'Aus dem Kopf',test:'Probetest',grade:'Papier vergleichen',scene:'Vor Ort'}[st.kind];
  // Pro Bildschirm genau ein Hauptknopf (primary) in der festen Leiste unten.
  const go=(a,label)=>act(a,label+' '+icon('arrow-right'),'btn big');
  const check=label=>'<button type="submit" form="writing" class="btn big">'+label+' '+icon('check')+'</button>';
  const field='<form id="writing"><label class="sr" for="draft">Deine englische Antwort</label><input class="entry'+bad+'" id="draft" lang="en" value="'+esc(s.draft)+'" placeholder="Hier schreiben …" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></form>';
  const pair=(yes,no,yl,nl)=>'<div class="choicepair">'+act(yes,icon('check')+' '+yl,'answer yes')+act(no,icon('rotate-ccw')+' '+nl,'answer no')+'</div>';
  let inner='',primary='';
  if(st.kind==='scene'){
    inner='<h2>Vor Ort</h2><p class="large">'+esc(st.question)+'</p>';
    if(s.chosen){inner+='<div class="helper">'+(s.chosen===st.answer?'Genau. ':'Hier passt: ')+esc(st.answer)+'</div>';primary=go('next','Weiter')}
    else inner+='<div class="choices">'+st.options.map(opt=>act('scene',esc(opt),'answer',opt)).join('')+'</div>';
  }else if(st.kind==='grade'||s.phase==='compare'){
    inner='<h2 lang="en">'+highlight(w)+'</h2><p>Vergleiche '+(st.kind==='grade'?'Antwort '+st.number:'deine Antwort')+' auf dem Papier. Stimmen die Wörter und die Schreibweise?</p>'+(w.ans.length>1?'<details><summary>Weitere passende Formen</summary>'+w.ans.slice(1).map(esc).join(' · ')+'</details>':'')+pair('yes','no','Stimmt überein','Noch üben');
  }else if(s.phase==='help'){
    inner='<h2>'+esc(w.prompt)+'</h2><p>So schreibt man es:</p><p class="solution" lang="en">'+highlight(w)+'</p>'+audioButtons(w)
      +(s.attempt?spellingHelp(w,s.attempt):'')+(w.tip?'<div class="tipbox">'+icon('sparkles')+'<span><b>Merkhilfe:</b> '+esc(w.tip)+'</span></div>':'')
      +'<p><b>Merk dir das Wort.</b> Dann deckst du es ab und schreibst es selbst.</p>';
    primary=go('cover','Ich hab’s mir gemerkt');
  }else if(s.phase==='retry'){
    inner='<h2>'+esc(w.prompt)+'</h2><p><b>Jetzt du:</b> Schreib es aus dem Kopf auf Englisch.</p>'+(s.retryWrong?wrongBox(w,s.retryWrong,paper,s.draft):'')+(paper?'<p class="helper">Schreib es auf dein Papier.</p>':field)
      +(s.retryWrong?'<div class="actions">'+act('showhelp',icon('lightbulb')+' Lösung nochmal ansehen','ghost helpbtn')+'</div>':'');
    primary=paper?go('submit','Mit Lösung vergleichen'):check('Antwort prüfen');
  }else if(s.phase==='retrycompare'){
    inner='<h2 lang="en">'+highlight(w)+'</h2><p>Vergleiche mit deinem Papier. Stimmt jeder Buchstabe?</p>'+pair('retryyes','retryno','Stimmt','Noch nicht');
  }else if(s.phase==='feedback'){
    inner=s.result?'<div class="success" role="img" aria-label="Richtig">'+icon('check')+'</div><h2 class="center">Richtig!</h2><p class="solution center" lang="en">'+highlight(w)+'</p>'+(s.helped&&!st.again?'<p class="caption center">Am Ende der Runde kommt das Wort noch einmal.</p>':'')
      :'<h2>Schau noch einmal hin.</h2><p class="large"><b lang="en">'+highlight(w)+'</b> · '+esc(w.de)+'</p>'+(s.draft?spellingHelp(w,s.draft):'');
    primary=go('next','Weiter');
  }else if(st.kind==='learn'){
    inner='<h2 lang="en">'+highlight(w)+'</h2><p class="large">'+esc(w.de)+'</p>'+audioButtons(w)+(w.tip?'<p class="helper">'+esc(w.tip)+'</p>':'')+'<p>Hör es dir an und sag es laut nach.</p>';
    primary=go('next','Weiter');
  }else if(st.kind==='listen'){
    inner='<h2>Was hörst du?</h2><p>Spiel den Ausdruck ab und wähle seine Bedeutung.</p>'+audioButtons(w);
    if(s.chosen){inner+='<div class="helper">'+(s.chosen===w.id?'Richtig zugeordnet. ':'Hör noch einmal hin. ')+'„'+esc(w.en)+'“ heißt „'+esc(w.de)+'“.</div>';primary=go('next','Weiter')}
    else inner+='<div class="choices">'+st.choices.map(id=>act('listen',esc(terms.get(id).de),'answer',id)).join('')+'</div>'+act('skiplisten','Ohne Ton weiter','textbtn');
  }else{
    const number=s.ids.indexOf(w.id)+1, test=st.kind==='test';
    const question=test?'Aufgabe '+number+' von '+s.ids.length:st.kind==='check'?'Kennst du das schon auf Englisch?':'Wie schreibst du das auf Englisch?';
    const second=test?act('unknown',icon('skip-forward')+' Weiß ich nicht – auslassen','ghost'):act('unknown',icon('lightbulb')+' '+(st.kind==='check'?'Zeig es mir':'Ich brauche Hilfe'),'ghost helpbtn');
    inner='<h2>'+esc(w.prompt)+'</h2><p>'+question+'</p>'+(s.wrong&&!test?wrongBox(w,s.wrong,paper,s.lastWrong):'')+(paper?'<p class="helper">'+(test?'Schreib die Antwort neben Nummer '+number+' auf dein Blatt.':'Schreib deine Antwort auf Papier und decke frühere Versuche ab.')+'</p>':field)+'<div class="actions">'+second+'</div>';
    if(st.kind==='check')inner+=modes();
    primary=paper?go('submit',test?'Antwort notiert':'Mit Lösung vergleichen'):check(test?'Antwort speichern':'Antwort prüfen');
  }
  const position=st.again?'Nochmal üben':'Wort '+(s.ids.indexOf(w.id)+1)+' von '+s.ids.length;
  // „Zurück“ nicht nach einer gelösten Aufgabe; „Überspringen“ nur beim Schreiben, wo es etwas anderes tut als der Hauptknopf.
  const canBack=s.index>0&&s.phase!=='feedback';
  const canSkip=st.kind==='write'&&['ask','help','retry'].includes(s.phase);
  const side=(canBack?act('back',icon('arrow-left')+' Zurück','ghost small'):'')+(canSkip?act('skip','Überspringen '+icon('skip-forward'),'ghost small'):'');
  shell(s.label,'<section class="training"><div class="trainer-top"><span class="row">'+(s.world?stamp(s.world):icon('book-open'))+'<span><strong>'+esc(s.label)+'</strong><small class="stepcount">'+esc(position)+'</small></span></span>'+act('pause',icon('pause')+' Pause','ghost')+'</div>'+dots(s,st)+'<article class="panel exercise"><div class="eyebrow">'+icon('bookmark')+' '+lab+(w?' · Seite '+w.page:' · '+esc(s.label))+'</div>'+inner+'</article></section>'+runbar(primary,side));
}
function submit(){
  const s=session(),st=current();
  if(s.phase==='retry'){
    if(s.mode==='paper'){s.phase='retrycompare';save();render();return}
    if(!s.draft.trim()){notify('Schreib das Wort aus dem Kopf.');return}
    retryResult(correct(terms.get(st.id),s.draft));return;
  }
  if(s.mode==='paper'){
    if(st.kind==='test'){advance();return}
    s.phase='compare';save();render();return;
  }
  if(!s.draft.trim()){notify('Schreib deine Antwort oder wähle die Hilfe.');return}
  if(s.test){s.answers??={};s.answers[st.id]=s.draft}
  assess(correct(terms.get(st.id),s.draft));
}
document.addEventListener('submit',e=>{
  if(e.target.id==='writing'){e.preventDefault();submit()}
  if(e.target.id==='copying'){e.preventDefault();
    const v=document.querySelector('#copy').value,w=terms.get(current().id);
    if(correct(w,v))finishHelp();else notify('Noch nicht ganz. Vergleiche Buchstabe für Buchstabe mit der Lösung oben.');
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='draft'){session().draft=e.target.value;save()}
  if(e.target.id==='notes'){state.notes=e.target.value;save()}
  if(e.target.id==='search'){query=e.target.value;document.querySelector('#wordlist').innerHTML=rows();lucide.createIcons()}
});
document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-action]');if(!btn)return;
  const {action,id}=btn.dataset;
  if(['audio','slow','example'].includes(action)){play(id,action==='example'?'example':'word',action==='slow'?0.76:1,btn);return}
  if(['world','single','retry','probe'].includes(action)){begin(proposed(action,id));return}
  switch(action){
    case 'record':if(!integration)toggleRecording(btn);break;
    case 'explain':explainCard(btn,id);break;
    case 'nav':navigate(id);break;
    case 'filter':filter=id;render();break;
    case 'resume':navigate('run');break;
    case 'replace':install(pending);break;
    case 'pause':navigate('studio');break;
    case 'mode':state.mode=id;if(page==='run')session().mode=id;save();render();break;
    case 'submit':submit();break;
    case 'next':case 'skiplisten':advance();break;
    case 'back':goBack();break;
    case 'later':postpone();break;
    case 'copied':finishHelp();break;
    case 'cover':session().phase='retry';session().draft='';save();render();break;
    case 'retryyes':retryResult(true);break;
    case 'retryno':session().draft='';retryResult(false);break;
    case 'skip':{const k=current().kind;if(k==='write')skipTask();else if(k==='test'||k==='grade'){if(session().mode!=='paper'&&k==='test'){session().answers??={};session().answers[current().id]=''}k==='test'&&session().mode!=='paper'?assess(false):advance()}else advance();break}
    case 'showhelp':session().phase='help';session().draft='';save();render();break;
    case 'yes':assess(true);break;
    case 'no':assess(false);break;
    case 'unknown':if(session().test&&session().mode==='paper'){advance();break}if(session().test){session().answers??={};session().answers[current().id]=''}if(current().kind==='write'){needHelp();break}assess(false);break;
    case 'scene':session().chosen=id;save();render();break;
    case 'listen':session().chosen=id;if(current().id===id){const c=item(id);c.heard=(c.heard||0)+1}save();render();break;
    case 'finish':state.session=null;save();navigate('studio');break;
  }
});
let recorder=null,recordURL=null,micStream=null,micTimer=null;
if(integration)integration.ready({
  restore(){stopAudio();releaseRecording();const fresh=initial();Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,fresh);page=state.session&&state.session.phase!=='done'?'run':'studio';render()},
});
render();

let explanationsEnabled=false;
if(!integration && location.protocol==='http:' && location.hostname==='127.0.0.1'){
  fetch('/api/status').then(r=>r.json()).then(v=>{explanationsEnabled=v.enabled===true;if(explanationsEnabled&&page==='run'&&current()?.kind==='learn')render()}).catch(()=>{});
}
async function explainCard(button,id){
  const target=document.querySelector('#explanation');if(!target)return;
  button.disabled=true;target.textContent='Die Erklärung wird erstellt …';
  try{
    const res=await fetch('/api/explain/'+encodeURIComponent(id),{method:'POST'});if(!res.ok)throw Error();
    const data=await res.json();target.textContent=data.text;
  }catch{target.textContent='Die KI ist gerade nicht erreichbar. Das Hörbeispiel und die Merkhilfe stehen weiter zur Verfügung.'}
  finally{button.disabled=false}
}

function releaseRecording(){
  clearTimeout(micTimer);
  if(recorder && recorder.state!=='inactive'){recorder.onstop=null;recorder.stop()}
  micStream?.getTracks().forEach(track=>track.stop());micStream=null;recorder=null;
  if(recordURL){URL.revokeObjectURL(recordURL);recordURL=null}
}
async function toggleRecording(button){
  if(recorder?.state==='recording'){recorder.stop();return}
  releaseRecording();stopAudio();
  const box=document.querySelector('#mic-result');if(!box)return;
  box.replaceChildren();button.disabled=true;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(!button.isConnected){stream.getTracks().forEach(t=>t.stop());return}
    micStream=stream;recorder=new MediaRecorder(stream);const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recorder.onstop=()=>{
      clearTimeout(micTimer);stream.getTracks().forEach(t=>t.stop());micStream=null;
      if(!button.isConnected)return;
      recordURL=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));
      const player=document.createElement('audio');player.controls=true;player.src=recordURL;
      player.setAttribute('aria-label','Deine Aussprache');box.replaceChildren(player);
      button.textContent='Noch einmal aufnehmen';
    };
    recorder.start();button.textContent='Aufnahme beenden';box.textContent='Aufnahme läuft · höchstens 15 Sekunden';
    micTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop()},15000);
  }catch{releaseRecording();box.textContent='Das Mikrofon ist nicht verfügbar. Du kannst laut mitsprechen und weiterüben.'}
  finally{button.disabled=false}
}
