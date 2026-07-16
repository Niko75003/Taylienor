
window.addEventListener('error',event=>{
  console.error('Runtime error',event.error||event.message);
  const splash=document.querySelector('#authSplash');
  if(splash && !splash.hidden){
    const message=document.querySelector('#authMessage');
    if(message) message.textContent="Une erreur est survenue. Recharge la page ; tes données locales sont conservées.";
  }
});
const $=s=>document.querySelector(s), app=$('#app');
const SUPABASE_URL='https://hohagbpmtrmofxmhaagn.supabase.co';
const SUPABASE_KEY='sb_publishable_oas22oztrHU_izZWmm5m3A_UMYEdcC7';
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storage:window.localStorage
  }
});
let currentUser=null,syncTimer=null;
let bestScores=JSON.parse(localStorage.getItem('alienor-best-scores')||'{}');

const state={route:'home',album:null,count:10,level:'normal',game:null,rankSort:'avg',rankDir:'desc',rankAlbum:'all',rankingView:'simple',openTrack:null};
const ratings=JSON.parse(localStorage.getItem('alienor-ratings')||'{}');
let ratingUpdated=JSON.parse(localStorage.getItem('alienor-rating-updated')||'{}');
let ratingCellUpdated=JSON.parse(localStorage.getItem('alienor-rating-cell-updated')||'{}');
let ratingDeleted=JSON.parse(localStorage.getItem('alienor-rating-deleted')||'{}');
let localUpdatedAt=localStorage.getItem('alienor-local-updated-at')||new Date(0).toISOString();

