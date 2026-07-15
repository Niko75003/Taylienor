const $=s=>document.querySelector(s), app=$('#app');
const SUPABASE_URL='https://hohagbpmtrmofxmhaagn.supabase.co';
const SUPABASE_KEY='sb_publishable_oas22oztrHU_izZWmm5m3A_UMYEdcC7';
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let currentUser=null,syncTimer=null;
let bestScores=JSON.parse(localStorage.getItem('alienor-best-scores')||'{}');
const state={route:'home',album:null,count:10,level:'normal',game:null,rankSort:'avg',rankDir:'desc',rankAlbum:'all',rankingView:'simple',openTrack:null};
const ratings=JSON.parse(localStorage.getItem('alienor-ratings')||'{}');
const save=()=>{localStorage.setItem('alienor-ratings',JSON.stringify(ratings));scheduleSync()};
const allTracks=()=>ALBUMS.flatMap(a=>a.tracks.map((t,i)=>({title:t,album:a.title,albumId:a.id,track:i+1})));
const catalogCache=JSON.parse(localStorage.getItem('alienor-catalog-v2')||'{}');
const cleanAlbum=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/taylor.?s version/g,'').replace(/the anthology/g,'').replace(/deluxe version/g,'').replace(/[^a-z0-9]/g,'');

