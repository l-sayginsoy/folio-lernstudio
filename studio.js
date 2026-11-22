'use strict';
const terms = new Map(WORDS.map(w => [w.id,w]));
const navs = [['studio','compass','Lernstudio'],['library','book-open','Wortschatz'],['test','clipboard-list','Probetest'],['progress','chart-no-axes-column','Lernstand']];
const worldStyle = {
  london: ['bus-front', '#eadfff', '#6134aa'],
  country: ['trees', '#ceefe1', '#176747'],
  phone: ['phone-call', '#ffe0d1', '#943e22'],
  stories: ['notebook-pen', '#d9e9fe', '#29588c']
};
const KEY='folio-studio-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>'<i class="icon" aria-hidden="true" data-lucide="'+n+'"></i>';
const act=(a,label,style='btn',id='')=>'<button class="'+style+'" data-action="'+a+'" data-id="'+esc(id)+'">'+label+'</button>';
const main=document.querySelector('#main');
let storageOK=true;
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
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
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true}catch{if(storageOK)notify('Dieser Browser kann den Lernstand gerade nur für diese Sitzung behalten.');storageOK=false}}
const item=id=>state.cards[id]??(state.cards[id]={});
function day(t){return new Date(t).toLocaleDateString('sv-SE')}
function secure(c){return c?.write==='ok' && (c.validated||[]).length>=2}
function status(id){const c=state.cards[id];if(secure(c))return 'Wiederholt gekonnt';if(c?.write==='retry')return 'Weiter üben';if(c?.write==='ok'||c?.done)return 'Selbst geschrieben';return c?.introduced?'Kennengelernt':'Offen'}
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
    <span class="subject">${icon('book-open')} Englisch</span>
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
  shell('Lernstudio',`<header class="intro home-intro"><div><h1>Dein Lernstudio</h1><p>Englisch aus deinem Schulbuch · Seiten 154–156</p></div><span class="test-date">${icon('calendar-days')} Test am 23. November</span></header>
    <section class="hero">${art}<div class="hero-content"><div class="eyebrow">${icon('headphones')}${s?'Deine offene Runde':'Kapitel '+targetNo+' von '+SCENES.length}</div>
    <h2>${s?esc(s.label):esc(target.name)}</h2><p>${s?'Mach an der Stelle weiter, an der du aufgehört hast.':totalOpen?'Noch '+openIn(target)+' von '+target.ids.length+' Wortkarten offen. Eine Runde hat drei Wortkarten.':'Alle Kapitel geschafft! Wiederhol, was du magst.'}</p>
    ${act(s?'resume':'world',(s?'Runde fortsetzen':'Runde starten')+icon('arrow-right'),'btn',target.id)}</div></section>
    <ol class="howto"><li><b>Ansehen und anhören:</b> Du siehst das Wort und tippst auf „Anhören“.</li><li><b>Selbst schreiben:</b> Du schreibst das Wort auf Englisch.</li><li><b>Grüner Haken:</b> Richtig! Wenn nicht, zeigt dir die App die Lösung und du schreibst sie ab.</li></ol>
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
function progress(){
  const cards=Object.values(state.cards), tricky=WORDS.filter(w=>state.cards[w.id]?.write==='retry');
  const facts=[[cards.filter(c=>c.introduced).length+'/'+WORDS.length,'Karten kennengelernt'],[cards.filter(c=>c.write==='ok').length,'Zuletzt selbst geschrieben'],[cards.filter(secure).length,'An zwei Tagen gekonnt']];
  const tests=state.history.filter(h=>h.test).slice(-3).reverse();
  shell('Lernstand',intro('Dein Lernstand','Hier siehst du, was schon klappt und was wieder dran ist.')+'<div class="stack"><div class="stats">'+facts.map(([n,t])=>'<div class="stat"><strong>'+n+'</strong><span>'+t+'</span></div>').join('')+'</div><section class="panel stack"><h2>Weiter üben</h2><p>'+ (tricky.length?tricky.map(w=>esc(w.en)).join(' · '):'Hier erscheinen Wörter, für die du zuletzt Hilfe gebraucht hast.')+'</p>'+(tricky.length?'<div>'+act('retry','Kurze Wiederholung starten')+'</div>':'')+'</section><section class="panel stack"><h2>Für Eltern</h2><p>„An zwei Tagen gekonnt“ zählt selbstständige Schreibversuche an verschiedenen Tagen mit mindestens 16 Stunden Abstand. Direkt nach einer Erklärung zählt der Versuch als Übung. Bei Papier bestätigt ihr die Schreibweise selbst.</p><p class="muted">Gehörte Bedeutungen richtig zugeordnet: '+cards.reduce((n,c)=>n+(c.heard||0),0)+'. Lautes Sprechen ist freiwillig und wird nicht bewertet.</p>'+(state.previous?'<p>'+state.previous+' bereits bearbeitete Karten aus dem bisherigen Trainer sind als kennengelernt übernommen.</p>':'')+(tests.length?'<h3>Letzte Probetests</h3>'+tests.map(t=>'<p>'+new Date(t.time).toLocaleDateString('de-DE')+' · '+t.score+' von '+t.total+' richtig</p>').join(''):'')+modes()+'<label><b>Eure Beobachtungen</b><textarea id="notes" rows="3" placeholder="Was hat geholfen?">'+esc(state.notes)+'</textarea></label><div><a class="ghost" href="lernblatt-englisch-test.html">'+icon('printer')+' Druckstudio öffnen</a></div></section></div>');
}
function navigate(id){page=id;stopAudio();render();window.scrollTo(0,0);main.focus({preventScroll:true})}
function render(){({studio:home,library,test:testView,progress,run:runView,replace:replaceView})[page]()}
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
  const steps=o.test?o.ids.map(id=>({kind:'test',id}))
    :o.label==='Wiederholung'?o.ids.map(id=>({kind:'write',id}))
    :o.ids.flatMap(id=>[{kind:'learn',id},{kind:'write',id}]);
  // Einfach gehalten: pro Wort nur ansehen/anhören, dann selbst schreiben. Keine Zusatzaufgaben.
  const finalIds=[];
  state.session={...o,steps,index:0,phase:'ask',draft:'',results:{},finalIds,mode:state.mode};pending=null;save();navigate('run');
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
  const s=session();s.index++;s.phase='ask';s.draft='';s.chosen=null;s.result=null;stopAudio();
  if(s.index===s.steps.length){
    if(!s.test && s.finalIds.length){s.steps.push(...shuffle(s.finalIds).map(id=>({id,kind:'write'})));s.finalIds=[]}
    else if(s.test && s.mode==='paper'&&!s.checked){s.steps.push(...s.ids.map((id,i)=>({id,kind:'grade',number:i+1})));s.checked=true}
    else {s.phase='done';state.history.push({time:Date.now(),test:!!s.test,world:s.world,score:Object.values(s.results).filter(r=>r==='known').length,total:s.ids.length});}
  }
  save();render();
}
function assess(ok){
  const s=session(),step=current(),w=terms.get(step.id);
  if(step.kind==='test'||step.kind==='grade'){
    s.results[w.id]=ok?'known':'again';record(w,ok,true);advance();return;
  }
  const fresh=step.kind==='check';
  record(w,ok,fresh);
  if(ok){
    item(w.id).done=true;
    s.results[w.id]=fresh?'known':step.again?'later':'practised';
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
  s.attempt=s.draft;s.draft='';s.phase='help';save();render();
}
function finishHelp(){
  const s=session(),st=current();
  if(!st.again)s.steps.push({kind:'write',id:st.id,again:true});
  notify(st.again?'Gut abgeschrieben. Morgen kommt das Wort wieder.':'Gut. Am Ende der Runde kommt das Wort noch einmal ohne Hilfe.');
  s.attempt='';advance();
}
function goBack(){
  const s=session();if(!s||s.index===0)return;
  s.index--;s.phase='ask';s.draft='';s.chosen=null;s.result=null;s.attempt='';stopAudio();save();render();
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
  let next='<div class="actions center">'+act('finish','Fertig '+icon('arrow-right'))+'</div>';
  if(s.world){
    const i=SCENES.findIndex(x=>x.id===s.world),w=SCENES[i],open=openIn(w),after=SCENES[i+1];
    const target=open?w:(after&&openIn(after)?after:SCENES.find(x=>openIn(x)>0));
    const others=SCENES.filter(x=>x.id!==w.id&&openIn(x)>0).map(x=>esc(x.name)+': '+openIn(x)).join(' · ');
    next='<p class="caption center">'+(open?'Kapitel „'+esc(w.name)+'“: noch '+open+' Wörter offen':'Kapitel „'+esc(w.name)+'“ geschafft ✓')+'</p>'
      +(others?'<p class="caption center">Noch offen · '+others+'</p>':'')
      +'<div class="actions center">'+(target?act('world','Nächste Runde '+icon('arrow-right'),'btn',target.id):'')+(open&&after?act('world','Zum nächsten Kapitel','textbtn',after.id):'')+act('finish','Fertig für jetzt','textbtn')+'</div>';
  }
  return '<div class="panel exercise stack"><div class="success" role="img" aria-label="Geschafft">'+icon('check')+'</div><h2 class="center">'+(s.test?'Dein Ergebnis':'Runde geschafft!')+'</h2><p class="large center">'+score+' von '+s.ids.length+' richtig geschrieben</p>'+lines+next+'</div>';
}
function highlight(w){const bits=(w.hl||[]).filter(x=>w.en.includes(x));if(!bits.length)return esc(w.en);let t=w.en,html='';while(t.length){const hit=bits.find(x=>t.startsWith(x));html+=hit?'<mark>'+esc(hit)+'</mark>':esc(t[0]);t=t.slice(hit?hit.length:1)}return html}
function spellingHelp(w,attempt){
  const target=w.ans[0],given=normalize(attempt),goal=normalize(target);
  let n=0;
  while(n<Math.min(given.length,goal.length)&&given[n]===goal[n])n++;
  const mismatch=n>0&&given.length===goal.length-1&&given.slice(n)===goal.slice(n+1);
  const hint=mismatch?'Nach „'+goal.slice(0,n)+'“ fehlt „'+goal[n]+'“.':w.tip||'Lies die Buchform langsam und vergleiche Wort für Wort.';
  return '<div class="helper"><b>Dein Versuch</b> · '+esc(attempt)+'<br>'+esc(hint)+'</div>';
}
function runView(){
  const s=session();if(!s){navigate('studio');return}
  if(s.phase==='done'){shell(s.label,'<section class="training">'+summary()+'</section>');return}
  const st=current(),w=terms.get(st.id),paper=s.mode==='paper';
  const lab={check:'Schon bekannt?',learn:'Entdecken',listen:'Hörverständnis',write:'Aus dem Kopf',test:'Probetest',grade:'Papier vergleichen',scene:'Vor Ort'}[st.kind];
  let inner='';
  if(st.kind==='scene'){
    inner='<h2>Vor Ort</h2><p class="large">'+esc(st.question)+'</p>';
    if(s.chosen)inner+='<div class="helper">'+(s.chosen===st.answer?'Genau. ':'Hier passt: ')+esc(st.answer)+'</div><div class="actions">'+act('next','Weiter')+'</div>';
    else inner+='<div class="choices">'+st.options.map(opt=>act('scene',esc(opt),'answer',opt)).join('')+'</div>';
  }else if(st.kind==='grade'||s.phase==='compare'){
    inner='<h2 lang="en">'+highlight(w)+'</h2><p>Vergleiche '+(st.kind==='grade'?'Antwort '+st.number:'deine Antwort')+' auf dem Papier. Stimmen die Wörter und die Schreibweise?</p>'+(w.ans.length>1?'<details><summary>Weitere passende Formen</summary>'+w.ans.slice(1).map(esc).join(' · ')+'</details>':'')+'<div class="actions">'+act('yes','Stimmt überein')+act('no','Noch üben','ghost')+'</div>';
  }else if(s.phase==='help'){
    inner='<h2>'+esc(w.prompt)+'</h2><p>So schreibt man es:</p><p class="solution" lang="en">'+highlight(w)+'</p>'+audioButtons(w)
      +(s.attempt?spellingHelp(w,s.attempt):(w.tip?'<div class="helper">'+esc(w.tip)+'</div>':''))
      +(paper?'<p class="helper warn"><b>Jetzt du:</b> Schreib es einmal richtig auf dein Papier. '+(st.again?'':'Am Ende der Runde kommt es noch einmal ohne Hilfe.')+'</p><div class="actions">'+act('copied','Abgeschrieben '+icon('check'))+'</div>'
      :'<p><b>Jetzt du:</b> Tipp es einmal richtig ab. '+(st.again?'':'Am Ende der Runde kommt es noch einmal ohne Hilfe.')+'</p><form id="copying"><label class="sr" for="copy">Abschreiben</label><input class="entry" id="copy" lang="en" placeholder="Hier abschreiben" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="submit" class="btn submit">Prüfen</button></form>');
  }else if(s.phase==='feedback'){
    const yes=s.result;
    inner=yes?'<div class="success" role="img" aria-label="Richtig">'+icon('check')+'</div><h2 class="center">Richtig!</h2><p class="large center"><b lang="en">'+highlight(w)+'</b></p><div class="actions center">'+act('next','Weiter '+icon('arrow-right'))+'</div>'
      :'<h2>Schau noch einmal hin.</h2><p class="large"><b lang="en">'+highlight(w)+'</b> · '+esc(w.de)+'</p>'+(s.draft?spellingHelp(w,s.draft):'')+'<div class="actions">'+act('next','Weiter '+icon('arrow-right'))+'</div>';
  }else if(st.kind==='learn'){
    inner='<h2 lang="en">'+highlight(w)+'</h2><p class="large">'+esc(w.de)+'</p>'+audioButtons(w)+(w.tip?'<p class="helper">'+esc(w.tip)+'</p>':'')+'<p>Hör es dir an und sag es laut nach.</p><div class="actions">'+act('next','Weiter '+icon('arrow-right'))+'</div>';
  }else if(st.kind==='listen'){
    inner='<h2>Was hörst du?</h2><p>Spiel den Ausdruck ab und wähle seine Bedeutung.</p>'+audioButtons(w);
    if(s.chosen){inner+='<div class="helper">'+(s.chosen===w.id?'Richtig zugeordnet. ':'Hör noch einmal hin. ')+'„'+esc(w.en)+'“ heißt „'+esc(w.de)+'“.</div><div class="actions">'+act('next','Weiter')+'</div>'}
    else inner+='<div class="choices">'+st.choices.map(id=>act('listen',esc(terms.get(id).de),'answer',id)).join('')+'</div>'+act('skiplisten','Ohne Ton weiter','textbtn');
  }else{
    const number=s.ids.indexOf(w.id)+1;
    const question=st.kind==='test'?'Aufgabe '+number+' von '+s.ids.length:st.kind==='check'?'Kennst du das schon auf Englisch?':'Wie schreibst du das auf Englisch?';
    inner='<h2>'+esc(w.prompt)+'</h2><p>'+question+'</p>'+(paper?'<p class="helper">'+(st.kind==='test'?'Schreib die Antwort neben Nummer '+number+' auf dein Blatt.':'Schreib deine Antwort auf Papier und decke frühere Versuche ab.')+'</p>':'<form id="writing"><label class="sr" for="draft">Deine englische Antwort</label><input class="entry" id="draft" lang="en" value="'+esc(s.draft)+'" placeholder="Deine englische Antwort" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="submit" class="btn submit">'+(st.kind==='test'?'Antwort speichern':'Antwort prüfen')+'</button></form>')+'<div class="actions">'+(paper?act('submit',st.kind==='test'?'Antwort notiert':'Mit Lösung vergleichen'):'')+act('unknown',st.kind==='check'?'Zeig es mir':st.kind==='test'?'Auslassen':'Ich brauche Hilfe','textbtn')+'</div>';
    if(st.kind==='check')inner+=modes();
  }
  const total=s.steps.length+s.finalIds.length;
  const world=s.world?SCENES.find(x=>x.id===s.world):null;
  const position=st.again?'Nochmal üben':'Wort '+(s.ids.indexOf(w.id)+1)+' von '+s.ids.length;
  const progress=s.index/total*100;
  const canBack=s.index>0;
  const canLater=['listen','write','test','grade','scene'].includes(st.kind)&&(s.index<s.steps.length-1||s.finalIds.length>0);
  const stepnav='<div class="stepnav">'+(canBack?act('back',icon('arrow-left')+' Zurück','textbtn quietbtn'):'<span></span>')+(canLater&&s.phase==='ask'?act('later','Später','textbtn quietbtn'):'')+'</div>';
  shell(s.label,'<section class="training"><div class="trainer-top"><span class="row">'+(s.world?stamp(s.world):icon('book-open'))+'<span><strong>'+esc(s.label)+'</strong><small class="stepcount">'+esc(position)+'</small></span></span>'+act('pause',icon('pause')+' Pause','ghost')+'</div><div class="track" aria-label="Fortschritt"><i style="width:'+progress+'%"></i></div><article class="panel exercise"><div class="eyebrow">'+icon('bookmark')+' '+lab+(w?' · Seite '+w.page:' · '+esc(s.label))+'</div>'+inner+'</article>'+stepnav+'</section>');
}
function submit(){
  const s=session(),st=current();
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
    case 'record':toggleRecording(btn);break;
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
    case 'yes':assess(true);break;
    case 'no':assess(false);break;
    case 'unknown':if(session().test&&session().mode==='paper'){advance();break}if(session().test){session().answers??={};session().answers[current().id]=''}assess(false);break;
    case 'scene':session().chosen=id;save();render();break;
    case 'listen':session().chosen=id;if(current().id===id){const c=item(id);c.heard=(c.heard||0)+1}save();render();break;
    case 'finish':state.session=null;save();navigate('studio');break;
  }
});
let recorder=null,recordURL=null,micStream=null,micTimer=null;
render();

let explanationsEnabled=false;
if(location.protocol==='http:' && location.hostname==='127.0.0.1'){
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