if(Object.keys(ratings).length && !Object.keys(ratingUpdated).length){
  const legacyAt=new Date(0).toISOString();
  Object.keys(ratings).forEach(key=>ratingUpdated[key]=legacyAt);
  localStorage.setItem('alienor-rating-updated',JSON.stringify(ratingUpdated));
}
if(!Object.keys(ratingCellUpdated).length){
  for(const [key,values] of Object.entries(ratings)){
    const stamp=ratingUpdated[key]||new Date(0).toISOString();
    ratingCellUpdated[key]=Array.from({length:4},(_,i)=>values?.[i]!==undefined?stamp:new Date(0).toISOString());
  }
  localStorage.setItem('alienor-rating-cell-updated',JSON.stringify(ratingCellUpdated));
}
const persistLocalState=()=>{
  localStorage.setItem('alienor-ratings',JSON.stringify(ratings));
  localStorage.setItem('alienor-rating-updated',JSON.stringify(ratingUpdated));
  localStorage.setItem('alienor-rating-cell-updated',JSON.stringify(ratingCellUpdated));
  localStorage.setItem('alienor-rating-deleted',JSON.stringify(ratingDeleted));
  localStorage.setItem('alienor-local-updated-at',localUpdatedAt);
};
const touchLocal=()=>{
  localUpdatedAt=new Date().toISOString();
  persistLocalState();
};
const save=()=>{touchLocal();scheduleSync()};
const allTracks=()=>ALBUMS.flatMap(a=>a.tracks.map((t,i)=>({title:t,album:a.title,albumId:a.id,track:i+1})));
const catalogCache=JSON.parse(localStorage.getItem('alienor-catalog-v2')||'{}');
const cleanAlbum=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/taylor.?s version/g,'').replace(/the anthology/g,'').replace(/deluxe version/g,'').replace(/[^a-z0-9]/g,'');
const cleanTrack=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(.*?version.*?\)/g,'').replace(/\(.*?from the vault.*?\)/g,'').replace(/[^a-z0-9]/g,'');
const trackId=(albumId,index)=>`track_${albumId}_${String(index+1).padStart(2,'0')}`;
const ratingKey=(albumId,index)=>trackId(albumId,index);
function findTrackIndex(albumId,title){
  const album=ALBUMS.find(a=>a.id===albumId);
  if(!album)return -1;
  const wanted=cleanTrack(title);
  let index=album.tracks.findIndex(track=>cleanTrack(track)===wanted);
  if(index<0) index=album.tracks.findIndex(track=>{
    const candidate=cleanTrack(track);
    return candidate && wanted && (candidate.includes(wanted)||wanted.includes(candidate));
  });
  return index;
}
function canonicalizeRatingStore(store,updated={},deleted={},cellUpdated={}){
  for(const key of Object.keys(store||{})){
    if(key.startsWith('track_'))continue;
    let albumId=null;
    let index=-1;

    const numbered=key.match(/^([^|]+)\|#(\d+)$/);
    if(numbered){
      albumId=numbered[1];
      index=Number(numbered[2])-1;
    }else{
      const split=key.indexOf('|');
      if(split>=0){
        albumId=key.slice(0,split);
        index=findTrackIndex(albumId,key.slice(split+1));
      }
    }

    if(!albumId || index<0)continue;
    const canonical=ratingKey(albumId,index);
    const oldTime=asTime(updated[key]);
    const canonicalTime=asTime(updated[canonical]);

    if(!store[canonical] || oldTime>=canonicalTime){
      store[canonical]=store[key];
      if(updated[key])updated[canonical]=updated[key];
      if(deleted[key])deleted[canonical]=deleted[key];
      if(cellUpdated[key])cellUpdated[canonical]=cellUpdated[key];
    }

    delete store[key];
    delete updated[key];
    delete deleted[key];
    delete cellUpdated[key];
  }
}

function localPayload(){
  return {
    ratings,
    ratingUpdated,
    ratingCellUpdated,
    ratingDeleted,
    bestScores,
    theme:localStorage.getItem('alienor-theme')||'soft-summer',
    preferences:{rankingView:state.rankingView||'simple'},
    updatedAt:localUpdatedAt,
    schemaVersion:4
  };
}
function persistBestScores(){localStorage.setItem('alienor-best-scores',JSON.stringify(bestScores))}
function setSyncStatus(text){const mobile=$('#syncStatus'),desktop=$('#desktopSyncStatus');if(mobile)mobile.textContent=text;if(desktop)desktop.textContent=text}
function asTime(value){
  const t=Date.parse(value||'');
  return Number.isFinite(t)?t:0;
}
function mergeRemotePayload(remote,rowUpdatedAt){
  canonicalizeRatingStore(ratings,ratingUpdated,ratingDeleted,ratingCellUpdated);

  const remoteFallback=remote?.updatedAt||rowUpdatedAt||new Date(0).toISOString();
  const remoteRatings={...(remote?.ratings||{})};
  const remoteUpdated={...(remote?.ratingUpdated||{})};
  const remoteCellUpdated={...(remote?.ratingCellUpdated||{})};
  const remoteDeleted={...(remote?.ratingDeleted||{})};

  canonicalizeRatingStore(remoteRatings,remoteUpdated,remoteDeleted,remoteCellUpdated);

  const keys=new Set([
    ...Object.keys(ratings),
    ...Object.keys(remoteRatings),
    ...Object.keys(ratingDeleted),
    ...Object.keys(remoteDeleted)
  ]);

  for(const key of keys){
    const localDelete=asTime(ratingDeleted[key]);
    const remoteDelete=asTime(remoteDeleted[key]);

    const localValues=Array.isArray(ratings[key])?[...ratings[key]]:[0,0,0,0];
    const remoteValues=Array.isArray(remoteRatings[key])?[...remoteRatings[key]]:[0,0,0,0];

    const localCells=Array.isArray(ratingCellUpdated[key])
      ? [...ratingCellUpdated[key]]
      : Array.from({length:4},()=>ratingUpdated[key]||new Date(0).toISOString());

    const remoteCells=Array.isArray(remoteCellUpdated[key])
      ? [...remoteCellUpdated[key]]
      : Array.from({length:4},()=>remoteUpdated[key]||remoteFallback);

    const newestCell=Math.max(
      ...localCells.map(asTime),
      ...remoteCells.map(asTime)
    );

    const newestDelete=Math.max(localDelete,remoteDelete);

    if(newestDelete>newestCell){
      delete ratings[key];
      delete ratingUpdated[key];
      delete ratingCellUpdated[key];
      ratingDeleted[key]=localDelete>=remoteDelete?ratingDeleted[key]:remoteDeleted[key];
      continue;
    }

    const merged=[0,0,0,0];
    const mergedCellUpdated=[new Date(0).toISOString(),new Date(0).toISOString(),new Date(0).toISOString(),new Date(0).toISOString()];

    for(let i=0;i<4;i++){
      const localTime=asTime(localCells[i]);
      const remoteTime=asTime(remoteCells[i]);

      if(remoteTime>localTime){
        merged[i]=Number(remoteValues[i]||0);
        mergedCellUpdated[i]=remoteCells[i]||remoteFallback;
      }else{
        merged[i]=Number(localValues[i]||0);
        mergedCellUpdated[i]=localCells[i]||new Date(0).toISOString();
      }
    }

    ratings[key]=merged;
    ratingCellUpdated[key]=mergedCellUpdated;
    ratingUpdated[key]=mergedCellUpdated.reduce((latest,current)=>asTime(current)>asTime(latest)?current:latest,new Date(0).toISOString());
    delete ratingDeleted[key];
  }

  if(remote?.bestScores){
    for(const [key,value] of Object.entries(remote.bestScores)){
      const local=bestScores[key];
      if(!local || Number(value.score)>Number(local.score)) bestScores[key]=value;
    }
    persistBestScores();
  }

  const remoteTime=asTime(remoteFallback);
  const localTime=asTime(localUpdatedAt);
  if(remoteTime>localTime){
    if(remote.theme) setTheme(remote.theme,{sync:false});
    if(remote.preferences?.rankingView) state.rankingView=remote.preferences.rankingView;
  }

  localUpdatedAt=new Date(Math.max(localTime,remoteTime)).toISOString();
  persistLocalState();
}
async function fetchRemoteRow(){
  if(!currentUser) return {data:null,error:null};
  return await supabaseClient.from('user_data')
    .select('data, updated_at')
    .eq('user_id',currentUser.id)
    .maybeSingle();
}
async function pushToSupabase(){
  if(!currentUser) return false;
  setSyncStatus('Synchronisation…');
  persistLocalState();
  const serverUpdatedAt=new Date().toISOString();
  const {error}=await supabaseClient.from('user_data').upsert({
    user_id:currentUser.id,
    data:localPayload(),
    updated_at:serverUpdatedAt
  },{onConflict:'user_id'});
  if(error){
    console.error('Supabase sync error',error);
    setSyncStatus('Erreur de synchronisation');
    return false;
  }
  setSyncStatus('Synchronisé à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));
  return true;
}
async function syncBothWays({silent=false}={}){
  if(!currentUser || window.__syncInProgress) return false;
  window.__syncInProgress=true;
  if(!silent) setSyncStatus('Synchronisation…');
  try{
    const {data,error}=await fetchRemoteRow();
    if(error) throw error;
    if(data?.data) mergeRemotePayload(data.data,data.updated_at);
    const ok=await pushToSupabase();
    return ok;
  }catch(error){
    console.error('Bidirectional sync error',error);
    setSyncStatus('Erreur de synchronisation');
    return false;
  }finally{
    window.__syncInProgress=false;
  }
}
function scheduleSync(){
  if(!currentUser) return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>syncBothWays({silent:true}),900);
}
async function loadFromSupabase(){
  if(!currentUser) return;
  await syncBothWays();
}
function scoreKey(type,count,level){return `${type}-${count}-${level}`}
function updateBestScore(type,score,max){
  const key=scoreKey(type,state.count,state.level),prev=bestScores[key];
  if(!prev||score>prev.score){
    bestScores[key]={score,max,date:new Date().toISOString()};
    persistBestScores();
    touchLocal();
    scheduleSync();
    return true;
  }
  return false;
}
function renderBestScore(type){const rec=bestScores[scoreKey(type,state.count,state.level)];return rec?`<p class="best-score">Meilleur score : <b>${rec.score}/${rec.max}</b></p>`:''}
async function initAuth(){
  const splash=$('#authSplash');
  try{
    const sessionPromise=supabaseClient.auth.getSession();
    const timeoutPromise=new Promise(resolve=>setTimeout(()=>resolve({data:{session:null},timeout:true}),6000));
    const response=await Promise.race([sessionPromise,timeoutPromise]);
    const session=response?.data?.session||null;
    currentUser=session?.user||null;

    if(!currentUser){
      splash.hidden=false;
      setSyncStatus(response?.timeout?'Connexion au service indisponible':'Déconnecté');
      return;
    }

    splash.hidden=true;
    const accountEmail=$('#desktopAccountEmail');
    if(accountEmail) accountEmail.textContent=currentUser.email||'Compte connecté';

    // The interface is usable immediately. Synchronization continues in the background.
    setSyncStatus('Synchronisation…');
    syncBothWays({silent:true}).then(ok=>{
      if(ok && !state.game) render();
    }).catch(error=>{
      console.error('Initial sync error',error);
      setSyncStatus('Synchronisation différée');
    });
  }catch(error){
    console.error('Authentication startup error',error);
    splash.hidden=false;
    setSyncStatus('Connexion au service indisponible');
  }
}
async function loadAlbumTracks(album){
  return album?.tracks||[];
}
async function ensureCatalog(){return ALBUMS}
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
function setTheme(name,{sync=true}={}){
  document.documentElement.dataset.theme=name;
  localStorage.setItem('alienor-theme',name);
  if(sync){touchLocal();scheduleSync()}
  document.querySelectorAll('[data-quick-theme]').forEach(b=>b.classList.toggle('active',b.dataset.quickTheme===name));
}
document.querySelectorAll('#themeDialog button[data-theme]').forEach(b=>b.onclick=(e)=>{
  e.preventDefault();
  e.stopPropagation();
  setTheme(b.dataset.theme);
  $('#themeDialog').close();
});
setTheme(localStorage.getItem('alienor-theme')||'soft-summer',{sync:false});

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
const accountBtn=$('#accountBtn'), accountMenu=$('#accountMenu');
function closeAccountMenu(){
  if(!accountMenu) return;
  accountMenu.hidden=true;
  accountBtn.setAttribute('aria-expanded','false');
}
accountBtn.onclick=e=>{
  e.stopPropagation();
  accountMenu.hidden=!accountMenu.hidden;
  accountBtn.setAttribute('aria-expanded',String(!accountMenu.hidden));
};
document.addEventListener('click',e=>{
  if(accountMenu && !accountMenu.hidden && !e.target.closest('.account-menu-wrap')) closeAccountMenu();
});


function back(target='home',label='Retour'){return `<div class="backbar"><button class="backbtn" data-route="${target}">← ${label}</button></div>`}
function head(title,text,backTo='home',backLabel='Accueil'){return `${back(backTo,backLabel)}<section class="page-head"><h1>${title}</h1><p>${text}</p></section>`}
function exitGame(){return `<div class="game-top-actions"><button class="backbtn" data-route="home">← Accueil</button><button class="exit-game" data-exit-game aria-label="Quitter et revenir à l’accueil" title="Quitter">×</button></div>`}
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
        <span>#</span><span>Titre</span><span>Reliability</span><span>Lyrics</span><span>Voice</span><span>Production</span><span>Total</span>
      </div>
      ${a.tracks.map((t,i)=>{
        const k=ratingKey(a.id,i),r=ratings[k]||[0,0,0,0],avg=r.some(Boolean)?r.reduce((x,y)=>x+y,0):'—';
        const isOpen=state.openTrack===k;
        return `<article class="track-mobile-card ${isOpen?'open':''}">
          <button class="track-mobile-summary" data-toggle-track="${k}" aria-expanded="${isOpen}">
            <span class="track-number">${i+1}</span>
            <b>${t}</b>
            <strong>${avg}${avg==='—'?'':'/20'}</strong>
            <span class="track-chevron">⌄</span>
          </button>
          <div class="track-mobile-votes">
            ${['Reliability','Lyrics','Voice','Production'].map((label,c)=>`
              <div class="mobile-criterion"><span>${label}</span>${dots(k,c,r[c])}</div>`).join('')}
          </div>
        </article>
        <div class="track desktop-track">
          <span>${i+1}</span><b>${t}</b>${r.map((v,c)=>dots(k,c,v)).join('')}<strong>${avg}${avg==='—'?'':'/20'}</strong>
        </div>`
      }).join('')}
    </div>
  </section>`
}
function ranking(){
  let rows=[];
  for(const a of ALBUMS)for(const [i,t] of a.tracks.entries()){
    let r=ratings[ratingKey(a.id,i)];
    if(r&&r.some(Boolean))rows.push({t,a:a.title,albumId:a.id,r,avg:r.reduce((x,y)=>x+y,0)});
  }
  if(state.rankAlbum!=='all') rows=rows.filter(x=>x.albumId===state.rankAlbum);
  const sortIndex={reliability:0,lyrics:1,voice:2,production:3};
  rows.sort((x,y)=>{
    let xv=state.rankSort==='avg'?x.avg:x.r[sortIndex[state.rankSort]];
    let yv=state.rankSort==='avg'?y.avg:y.r[sortIndex[state.rankSort]];
    return state.rankDir==='asc'?xv-yv:yv-xv;
  });
  const sortLabels={avg:'Note totale',reliability:'Reliability',lyrics:'Lyrics',voice:'Voice',production:'Production'};
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
        <span class="detail-col">Reliability</span><span class="detail-col">Lyrics</span><span class="detail-col">Voice</span><span class="detail-col">Production</span><span>Note /20</span>
      </div>
      ${rows.length?rows.map((x,i)=>`<div class="rankrow">
        <b>${i+1}</b><span>${x.t}</span><small>${x.a}</small>
        ${x.r.map(v=>`<span class="detail-col">${v}/5</span>`).join('')}<b>${x.avg}/20</b>
      </div>`).join(''):'<p>Aucun morceau évalué pour ce filtre.</p>'}
    </div>
  </section>`
}
function setup(type){let isB=type==='blindtest';return `<div class="game-shell">${exitGame()}${head(isB?'Blindtest':'Quiz','')}<section class="panel setup"><div class="option"><h3>${isB?'Nombre de morceaux':'Nombre de questions'}</h3><div class="segments">${[1,5,10,20].map(n=>`<button class="${state.count===n?'on':''}" data-count="${n}">${n}</button>`).join('')}</div></div><div class="option"><h3>Niveau de difficulté</h3><div class="segments" style="grid-template-columns:repeat(3,1fr)">${[['easy','Facile'],['normal','Normal'],['hard','Difficile']].map(x=>`<button class="${state.level===x[0]?'on':''}" data-level="${x[0]}">${x[1]}</button>`).join('')}</div></div>${renderBestScore(type)}<p style="text-align:center"><button class="primary" data-start="${type}">Lancer ${isB?'le blindtest':'le quiz'} ▶</button></p></section></div>`}
async function startQuiz(){
  app.innerHTML='<section class="panel game loading-state"><div class="loading-icon" aria-hidden="true"></div><h2>Préparation du quiz…</h2></section>';
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
const SUCCESS_PHRASES=[
  "On a enfin trouvé la 9e merveille du monde !",
  "Tu es la queen que tu penses être !",
  "Tu veux pas rater ? Même pas un peuuuu ?",
  "EX-TA-TIQUE..."
];
const FAILURE_PHRASES=[
  "Moi qui pensais que tu étais nulle à devineuf...",
  "Tu n'étais pas sensée être fan ?",
  "Est-ce que tu mérites vraiment Taylor ?",
  "Tu veux pas réussir ? Même pas un peuuuu ?"
];
const randomPhrase=list=>list[Math.floor(Math.random()*list.length)];
function feedbackScreen(){
  const g=state.game,f=g.feedback;
  const isQuiz=g.type==='quiz';
  const title=f.correct?'Bravo !':'Raté';
  const phrase=f.phrase||(f.phrase=randomPhrase(f.correct?SUCCESS_PHRASES:FAILURE_PHRASES));
  const detail=isQuiz
    ? `<p class="feedback-answer">Bonne réponse : <b>${f.correctAnswer}</b></p>`
    : `<div class="feedback-grid">
        <p>Titre : <b>${f.item.title}</b> ${f.songOk?'✓':'✕'}</p>
        <p>Album : <b>${f.item.album}</b> ${f.albumOk?'✓':'✕'}</p>
        <p>Piste : <b>${f.item.track}</b> ${f.trackOk?'✓':'✕'}</p>
        <p>Points gagnés : <b>${f.points}/4</b></p>
      </div>`;
  return `<div class="game-shell">${exitGame()}<section class="panel game feedback-screen ${f.correct?'success':'failure'}">
    <div class="feedback-symbol">${f.correct?'✓':'×'}</div>
    <h2>${title}</h2>
    <p class="feedback-phrase">${phrase}</p>
    ${detail}
    <button class="primary" data-next-question>${g.i+1>=g.items.length?'Voir le résultat':'Question suivante →'}</button>
  </section></div>`;
}
function quizGame(){
  let g=state.game;
  if(g.feedback)return feedbackScreen();
  if(g.i>=g.items.length)return result();
  let q=g.items[g.i];
  return `<div class="game-shell">${exitGame()}${head('Quiz',`${g.i+1} / ${g.items.length}`)}
  <section class="panel game"><div class="progress"><span style="width:${g.i/g.items.length*100}%"></span></div>
  <p><small>${q.c}</small></p>${q.image?`<figure class="quiz-photo"><img src="${q.image}" alt="Photo mystère de Taylor Swift"><figcaption>${q.credit||''}</figcaption></figure>`:''}
  <h2>${q.q}</h2><div class="quiz-options">${q.o.map((o,i)=>`<button data-answer="${i}">${String.fromCharCode(65+i)} · ${o}</button>`).join('')}</div>
  <p>Score : ${g.score}</p></section></div>`
}
async function startBlind(){
  app.innerHTML='<section class="panel game loading-state"><div class="loading-icon" aria-hidden="true"></div><h2>Préparation du blindtest…</h2></section>';
  await ensureCatalog();
  let items=allTracks().sort(()=>Math.random()-.5).slice(0,state.count);
  state.game={type:'blindtest',items,i:0,score:0,audio:null,playing:false,feedback:null};
  render();loadAudio()
}
async function loadAudio(){
  let g=state.game,item=g.items[g.i];
  try{
    let term=encodeURIComponent(`${item.title} Taylor Swift`);
    let data=await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=8`).then(r=>r.json());
    let hit=data.results.find(x=>x.artistName.toLowerCase().includes('taylor swift')&&x.previewUrl);
    if(hit){
      g.audio=new Audio(hit.previewUrl);
      g.audio.addEventListener('play',()=>{g.playing=true;document.querySelector('.wave')?.classList.add('playing');document.querySelector('.play')?.classList.add('playing')});
      const stop=()=>{g.playing=false;document.querySelector('.wave')?.classList.remove('playing');document.querySelector('.play')?.classList.remove('playing')};
      g.audio.addEventListener('pause',stop);g.audio.addEventListener('ended',stop);
      const playBtn=$('.play');if(playBtn){playBtn.disabled=false;playBtn.classList.add('ready')}
      document.querySelector('.audio-loading')?.remove();
    }else{
      const s=$('.audio-status');if(s)s.textContent='Extrait indisponible';
    }
  }catch(e){const s=$('.audio-status');if(s)s.textContent='Connexion audio indisponible'}
}
function blindGame(){
  let g=state.game;
  if(g.feedback)return feedbackScreen();
  if(g.i>=g.items.length)return result();
  return `<div class="game-shell">${exitGame()}${head('Blindtest',`${g.i+1} / ${g.items.length}`)}
  <section class="panel game">
    <div class="blind-rules" aria-label="Barème des points">
  <span><b>2</b><small>titre</small></span>
  <span><b>1</b><small>album</small></span>
  <span><b>1</b><small>numéro de piste</small></span>
</div>
    <div class="progress"><span style="width:${g.i/g.items.length*100}%"></span></div>
    <div class="wave"></div>
    <div class="audio-loading"><div class="loading-icon mini" aria-hidden="true"></div><p class="audio-status">Recherche de l’extrait…</p></div>
    <p><button class="primary play" disabled><span class="play-arrow">▶</span> Écouter</button></p>
    <div class="answers"><input id="song" placeholder="Titre de la chanson"><input id="alb" placeholder="Album"><input id="track" placeholder="N° de piste"></div>
    <p><button class="primary" data-submit-blind>Valider</button></p><p>Score : ${g.score}</p>
  </section></div>`
}
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
const nextBtn=e.target.closest('[data-next-question]');
if(nextBtn){
  const g=state.game;
  g.feedback=null;
  g.i++;
  render();
  if(g.type==='blindtest'&&g.i<g.items.length)loadAudio();
  return;
}
const resetAllBtn=e.target.closest('[data-reset-all-rankings]');
if(resetAllBtn){
  const first=confirm('Réinitialiser toutes les notes de tous les albums ? Cette action supprimera tout le classement.');
  if(!first) return;
  const second=confirm('Dernière confirmation : toutes les notes seront définitivement supprimées de ce navigateur. Continuer ?');
  if(second){
    const deletedAt=new Date().toISOString();
    Object.keys(ratings).forEach(key=>{
      delete ratings[key];
      delete ratingUpdated[key];
      delete ratingCellUpdated[key];
      ratingDeleted[key]=deletedAt;
    });
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
    const deletedAt=new Date().toISOString();
    album.tracks.forEach((track,index)=>{
      const key=ratingKey(album.id,index);
      delete ratings[key];
      delete ratingUpdated[key];
      delete ratingCellUpdated[key];
      ratingDeleted[key]=deletedAt;
    });
    Object.keys(ratings).filter(key=>key.startsWith(album.id+'|')||key.startsWith(`track_${album.id}_`)).forEach(key=>{
      delete ratings[key];
      delete ratingUpdated[key];
      delete ratingCellUpdated[key];
      ratingDeleted[key]=deletedAt;
    });
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
  touchLocal();
  scheduleSync();
  render();
  return;
}
let b=e.target.closest('[data-rate]');if(b){
  let k=b.dataset.rate,c=+b.dataset.crit,v=+b.dataset.value;
  ratings[k]=ratings[k]||[0,0,0,0];
  ratings[k][c]=(v===1&&ratings[k][c]===1)?0:v;
  const changedAt=new Date().toISOString();
  ratingUpdated[k]=changedAt;
  ratingCellUpdated[k]=Array.isArray(ratingCellUpdated[k])?ratingCellUpdated[k]:[new Date(0).toISOString(),new Date(0).toISOString(),new Date(0).toISOString(),new Date(0).toISOString()];
  ratingCellUpdated[k][c]=changedAt;
  delete ratingDeleted[k];
  save();
  render();
}if(e.target.dataset.count){state.count=+e.target.dataset.count;render()}if(e.target.dataset.level){state.level=e.target.dataset.level;render()}if(e.target.dataset.start==='quiz')startQuiz();if(e.target.dataset.start==='blindtest')startBlind();if(e.target.closest('.play')&&state.game.audio){
  state.game.audio.currentTime=state.level==='hard'?8:state.level==='easy'?0:4;
  state.game.audio.play();
  clearTimeout(state.game.pauseTimer);
  state.game.pauseTimer=setTimeout(()=>state.game.audio.pause(),state.level==='hard'?5000:state.level==='easy'?15000:10000);
}if(e.target.dataset.answer!==undefined){
  let g=state.game,q=g.items[g.i],chosen=+e.target.dataset.answer,correct=chosen===q.a;
  if(correct)g.score++;
  g.feedback={correct,correctAnswer:q.o[q.a]};
  render();
}if(e.target.hasAttribute('data-submit-blind')){
  let g=state.game,item=g.items[g.i];
  const normalize=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(taylor.?s version\)/g,'').replace(/\bthe\b/g,'').replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
  const levenshtein=(a,b)=>{if(!a.length)return b.length;if(!b.length)return a.length;const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const tmp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp}}return row[b.length]};
  const similarity=(a,b)=>{a=normalize(a);b=normalize(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return Math.min(a.length,b.length)/Math.max(a.length,b.length)+0.15;return 1-levenshtein(a,b)/Math.max(a.length,b.length)};
  const significantWords=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\(taylor.?s version\)/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>=3&&!['the','and','for','with','from','this','that','you','your','are','was','were','its','into','out','too'].includes(w));
  const hasThreeCloseWords=(input,target)=>{const inputWords=significantWords(input),targetWords=significantWords(target);if(inputWords.length<3||targetWords.length<3)return false;let matched=0;const used=new Set();for(const tw of targetWords){let bestIndex=-1,bestScore=0;inputWords.forEach((iw,idx)=>{if(used.has(idx))return;const score=similarity(iw,tw);if(score>bestScore){bestScore=score;bestIndex=idx}});if(bestScore>=0.72&&bestIndex>=0){matched++;used.add(bestIndex)}if(matched>=3)return true}return false};
  const songOk=similarity($('#song').value,item.title)>=0.68||hasThreeCloseWords($('#song').value,item.title);
  const albumOk=similarity($('#alb').value,item.album)>=0.58;
  const trackOk=String($('#track').value).trim()!==''&&+$('#track').value===item.track;
  const points=(songOk?2:0)+(albumOk?1:0)+(trackOk?1:0);
  g.score+=points;
  g.audio?.pause();g.audio=null;
  g.feedback={correct:points===4,item,songOk,albumOk,trackOk,points};
  render();
}
})

document.addEventListener('change',e=>{
  if(e.target.id==='rankAlbumFilter'){state.rankAlbum=e.target.value;render()}
  if(e.target.id==='rankSort'){state.rankSort=e.target.value;render()}
  if(e.target.id==='rankDir'){state.rankDir=e.target.value;render()}
});

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const message=$('#authMessage');
  const submit=e.currentTarget.querySelector('button[type="submit"]');
  const email=$('#loginEmail').value.trim().toLowerCase();
  const password=$('#loginPassword').value;

  if(!email || !password){
    message.textContent='Saisis ton adresse e-mail et ton mot de passe.';
    return;
  }

  message.textContent='Connexion…';
  if(submit) submit.disabled=true;

  try{
    const authRequest=supabaseClient.auth.signInWithPassword({email,password});
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('AUTH_TIMEOUT')),12000));
    const {data,error}=await Promise.race([authRequest,timeout]);

    if(error) throw error;
    currentUser=data?.user||data?.session?.user||null;
    if(!currentUser) throw new Error('SESSION_MISSING');

    $('#authSplash').hidden=true;
    const accountEmail=$('#desktopAccountEmail');
    if(accountEmail) accountEmail.textContent=currentUser.email||'Compte connecté';
    message.textContent='';
    render();
    setSyncStatus('Synchronisation…');

    // La connexion est terminée ; le cloud ne bloque plus l’ouverture du site.
    syncBothWays({silent:true}).then(ok=>{
      if(ok && !state.game) render();
    }).catch(error=>{
      console.error('Post-login sync error',error);
      setSyncStatus('Synchronisation différée');
    });
  }catch(error){
    console.error('Login error',error);
    if(error?.message==='AUTH_TIMEOUT'){
      message.textContent='La connexion prend trop de temps. Vérifie Internet puis réessaie.';
    }else if(error?.message?.toLowerCase().includes('invalid login credentials')){
      message.textContent='Adresse e-mail ou mot de passe incorrect.';
    }else{
      message.textContent='Connexion impossible pour le moment. Réessaie dans quelques secondes.';
    }
  }finally{
    if(submit) submit.disabled=false;
  }
});
$('#forgotPassword').onclick=async()=>{const email=$('#loginEmail').value.trim();if(!email){$('#authMessage').textContent='Saisis d’abord ton adresse e-mail.';return}const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});$('#authMessage').textContent=error?'Impossible d’envoyer le lien.':'Un lien de réinitialisation a été envoyé.'};
async function logoutUser(){await supabaseClient.auth.signOut();currentUser=null;closeMobileMenu();closeAccountMenu();$('#authSplash').hidden=false}
async function syncUserNow(){
  setSyncStatus('Synchronisation…');
  const ok=await syncBothWays();
  if(ok){
    render();
    showSyncToast('Données synchronisées');
  }
}

function resetAllScores(){
  const first=confirm('Réinitialiser tous les meilleurs scores du Quiz et du Blindtest ?');
  if(!first)return;
  const second=confirm('Dernière confirmation : tous les records seront supprimés. Continuer ?');
  if(!second)return;
  bestScores={};
  persistBestScores();
  touchLocal();
  scheduleSync();
  showSyncToast('Tous les scores ont été réinitialisés');
  render();
}
$('#logoutBtn').onclick=logoutUser;
$('#desktopLogoutBtn').onclick=logoutUser;
$('#syncNowBtn').onclick=syncUserNow;
$('#desktopSyncBtn').onclick=syncUserNow;
$('#resetScoresBtn').onclick=resetAllScores;
$('#desktopResetScoresBtn').onclick=resetAllScores;

async function refreshFromCloud(){
  const ok=await syncBothWays({silent:true});
  if(ok && !state.game) render();
}
window.addEventListener('focus',refreshFromCloud);
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible') refreshFromCloud();
});
window.addEventListener('online',refreshFromCloud);
setInterval(()=>{
  if(document.visibilityState==='visible' && !state.game) refreshFromCloud();
},30000);

supabaseClient.auth.onAuthStateChange((event,session)=>{
  currentUser=session?.user||null;
  if(!currentUser){
    setSyncStatus('Déconnecté');
    return;
  }
  const splash=$('#authSplash');
  if(splash) splash.hidden=true;
  const accountEmail=$('#desktopAccountEmail');
  if(accountEmail) accountEmail.textContent=currentUser.email||'Compte connecté';
  if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED') refreshFromCloud();
});
canonicalizeRatingStore(ratings,ratingUpdated,ratingDeleted,ratingCellUpdated);
persistLocalState();
render();
initAuth();