function localPayload(){return {ratings,bestScores,theme:localStorage.getItem('alienor-theme')||'soft-summer',preferences:{rankingView:state.rankingView||'simple'},updatedAt:new Date().toISOString()}}
function persistBestScores(){localStorage.setItem('alienor-best-scores',JSON.stringify(bestScores))}
function setSyncStatus(text){const el=$('#syncStatus');if(el)el.textContent=text}
async function pushToSupabase(){if(!currentUser)return false;setSyncStatus('Synchronisation…');const {error}=await supabaseClient.from('user_data').upsert({user_id:currentUser.id,data:localPayload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error){setSyncStatus('Erreur de synchronisation');return false}setSyncStatus('Synchronisé à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));return true}
function scheduleSync(){if(!currentUser)return;clearTimeout(syncTimer);syncTimer=setTimeout(pushToSupabase,1200)}
async function loadFromSupabase(){if(!currentUser)return;const {data,error}=await supabaseClient.from('user_data').select('data').eq('user_id',currentUser.id).maybeSingle();if(error){setSyncStatus('Erreur de chargement');return}if(data?.data){const remote=data.data;if(remote.ratings){Object.keys(ratings).forEach(k=>delete ratings[k]);Object.assign(ratings,remote.ratings);localStorage.setItem('alienor-ratings',JSON.stringify(ratings))}if(remote.bestScores){bestScores=remote.bestScores;persistBestScores()}if(remote.theme)setTheme(remote.theme);if(remote.preferences?.rankingView)state.rankingView=remote.preferences.rankingView}else await pushToSupabase()}
function scoreKey(type,count,level){return `${type}-${count}-${level}`}
function updateBestScore(type,score,max){const key=scoreKey(type,state.count,state.level),prev=bestScores[key];if(!prev||score>prev.score){bestScores[key]={score,max,date:new Date().toISOString()};persistBestScores();scheduleSync();return true}return false}
function renderBestScore(type){const rec=bestScores[scoreKey(type,state.count,state.level)];return rec?`<p class="best-score">Meilleur score : <b>${rec.score}/${rec.max}</b></p>`:''}
async function initAuth(){const {data:{session}}=await supabaseClient.auth.getSession();currentUser=session?.user||null;if(!currentUser){$('#authSplash').hidden=false;return}$('#authSplash').hidden=true;await loadFromSupabase();render()}

async function loadAlbumTracks(a){
  if(catalogCache[a.id]?.length){a.tracks=catalogCache[a.id];return a.tracks}
  try{
    const term=encodeURIComponent(`${a.title} Taylor Swift`);
    const search=await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=20`).then(r=>r.json());
    const wanted=cleanAlbum(a.title);
    let hit=search.results.find(x=>cleanAlbum(x.artistName).includes('taylorswift')&&cleanAlbum(x.collectionName)===wanted)
      ||search.results.find(x=>cleanAlbum(x.artistName).includes('taylorswift')&&(cleanAlbum(x.collectionName).includes(wanted)||wanted.includes(cleanAlbum(x.collectionName))));
    if(!hit) return a.tracks;
    const lookup=await fetch(`https://itunes.apple.com/lookup?id=${hit.collectionId}&entity=song`).then(r=>r.json());
    const found=lookup.results.filter(x=>x.wrapperType==='track'&&x.trackName).sort((x,y)=>(x.discNumber-y.discNumber)||(x.trackNumber-y.trackNumber)).map(x=>x.trackName);
    if(found.length>=a.tracks.length){a.tracks=found;catalogCache[a.id]=found;localStorage.setItem('alienor-catalog-v2',JSON.stringify(catalogCache));}
  }catch(e){}
  return a.tracks;
}
async function ensureCatalog(){for(const a of ALBUMS) await loadAlbumTracks(a)}
function generatedQuiz(){
  const out=[];
  const albumTitles=ALBUMS.map(a=>a.title);
  const pickWrong=(correct,n=3)=>albumTitles.filter(x=>x!==correct).sort(()=>Math.random()-.5).slice(0,n);
  for(const a of ALBUMS){
    out.push({q:`En quelle année est sorti « ${a.title} » ?`,o:[String(a.year),String(a.year-1),String(a.year+1),String(a.year+2)].sort(()=>Math.random()-.5),answer:String(a.year),c:'Chronologie'});
    a.tracks.forEach((t,i)=>{
      if(i%3===0){const opts=[a.title,...pickWrong(a.title)].sort(()=>Math.random()-.5);out.push({q:`Sur quel album trouve-t-on « ${t} » ?`,o:opts,answer:a.title,c:'Discographie'});}
      if(i%7===0){const correct=String(i+1);const opts=[correct,String(Math.max(1,i)),String(i+2),String(i+3)].filter((v,k,arr)=>arr.indexOf(v)===k).slice(0,4);while(opts.length<4)opts.push(String(i+opts.length+2));opts.sort(()=>Math.random()-.5);out.push({q:`Quel est le numéro de piste de « ${t} » sur l’édition de référence ?`,o:opts,answer:correct,c:'Tracklists'});}
    });
  }
  return out.map(q=>q.a===undefined&&q.answer!==undefined?{...q,a:q.o.indexOf(q.answer)}:q);
}

function go(route,data){state.route=route;if(data)Object.assign(state,data);render();scrollTo(0,0)}
document.addEventListener('click',async e=>{const r=e.target.closest('[data-route]');if(!r)return;closeMobileMenu();if(r.dataset.route==='album'&&r.dataset.album){const a=ALBUMS.find(x=>x.id===r.dataset.album);go('album',{album:r.dataset.album});await loadAlbumTracks(a);render();return}go(r.dataset.route,{album:r.dataset.album||null})});
$('#themeBtn').onclick=()=>$('#themeDialog').showModal();$('.close').onclick=()=>$('#themeDialog').close();
function setTheme(name){
  document.documentElement.dataset.theme=name;
  localStorage.setItem('alienor-theme',name);scheduleSync();
  document.querySelectorAll('[data-quick-theme]').forEach(b=>b.classList.toggle('active',b.dataset.quickTheme===name));
}
document.querySelectorAll('#themeDialog button[data-theme]').forEach(b=>b.onclick=(e)=>{
  e.preventDefault();
  e.stopPropagation();
  setTheme(b.dataset.theme);
  $('#themeDialog').close();
});
setTheme(localStorage.getItem('alienor-theme')||'soft-summer');

const burgerBtn=$('#burgerBtn'), mobileMenu=$('#mobileMenu'), mobileBackdrop=$('#mobileMenuBackdrop');
function openMobileMenu(){
  mobileMenu.classList.add('open');
  mobileBackdrop.classList.add('open');
  mobileMenu.setAttribute('aria-hidden','false');
  burgerBtn.setAttribute('aria-expanded','true');
  document.body.classList.add('menu-open');
}
function closeMobileMenu(){
  mobileMenu.classList.remove('open');
  mobileBackdrop.classList.remove('open');
  mobileMenu.setAttribute('aria-hidden','true');
  burgerBtn.setAttribute('aria-expanded','false');
  document.body.classList.remove('menu-open');
}
burgerBtn.onclick=openMobileMenu;
$('#mobileMenuClose').onclick=closeMobileMenu;
mobileBackdrop.onclick=closeMobileMenu;
document.querySelectorAll('[data-mobile-route]').forEach(btn=>btn.onclick=()=>{
  closeMobileMenu();
  go(btn.dataset.mobileRoute);
});
document.querySelectorAll('[data-mobile-theme]').forEach(btn=>btn.onclick=()=>{
  setTheme(btn.dataset.mobileTheme);
  closeMobileMenu();
});

function back(target='home',label='Retour'){return `<div class="backbar"><button class="backbtn" data-route="${target}">← ${label}</button></div>`}
function head(title,text,backTo='home',backLabel='Accueil'){return `${back(backTo,backLabel)}<section class="page-head"><h1>${title}</h1><p>${text}</p></section>`}
function exitGame(){return `<button class="exit-game" data-exit-game aria-label="Quitter et revenir à l’accueil" title="Quitter">×</button>`}
function home(){return `<section class="hero"><h1><small>Welcome</small>Aliénor ♡</h1><p>Prête à plonger dans l’univers de Taylor ? Choisis ton expérience.</p><div class="module-grid">
<button class="module" data-route="rank"><span>♡✦</span><h2>RANK</h2><p>Note et classe les morceaux selon quatre critères.</p><b>Commencer →</b></button>
<button class="module" data-route="blindtest"><span>◉♫</span><h2>GUESS</h2><p>Écoute, devine le titre, l’album et la piste.</p><b>Jouer →</b></button>
<button class="module" data-route="quiz"><span>?✧</span><h2>QUIZ</h2><p>Teste tes connaissances sur l’œuvre, la vie et les secrets de Taylor.</p><b>Jouer →</b></button>
</div></section>`}
function rank(){return head('Rank','Les Taylor’s Versions remplacent les versions originales lorsqu’elles existent.')+`<div style="margin-bottom:24px"><button class="primary" data-route="ranking">Voir le classement général</button></div><section class="album-grid">${ALBUMS.map(a=>`<button class="album" data-route="album" data-album="${a.id}" data-title="${a.title}" style="--a:${a.a};--b:${a.b}"><div class="cover"><span class="cover-label">${a.title}</span></div><div class="meta"><b>${a.title}</b><br><small>${a.year} · ${a.version}</small></div></button>`).join('')}</section>`}
function dots(key,crit,val){return `<span class="dots">${[1,2,3,4,5].map(n=>`<button class="dot ${n<=val?'on':''}" data-rate="${key}" data-crit="${crit}" data-value="${n}" aria-label="${n}/5"></button>`).join('')}</span>`}
function album(){
  const a=ALBUMS.find(x=>x.id===state.album)||ALBUMS[0];
  return head(a.title,`${a.year} · ${a.version}`,'rank','Tous les albums')+
  `<section class="panel rating-layout">
    <div>
      <div class="big-cover" data-title="${a.title}" style="--a:${a.a};--b:${a.b}">
        <span class="cover-label">${a.title}</span>
      </div>
      <div class="album-actions">
        <button class="danger" data-reset-album="${a.id}">Réinitialiser la notation</button>
      </div>
    </div>
    <div class="tracks">
      <div class="track head">
        <span>#</span><span>Titre</span><span>Reliability</span><span>Lyrics</span><span>Voice</span><span>Production</span><span>Moy.</span>
      </div>
      ${a.tracks.map((t,i)=>{
        const k=a.id+'|'+t,r=ratings[k]||[0,0,0,0],avg=r.some(Boolean)?(r.reduce((x,y)=>x+y,0)/4).toFixed(1):'—';
        const isOpen=state.openTrack===k;
        return `<article class="track-mobile-card ${isOpen?'open':''}">
          <button class="track-mobile-summary" data-toggle-track="${k}" aria-expanded="${isOpen}">
            <span class="track-number">${i+1}</span>
            <b>${t}</b>
            <strong>${avg}${avg==='—'?'':'/5'}</strong>
            <span class="track-chevron">⌄</span>
          </button>
          <div class="track-mobile-votes">
            ${['Reliability','Lyrics','Voice','Production'].map((label,c)=>`
              <div class="mobile-criterion"><span>${label}</span>${dots(k,c,r[c])}</div>`).join('')}
          </div>
        </article>
        <div class="track desktop-track">
          <span>${i+1}</span><b>${t}</b>${r.map((v,c)=>dots(k,c,v)).join('')}<strong>${avg}</strong>
        </div>`
      }).join('')}
    </div>
  </section>`
}
function ranking(){
  let rows=[];
  for(const a of ALBUMS)for(const t of a.tracks){
    let r=ratings[a.id+'|'+t];
    if(r&&r.some(Boolean))rows.push({t,a:a.title,albumId:a.id,r,avg:r.reduce((x,y)=>x+y,0)/4});
  }
  if(state.rankAlbum!=='all') rows=rows.filter(x=>x.albumId===state.rankAlbum);
  const sortIndex={reliability:0,lyrics:1,voice:2,production:3};
  rows.sort((x,y)=>{
    let xv=state.rankSort==='avg'?x.avg:x.r[sortIndex[state.rankSort]];
    let yv=state.rankSort==='avg'?y.avg:y.r[sortIndex[state.rankSort]];
    return state.rankDir==='asc'?xv-yv:yv-xv;
  });
  const sortLabels={avg:'Note générale',reliability:'Reliability',lyrics:'Lyrics',voice:'Voice',production:'Production'};
  return head('Le grand classement','Tous les morceaux évalués par Aliénor.')+`
  <div class="ranking-view-switch" role="group" aria-label="Affichage du classement">
    <button class="${state.rankingView==='simple'?'active':''}" data-ranking-view="simple">Version simplifiée</button>
    <button class="${state.rankingView==='detailed'?'active':''}" data-ranking-view="detailed">Voir le détail des notes</button>
  </div>
  <section class="panel ranking-panel">
    <div class="ranking-toolbar">
      <label>Filtrer par album
        <select id="rankAlbumFilter">
          <option value="all">Tous les albums</option>
          ${ALBUMS.map(a=>`<option value="${a.id}" ${state.rankAlbum===a.id?'selected':''}>${a.title}</option>`).join('')}
        </select>
      </label>
      <label>Trier par
        <select id="rankSort">
          ${Object.entries(sortLabels).map(([v,l])=>`<option value="${v}" ${state.rankSort===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </label>
      <label>Ordre
        <select id="rankDir">
          <option value="desc" ${state.rankDir==='desc'?'selected':''}>Du plus élevé au plus faible</option>
          <option value="asc" ${state.rankDir==='asc'?'selected':''}>Du plus faible au plus élevé</option>
        </select>
      </label>
      <div class="ranking-reset">
        <button class="danger" data-reset-all-rankings>Réinitialiser tous les classements</button>
      </div>
    </div>
    <div class="ranking-table ${state.rankingView==='simple'?'simple-view':'detailed-view'}">
      <div class="rankrow rankhead">
        <span>#</span><span>Titre</span><span>Album</span>
        <span class="detail-col">Reliability</span><span class="detail-col">Lyrics</span><span class="detail-col">Voice</span><span class="detail-col">Production</span><span>Note</span>
      </div>
      ${rows.length?rows.map((x,i)=>`<div class="rankrow">
        <b>${i+1}</b><span>${x.t}</span><small>${x.a}</small>
        ${x.r.map(v=>`<span class="detail-col">${v}/5</span>`).join('')}<b>${x.avg.toFixed(1)}/5</b>
      </div>`).join(''):'<p>Aucun morceau évalué pour ce filtre.</p>'}
    </div>
  </section>`
}
function setup(type){let isB=type==='blindtest';return `<div class="game-shell">${exitGame()}${head(isB?'Blindtest':'Quiz',isB?'Les albums sont mélangés automatiquement.':'Toutes les catégories sont mélangées automatiquement.')}<section class="panel setup"><div class="option"><h3>${isB?'Nombre de morceaux':'Nombre de questions'}</h3><div class="segments">${[1,5,10,20].map(n=>`<button class="${state.count===n?'on':''}" data-count="${n}">${n}</button>`).join('')}</div></div><div class="option"><h3>Niveau de difficulté</h3><div class="segments" style="grid-template-columns:repeat(3,1fr)">${[['easy','Facile'],['normal','Normal'],['hard','Difficile']].map(x=>`<button class="${state.level===x[0]?'on':''}" data-level="${x[0]}">${x[1]}</button>`).join('')}</div></div>${renderBestScore(type)}<p style="text-align:center"><button class="primary" data-start="${type}">Lancer ${isB?'le blindtest':'le quiz'} ▶</button></p></section></div>`}
async function startQuiz(){
  app.innerHTML='<section class="panel game"><h2>Préparation du quiz…</h2><p>Chargement du catalogue complet.</p></section>';
  await ensureCatalog();
  let bank=[...QUIZ,...EXTRA_QUIZ,...generatedQuiz()];
  let shuffled=bank.sort(()=>Math.random()-.5);
  let q=shuffled.slice(0,Math.min(state.count,bank.length));
  if(state.count>=5){
    const photos=bank.filter(item=>item.image);
    if(photos.length && !q.some(item=>item.image)) q[Math.floor(Math.random()*q.length)]=photos[Math.floor(Math.random()*photos.length)];
  }
  state.game={type:'quiz',items:q,i:0,score:0};render()
}
function quizGame(){let g=state.game;if(g.i>=g.items.length)return result();let q=g.items[g.i];return `<div class="game-shell">${exitGame()}${head('Quiz',`${g.i+1} / ${g.items.length}`)}<section class="panel game"><div class="progress"><span style="width:${g.i/g.items.length*100}%"></span></div><p><small>${q.c}</small></p>${q.image?`<figure class="quiz-photo"><img src="${q.image}" alt="Photo mystère de Taylor Swift"><figcaption>${q.credit||''}</figcaption></figure>`:''}<h2>${q.q}</h2><div class="quiz-options">${q.o.map((o,i)=>`<button data-answer="${i}">${String.fromCharCode(65+i)} · ${o}</button>`).join('')}</div><p>Score : ${g.score}</p></section></div>`}
async function startBlind(){app.innerHTML='<section class="panel game"><h2>Préparation du blindtest…</h2><p>Chargement du catalogue complet.</p></section>';await ensureCatalog();let items=allTracks().sort(()=>Math.random()-.5).slice(0,state.count);state.game={type:'blindtest',items,i:0,score:0,audio:null};render();loadAudio()}
async function loadAudio(){let g=state.game,item=g.items[g.i];try{let term=encodeURIComponent(`${item.title} Taylor Swift`);let data=await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=8`).then(r=>r.json());let hit=data.results.find(x=>x.artistName.toLowerCase().includes('taylor swift')&&x.previewUrl);if(hit){g.audio=new Audio(hit.previewUrl);$('.play').disabled=false;$('.audio-status').textContent='Extrait prêt';}else $('.audio-status').textContent='Extrait indisponible';}catch(e){$('.audio-status').textContent='Connexion audio indisponible';}}
function blindGame(){let g=state.game;if(g.i>=g.items.length)return result();return `<div class="game-shell">${exitGame()}${head('Blindtest',`${g.i+1} / ${g.items.length}`)}<section class="panel game"><div class="progress"><span style="width:${g.i/g.items.length*100}%"></span></div><div class="wave"></div><p class="audio-status">Recherche de l’extrait…</p><p><button class="primary play" disabled>▶ Écouter</button></p><div class="answers"><input id="song" placeholder="Titre de la chanson"><input id="alb" placeholder="Album"><input id="track" placeholder="N° de piste"></div><p><button class="primary" data-submit-blind>Valider</button></p><p>Score : ${g.score}</p></section></div>`}
function result(){
  let g=state.game,max=g.type==='quiz'?g.items.length:g.items.length*4;
  const isRecord=updateBestScore(g.type,g.score,max);
  return `<section class="hero result-screen" style="text-align:center;align-items:center">
    <button class="exit-game" data-result-home aria-label="Revenir à l’accueil" title="Accueil">×</button>
    <h1><small>Bravo</small>Aliénor !</h1>
    <p class="score">${g.score} / ${max}</p>${isRecord?'<p><b>Nouveau record ✦</b></p>':renderBestScore(g.type)}
    <div class="result-actions">
      <button class="primary" data-replay="${g.type}">↻ Rejouer</button>
      <button class="secondary" data-result-home>Retour à l’accueil</button>
    </div>
  </section>`
}

const artworkCache={};
async function findArtwork(title){
  if(artworkCache[title]) return artworkCache[title];
  try{
    const term=encodeURIComponent(`${title} Taylor Swift`);
    const data=await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=12`).then(r=>r.json());
    const clean=s=>(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const wanted=clean(title.replace(/\(Taylor’s Version\)/i,''));
    const hit=data.results.find(x=>clean(x.artistName).includes('taylorswift')&&(clean(x.collectionName).includes(wanted)||wanted.includes(clean(x.collectionName))));
    const url=hit?.artworkUrl100?.replace('100x100bb','600x600bb');
    if(url) artworkCache[title]=url;
    return url;
  }catch(e){return null}
}
async function hydrateArtwork(){
  const cards=[...document.querySelectorAll('.album[data-title]')];
  for(const card of cards){
    const url=await findArtwork(card.dataset.title);
    const cover=card.querySelector('.cover');
    if(url&&cover&&!cover.querySelector('img')){
      cover.classList.add('has-image');
      cover.insertAdjacentHTML('afterbegin',`<img class="album-image" src="${url}" alt="Pochette de ${card.dataset.title}">`);
    }
  }
  const big=document.querySelector('.big-cover[data-title]');
  if(big){
    const url=await findArtwork(big.dataset.title);
    if(url&&!big.querySelector('img')){
      big.classList.add('has-image');
      big.insertAdjacentHTML('afterbegin',`<img class="big-image" src="${url}" alt="Pochette de ${big.dataset.title}">`);
    }
  }
}

function render(){if(state.game&&state.route===state.game.type)app.innerHTML=state.game.type==='quiz'?quizGame():blindGame();else app.innerHTML=state.route==='home'?home():state.route==='rank'?rank():state.route==='album'?album():state.route==='ranking'?ranking():setup(state.route);app.focus();hydrateArtwork()}
document.addEventListener('click',e=>{
if(e.target.closest('[data-result-home]')){state.game?.audio?.pause();state.game=null;go('home');return}
const replayBtn=e.target.closest('[data-replay]');
if(replayBtn){
  const type=replayBtn.dataset.replay;
  state.game?.audio?.pause();
  state.game=null;
  if(type==='quiz') startQuiz();
  else startBlind();
  return;
}
if(e.target.closest('[data-exit-game]')){state.game?.audio?.pause();state.game=null;go('home');return}
const resetAllBtn=e.target.closest('[data-reset-all-rankings]');
if(resetAllBtn){
  const first=confirm('Réinitialiser toutes les notes de tous les albums ? Cette action supprimera tout le classement.');
  if(!first) return;
  const second=confirm('Dernière confirmation : toutes les notes seront définitivement supprimées de ce navigateur. Continuer ?');
  if(second){
    Object.keys(ratings).forEach(key=>delete ratings[key]);
    save();
    state.rankAlbum='all';
    state.rankSort='avg';
    state.rankDir='desc';
    render();
  }
  return;
}
const resetBtn=e.target.closest('[data-reset-album]');
if(resetBtn){
  const album=ALBUMS.find(a=>a.id===resetBtn.dataset.resetAlbum);
  if(album && confirm(`Réinitialiser toutes les notes de « ${album.title} » ?`)){
    album.tracks.forEach(track=>delete ratings[album.id+'|'+track]);
    save();
    render();
  }
  return;
}
const trackToggle=e.target.closest('[data-toggle-track]');
if(trackToggle){
  state.openTrack=state.openTrack===trackToggle.dataset.toggleTrack?null:trackToggle.dataset.toggleTrack;
  render();
  return;
}
const viewBtn=e.target.closest('[data-ranking-view]');
if(viewBtn){
  state.rankingView=viewBtn.dataset.rankingView;
  scheduleSync();
  render();
  return;
}
let b=e.target.closest('[data-rate]');if(b){let k=b.dataset.rate,c=+b.dataset.crit,v=+b.dataset.value;ratings[k]=ratings[k]||[0,0,0,0];ratings[k][c]=v;save();render()}if(e.target.dataset.count){state.count=+e.target.dataset.count;render()}if(e.target.dataset.level){state.level=e.target.dataset.level;render()}if(e.target.dataset.start==='quiz')startQuiz();if(e.target.dataset.start==='blindtest')startBlind();if(e.target.matches('.play')&&state.game.audio){state.game.audio.currentTime=state.level==='hard'?8:state.level==='easy'?0:4;state.game.audio.play();setTimeout(()=>state.game.audio.pause(),state.level==='hard'?5000:state.level==='easy'?15000:10000)}if(e.target.dataset.answer!==undefined){let g=state.game,q=g.items[g.i];if(+e.target.dataset.answer===q.a)g.score++;g.i++;render()}if(e.target.hasAttribute('data-submit-blind')){let g=state.game,item=g.items[g.i],norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/g,'');let pts=0;if(norm($('#song').value)===norm(item.title))pts+=2;if(norm($('#alb').value)&&norm(item.album).includes(norm($('#alb').value)))pts++;if(+$('#track').value===item.track)pts++;g.score+=pts;g.i++;g.audio?.pause();g.audio=null;render();if(g.i<g.items.length)loadAudio()}})

document.addEventListener('change',e=>{
  if(e.target.id==='rankAlbumFilter'){state.rankAlbum=e.target.value;render()}
  if(e.target.id==='rankSort'){state.rankSort=e.target.value;render()}
  if(e.target.id==='rankDir'){state.rankDir=e.target.value;render()}
});

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#authMessage').textContent='Connexion…';const {data,error}=await supabaseClient.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error){$('#authMessage').textContent='Identifiant ou mot de passe incorrect.';return}currentUser=data.user;$('#authSplash').hidden=true;await loadFromSupabase();render()});
$('#forgotPassword').onclick=async()=>{const email=$('#loginEmail').value.trim();if(!email){$('#authMessage').textContent='Saisis d’abord ton adresse e-mail.';return}const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});$('#authMessage').textContent=error?'Impossible d’envoyer le lien.':'Un lien de réinitialisation a été envoyé.'};
$('#logoutBtn').onclick=async()=>{await supabaseClient.auth.signOut();currentUser=null;closeMobileMenu();$('#authSplash').hidden=false};
$('#syncNowBtn').onclick=pushToSupabase;
supabaseClient.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null});
initAuth();
