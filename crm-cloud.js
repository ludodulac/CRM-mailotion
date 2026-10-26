(()=>{
'use strict';
/* Mailotion privé — Google Sheets, accès OAuth via Google Identity Services.
   Aucun jeton ni secret stocké. Le client OAuth et l'ID du document, non secrets,
   sont stockés uniquement dans le navigateur. */
const CFG='mailotion-private-config-v2', ACT='mailotion-actions-v2', EM='mailotion-emails-v2', MIG='mailotion-precloud-snapshot-v2';
const SCOPE='https://www.googleapis.com/auth/spreadsheets';
const TABLES={
 Prospects:{count:7,cols:['id','name','stage','priority','followup','updatedAt','json']},
 Actions:{count:8,cols:['id','prospectId','date','due','type','status','description','json']},
 Emails:{count:7,cols:['id','prospectId','email','status','active','verifiedAt','json']}
};
const knownEmailStatuses=new Set(['trouve_non_teste','confirme','invalide','alternatif_a_tester']);
const $=id=>document.getElementById(id);
const api=()=>window.MailotionCRM;
const clone=o=>JSON.parse(JSON.stringify(o));
const val=(s,max=4000)=>String(s??'').slice(0,max).trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const uid=(prefix='crm')=>prefix+'-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const norm=s=>val(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const state={client:'',sheet:'',token:'',expiry:0,authClient:null,connected:false,busy:false,applying:false,actions:[],emails:[],baseline:{Prospects:new Map(),Actions:new Map(),Emails:new Map()},lastUi:new Map(),dirty:false,lastSync:'',activeProspect:'',editingAction:'',initialized:false};
let timer,actionTimer;
function saveLocal(){
 try{localStorage.setItem(ACT,JSON.stringify(state.actions));localStorage.setItem(EM,JSON.stringify(state.emails));return true}catch(e){api().toast('Stockage plein. Exporte une sauvegarde du CRM.');return false}
}
function loadLocal(){
 try{const a=JSON.parse(localStorage.getItem(ACT)||'[]');const e=JSON.parse(localStorage.getItem(EM)||'[]');state.actions=Array.isArray(a)?a:[];state.emails=Array.isArray(e)?e:[]}catch{}
 try{const c=JSON.parse(localStorage.getItem(CFG)||'{}');state.client=val(c.client,210);state.sheet=val(c.sheet,240)}catch{}
 const link=new URLSearchParams(location.search).get('sheet');
 if(link&&/^[\w-]{25,160}$/.test(link)){state.sheet=link;try{localStorage.setItem(CFG,JSON.stringify({client:state.client,sheet:state.sheet}))}catch{}history.replaceState(null,'',location.pathname+location.hash)}
 $('cloudClientId').value=state.client;$('cloudSheetId').value=state.sheet;
}
function snapshot(){
 const r=api().state.records;state.lastUi=new Map(r.map(x=>[x.id,clone(x)]));
}
function showCloud(txt,status=''){
 const el=$('cloudPanel');el.classList.toggle('connected',status==='connected');el.classList.toggle('error',status==='error');
 $('cloudMessage').textContent=txt;
 $('cloudConnect').textContent=status==='connected'?'↻ Synchroniser':'Connecter Google';
}
function showDialog(id){const e=$(id);if(!e.open)e.showModal();document.body.style.overflow='hidden'}
function closeDialog(id){const e=$(id);if(e.open)e.close();document.body.style.overflow=''}
function saveSettings(){
 const client=val($('cloudClientId').value,210),sheet=val($('cloudSheetId').value,240);
 if(client&&!/^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(client)){api().toast('L’identifiant OAuth doit finir par .apps.googleusercontent.com');return false}
 if(sheet&&!/^[a-zA-Z0-9_-]{25,180}$/.test(sheet)){api().toast('Utilise uniquement l’identifiant du Google Sheets, sans l’URL complète.');return false}
 state.client=client;state.sheet=sheet;
 localStorage.setItem(CFG,JSON.stringify({client,sheet}));
 api().toast('Configuration conservée sur ce téléphone.');
 return true;
}
async function loadGIS(){
 if(window.google?.accounts?.oauth2)return;
 if(!window.__mailotionGis){window.__mailotionGis=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
  s.onload=()=>resolve();s.onerror=()=>reject(Error("Google Identity Services ne répond pas."));document.head.append(s);
 });}
 await window.__mailotionGis;
 if(!window.google?.accounts?.oauth2)throw Error('Google Identity Services est indisponible.');
}
function tokenReady(){return !!state.token&&Date.now()<state.expiry-60_000}
function oauth(){
 return new Promise(async(resolve,reject)=>{
  if(tokenReady()){resolve();return}
  try{
   if(!state.client||!state.sheet)throw Error('Renseigne les deux paramètres Google avant de te connecter.');
   await loadGIS();
   const client=google.accounts.oauth2.initTokenClient({client_id:state.client,scope:SCOPE,callback:result=>{
    if(!result||result.error||!result.access_token){reject(Error(result?.error_description||result?.error||'Connexion refusée'));return}
    state.token=result.access_token;state.expiry=Date.now()+(Number(result.expires_in||3600)*1000);resolve();
   },error_callback:e=>reject(Error(e.message||e.type||'Connexion Google interrompue'))});
   state.authClient=client;
   client.requestAccessToken({prompt:''});
  }catch(e){reject(e)}
 });
}
async function request(url,options={}){
 if(!tokenReady())throw Error('Connexion Google expirée. Appuie sur « Connecter Google ».');
 const r=await fetch(url,{...options,cache:'no-store',headers:{Authorization:'Bearer '+state.token,...options.headers}});
 let body=null;try{body=await r.json()}catch{}
 if(!r.ok){if(r.status===401){state.token='';state.connected=false}const msg=body?.error?.message||r.statusText||'Erreur Google';
  throw Error('Google Sheets '+r.status+' : '+msg)}
 return body;
}
const baseURL=()=> 'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(state.sheet);
const clean=(table,raw)=>{
 const obj=raw&&typeof raw==='object'?clone(raw):{};
 if(table==='Prospects')return api().sanitize(obj,obj.origin==='github'?'github':'local');
 if(table==='Actions')return {id:val(obj.id,130),prospectId:val(obj.prospectId,130),date:val(obj.date,10),due:val(obj.due,10),type:val(obj.type,70),status:val(obj.status,35)||'a_faire',description:val(obj.description,2600),next:val(obj.next,800),channel:['whatsapp','email','telephone','newsletter','site'].includes(obj.channel)?obj.channel:'',recipient:val(obj.recipient,240),message:val(obj.message,1800),callGuide:Array.isArray(obj.callGuide)?obj.callGuide.slice(0,15).map(item=>({q:val(item?.q,170),a:val(item?.a,560)})).filter(item=>item.q&&item.a):[],diagnosticAnswers:obj.diagnosticAnswers&&typeof obj.diagnosticAnswers==='object'&&!Array.isArray(obj.diagnosticAnswers)?Object.fromEntries(Object.entries(obj.diagnosticAnswers).slice(0,35).filter(([key,value])=>/^[a-z_]{2,40}$/.test(key)&&['yes','no','na',''].includes(value))):{},
 diagnosticNotes:obj.diagnosticNotes&&typeof obj.diagnosticNotes==='object'?{goal:val(obj.diagnosticNotes.goal,250),tool:val(obj.diagnosticNotes.tool,150),notes:val(obj.diagnosticNotes.notes,1000)}:{goal:'',tool:'',notes:''},
 diagnosticEvidence:obj.diagnosticEvidence&&typeof obj.diagnosticEvidence==='object'?Object.fromEntries(Object.entries(obj.diagnosticEvidence).slice(0,20).filter(([key,value])=>/^[a-z_]{2,40}$/.test(key)&&typeof value==='string').map(([key,value])=>[key,val(value,300)])):{},
 diagnosticUpdatedAt:val(obj.diagnosticUpdatedAt,45),completedAt:val(obj.completedAt,45),updatedAt:val(obj.updatedAt,45),createdAt:val(obj.createdAt,45)};
 return {id:val(obj.id,130),prospectId:val(obj.prospectId,130),email:val(obj.email,240),status:knownEmailStatuses.has(obj.status)?obj.status:'trouve_non_teste',active:obj.active===true,verifiedAt:val(obj.verifiedAt,10),notes:val(obj.notes,2000),source:val(obj.source,450),updatedAt:val(obj.updatedAt,45),createdAt:val(obj.createdAt,45)};
};
function values(table,item){
 const j=JSON.stringify(item);
 if(table==='Prospects')return [item.id,item.name||'',item.stage||'',item.priority||'',item.followup||'',item.updatedAt||'',j];
 if(table==='Actions')return [item.id,item.prospectId||'',item.date||'',item.due||'',item.type||'',item.status||'',item.description||'',j];
 return [item.id,item.prospectId||'',item.email||'',item.status||'',item.active?'oui':'non',item.verifiedAt||'',j];
}
async function fetchAll(){
 const qs=['Prospects!A2:G','Actions!A2:H','Emails!A2:G'].map(r=>'ranges='+encodeURIComponent(r)).join('&');
 const response=await request(baseURL()+'/values:batchGet?'+qs);
 const result={Prospects:new Map(),Actions:new Map(),Emails:new Map()};
 for(const [n,table] of Object.keys(result).entries()){
  const rows=response.valueRanges?.[n]?.values||[];
  for(let i=0;i<rows.length;i++){const row=rows[i];if(!row?.[0]||!row[table==='Prospects'?6:table==='Actions'?7:6])continue;
   try{const obj=clean(table,JSON.parse(row[table==='Actions'?7:6]));if(obj?.id){result[table].set(obj.id,{row:i+2,data:obj});}}catch{}
  }
 }
 return result;
}
async function upsert(table,data,currentRows){
 const found=currentRows.get(data.id),n=TABLES[table].count,range=encodeURIComponent("'"+table+"'!A"+(found?found.row:'')+':'+String.fromCharCode(64+n)+(found?found.row:''));
 if(found){
  await request(baseURL()+'/values/'+range+'?valueInputOption=RAW',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({range:"'"+table+"'!A"+found.row+':'+String.fromCharCode(64+n)+found.row,majorDimension:'ROWS',values:[values(table,data)]})});
  found.data=clone(data);
 }else{
  const appendRange=encodeURIComponent("'"+table+"'!A:"+String.fromCharCode(64+n));
  const output=await request(baseURL()+'/values/'+appendRange+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({values:[values(table,data)]})});
  const updated=output?.updates?.updatedRange||'';
  const m=updated.match(/![A-Z]+(\d+)/);const pos=m?Number(m[1]):(Math.max(1,...[...currentRows.values()].map(v=>v.row))+1);
  currentRows.set(data.id,{row:pos,data:clone(data)});
 }
}
function compare(a,b){return JSON.stringify(a??null)===JSON.stringify(b??null)}
function isBlank(v){return v===''||v===null||v===undefined||v===false}
function mergeRecord(table,remote,local,oldBaseline=null){
 if(!remote)return clone(local);
 if(!local)return clone(remote);
 const merged={...remote};
 for(const [key,value] of Object.entries(local)){
  if(key==='id'||key==='updatedAt')continue;
  const previous=oldBaseline?.[key];
  const changedLocally=oldBaseline? !compare(value,previous):(!isBlank(value)&&isBlank(remote[key]));
  const changedRemotely=oldBaseline? !compare(remote[key],previous):false;
  if(changedLocally&&!changedRemotely)merged[key]=value;
  else if(changedLocally&&changedRemotely&&!compare(value,remote[key])){
   // Preserve both versions; avoid silent loss and overwriting another ChatGPT edit.
   try{const k='mailotion-conflicts-v1',a=JSON.parse(localStorage.getItem(k)||'[]');
    a.push({date:new Date().toISOString(),table,id:local.id,field:key,local:value,remote:remote[key]});
    localStorage.setItem(k,JSON.stringify(a.slice(-100)))}catch{}
   state.hadConflict=true;
  }
 }
 merged.updatedAt=(!compare({...merged,updatedAt:undefined},{...remote,updatedAt:undefined}))
  ?new Date().toISOString():remote.updatedAt;
 return merged;
}
function fp(p){
 if(p.website)try{return 'web:'+new URL(/^https?:\/\//.test(p.website)?p.website:'https://'+p.website).hostname.replace(/^www\./,'').toLowerCase()}catch{}
 return 'name:'+norm(p.name)+'|'+norm(p.city);
}
function deduplicate(contacts){
 const used=new Set(),result=[];
 for(const lead of contacts){const k=fp(lead);if(used.has(k))continue;used.add(k);result.push(lead)}
 return result;
}
async function syncCloud({initial=false}={}){
 if(state.busy||!tokenReady())return;
 state.busy=true;$('cloudConnect').disabled=true;showCloud('↻ Synchronisation sécurisée en cours…');
 const local=api().state.records.map(clone);const actions=state.actions.map(clone);const emails=state.emails.map(clone);
 const localDelete=new Set(api().state.deleted);
 try{
  const remote=await fetchAll();
  const imported={Prospects:[],Actions:[],Emails:[]};
  const pending={Prospects:[],Actions:[],Emails:[]};
  // Keep the local state intact until remote has been read successfully.
  const rIndex=new Map([...remote.Prospects.values()].map(x=>[fp(x.data),x.data.id]));
  const localRecordMap=new Map(local.map(x=>[x.id,x]));
  for(const [id,entry] of remote.Prospects){
   const r=entry.data;if(r.archived||localDelete.has(id))continue;
   let l=localRecordMap.get(id);
   if(!l){const candidate=local.find(x=>fp(x)===fp(r));if(candidate){l={...candidate,id};localRecordMap.delete(candidate.id);}}
   const merged=mergeRecord('Prospects',r,l,state.baseline.Prospects.get(id));
   imported.Prospects.push(merged);
   if(!compare(merged,r))pending.Prospects.push(merged);
   localRecordMap.delete(id);
  }
  for(const l of localRecordMap.values()){
   if(localDelete.has(l.id))continue;
   const dupeId=rIndex.get(fp(l));if(dupeId){const m=imported.Prospects.find(x=>x.id===dupeId);if(m){const merged=mergeRecord('Prospects',m,l,null);Object.assign(m,merged);if(!pending.Prospects.some(x=>x.id===dupeId))pending.Prospects.push(m)}}
   else {imported.Prospects.push(l);pending.Prospects.push(l);}
  }
  imported.Prospects=deduplicate(imported.Prospects);
  for(const name of ['Actions','Emails']){
   const localArray=name==='Actions'?actions:emails;const localMap=new Map(localArray.map(x=>[x.id,clean(name,x)]));
   for(const [id,entry] of remote[name]){
    const r=entry.data,l=localMap.get(id);
    const merged=mergeRecord(name,r,l,state.baseline[name].get(id));
    imported[name].push(merged);
    if(!compare(merged,r))pending[name].push(merged);
    localMap.delete(id);
   }
   for(const l of localMap.values()){imported[name].push(l);pending[name].push(l)}
  }
  if(localDelete.size){
   for(const [id,entry] of remote.Prospects){if(localDelete.has(id)&&!entry.data.archived){pending.Prospects.push({...entry.data,archived:true,updatedAt:new Date().toISOString()})}}
  }
  const operations=pending.Prospects.length+pending.Actions.length+pending.Emails.length;
  for(const t of ['Prospects','Actions','Emails'])for(const item of pending[t])await upsert(t,item,remote[t]);
  // Recheck server after writes. If a response fails, do not discard local changes.
  const verified=await fetchAll();
  state.baseline={Prospects:new Map([...verified.Prospects].map(([id,r])=>[id,clone(r.data)])),Actions:new Map([...verified.Actions].map(([id,r])=>[id,clone(r.data)])),Emails:new Map([...verified.Emails].map(([id,r])=>[id,clone(r.data)]))};
  state.applying=true;
  api().state.records=imported.Prospects.filter(x=>!x.archived&&!localDelete.has(x.id)).map(x=>api().sanitize(x,x.origin==='github'?'github':'local'));
  // The current UI retains the original localStorage key, keeping migration reversible.
  api().persist();state.actions=imported.Actions;state.emails=imported.Emails;saveLocal();api().render();
  state.applying=false;snapshot();renderToday();
  state.connected=true;state.dirty=false;state.lastSync=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  showCloud('✓ Synchronisé avec le Google Sheets privé à '+state.lastSync+'. '+state.baseline.Prospects.size+' boutiques, '+state.baseline.Actions.size+' actions.', 'connected');
  if(state.hadConflict){api().toast('⚠ Conflit détecté : la version distante est conservée. Copie locale disponible en sauvegarde des conflits.');state.hadConflict=false}
  else if(operations)api().toast('✓ '+operations+' fiche(s) ou action(s) synchronisée(s) et vérifiée(s).');
  else if(!initial)api().toast('✓ Synchronisation vérifiée : tout est à jour.');
 }catch(e){
  state.applying=false;
  showCloud('⚠ Synchronisation impossible : '+e.message,'error');
  api().toast('Sauvegarde sur le téléphone conservée. '+e.message);
 }finally{state.busy=false;$('cloudConnect').disabled=false}
}
function scheduleCloud(){
 if(state.applying)return;
 state.dirty=true;
 if(!state.connected||!tokenReady()){
   showCloud('● Modifications locales non synchronisées. Appuie sur Connecter Google pour les envoyer.','error');
   state.connected=false;return;
 }
 showCloud('● Enregistrement des changements dans Google en attente…');
 clearTimeout(timer);timer=setTimeout(()=>syncCloud(),1250);
}
// Une fiche de campagne publiée est immédiatement exploitable sur Android, même
// sans autorisation Google. Les vrais résultats restent exclusivement privés.
// Identifiants identiques aux Actions du Sheets : pas de doublons à la synchro.
function seedPublicCallTasks(){
 const listed=new Set(state.actions.map(a=>a.id));
 const stamp=new Date().toISOString();
 let added=0;
 for(const p of api().state.records){
  if(p.callCampaign!=='savonneries-2026-10'||!p.phone||p.archived||p.stage==='sans_suite')continue;
  const id='call-20261026-'+p.id;
  if(listed.has(id))continue;
  const a={id,prospectId:p.id,date:'2026-10-26',due:'',type:'appel',
    status:'a_faire',description:'Appeler '+p.name+' — session savonneries',
    next:'Noter le résultat réel après avoir composé le numéro. En cas de refus, ne pas recontacter.',
    channel:'telephone',recipient:p.phone,message:'',
    callGuide:[
      {q:'Pourquoi cette boutique ?',a:'Savonnerie artisanale e-commerce : consulter le site officiel avant l’appel.'},
      {q:'Une piste à vérifier',a:p.callAngle||'Conseils après achat ou réachat, uniquement si besoin confirmé.'},
      {q:'Objectif',a:'Proposer un échange de 15 minutes si pertinent, sans inventer de résultats.'}
    ],
    completedAt:'',createdAt:stamp,updatedAt:stamp};
  state.actions.push(a);listed.add(id);added++;
 }
 if(added)saveLocal();
 return added;
}
function trackLocal(){
 if(state.applying)return;
 const before=state.lastUi;
 for(const rec of api().state.records){
  const old=before.get(rec.id);if(!old)continue;
  if(rec.email!==old.email||(rec.emailStatus||'')!==(old.emailStatus||'')){
   if(rec.email&&rec.email!==old.email){
    for(const x of state.emails)if(x.prospectId===rec.id&&x.active)x.active=false;
    const exists=state.emails.find(x=>x.prospectId===rec.id&&x.email===rec.email&&x.status===rec.emailStatus);
    if(!exists)state.emails.push({id:uid('email'),prospectId:rec.id,email:rec.email,status:rec.emailStatus||'trouve_non_teste',active:rec.emailStatus!=='invalide',verifiedAt:'',notes:'',source:'',updatedAt:new Date().toISOString(),createdAt:new Date().toISOString()});
   }else if(rec.email&&rec.emailStatus!==old.emailStatus){
    for(const x of state.emails)if(x.prospectId===rec.id&&x.active)x.active=false;
    state.emails.push({id:uid('email'),prospectId:rec.id,email:rec.email,status:rec.emailStatus||'trouve_non_teste',active:rec.emailStatus!=='invalide',verifiedAt:'',notes:'État actualisé depuis la fiche de la boutique.',source:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
   }
   saveLocal();
  }
 }
 const seeded=seedPublicCallTasks();
 snapshot();renderToday();scheduleCloud();
}
function getProspect(id){return api().state.records.find(x=>x.id===id)}
const date=()=>api().today(),format=d=>/^\d{4}-\d\d-\d\d$/.test(d)?d.split('-').reverse().join('/'):'date non précisée';
const done=a=>a.status==='terminee'||a.status==='annulee';
const validDate=s=>/^\d{4}-\d\d-\d\d$/.test(s)?s:'';
function actionForUI(a){
 const r=getProspect(a.prospectId);return '<article class="today-card '+(a.due&&a.due<date()?'priority':'')+'">'+
  '<label><input type="checkbox" data-task-complete="'+esc(a.id)+'" '+(done(a)?'checked':'')+' aria-label="Terminer la tâche"><span><b>'+esc(a.description||a.type||'Tâche')+'</b><p>'+esc(r?.name||'Boutique inconnue')+' · '+esc(a.type||'Tâche')+(a.due?' · '+format(a.due):'')+'</p></span></label>'+
  '<div class="today-buttons"><button type="button" data-action-edit="'+esc(a.id)+'">✎</button><button type="button" data-task-delay="'+esc(a.id)+'">Reporter</button></div></article>';
}
function renderToday(){
 const active=state.actions.filter(x=>!done(x));const due=active.filter(x=>x.due&&x.due<=date());const late=due.filter(x=>x.due<date());
 const other=active.filter(x=>!x.due&&['reponse_recue','audit_gratuit','proposition'].includes(x.type));
 const leads=api().state.records.filter(x=>x.followup&&x.followup<=date()&&!['cliente','sans_suite'].includes(x.stage));
 const contact=api().state.records.filter(x=>!x.lastContact&&(x.stage==='a_contacter'||!x.stage));
 const all=[...new Map([...due,...other].map(a=>[a.id,a])).values()].sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
 const priority=contact.slice().sort((a,b)=>({haute:0,moyenne:1,basse:2}[a.priority]??3)-({haute:0,moyenne:1,basse:2}[b.priority]??3)).slice(0,6);
 $('todaySummary').innerHTML='<span class="today-chip">'+all.length+' actions</span><span class="today-chip late">'+late.length+' en retard</span><span class="today-chip">'+contact.length+' à contacter</span><span class="today-chip">'+leads.length+' relances prospects</span>';
 const follow=leads.map(x=>'<article class="today-card priority"><label><input type="checkbox" data-lead-finish="'+esc(x.id)+'"><span><b>Relancer '+esc(x.name)+'</b><p>Date prévue : '+format(x.followup)+(x.nextAction?' · '+esc(x.nextAction):'')+'</p></span></label><div class="today-buttons"><button data-lead-history="'+esc(x.id)+'" type="button">Historique</button></div></article>').join('');
 const fresh=priority.map(x=>'<article class="today-card"><label><span><b>À contacter · '+esc(x.name)+'</b><p>'+(x.priority?'Priorité '+esc(x.priority)+' · ':'')+esc(x.sector||'Boutique')+(x.email?' · '+esc(x.email):'')+'</p></span></label><div class="today-buttons"><button data-lead-edit="'+esc(x.id)+'" type="button">Ouvrir</button></div></article>').join('');
 const free=api().state.records.filter(x=>x.freeInProgress&&x.stage!=='cliente').map(x=>'<article class="today-card"><label><span><b>Aide gratuite en cours · '+esc(x.name)+'</b><p>'+esc(x.nextAction||'Suivi de la prestation gratuite')+'</p></span></label><div class="today-buttons"><button type="button" data-lead-edit="'+esc(x.id)+'">Ouvrir</button></div></article>').join('');
 const offers=api().state.records.filter(x=>x.proposalSent&&x.stage!=='cliente'&&x.stage!=='sans_suite').map(x=>'<article class="today-card"><label><span><b>Proposition envoyée · '+esc(x.name)+'</b><p>'+esc(x.nextAction||'En attente de réponse')+'</p></span></label><div class="today-buttons"><button type="button" data-lead-edit="'+esc(x.id)+'">Ouvrir</button></div></article>').join('');
 $('todayList').innerHTML=all.map(actionForUI).join('')+follow+free+offers+fresh+
 (!all.length&&!follow&&!free&&!offers&&!fresh?'<p class="today-empty">Aucune tâche ni relance échue. Tu peux ajouter une tâche, ou vérifier les boutiques encore jamais contactées.</p>':'');
 document.dispatchEvent(new Event('mailotion:tasks-changed'));
}
function selectOptions(selected=''){
 $('aProspect').innerHTML='<option value="">Choisir une boutique…</option>'+api().state.records.slice().sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(x=>'<option value="'+esc(x.id)+'" '+(selected===x.id?'selected':'')+'>'+esc(x.name)+'</option>').join('');
}
function openAction(id=null,prospectId=''){
 const old=id?state.actions.find(x=>x.id===id):null;
 state.editingAction=old?.id||'';
 selectOptions(old?.prospectId||prospectId);
 $('actionTitle').textContent=old?'Modifier une action':'Nouvelle action';
 $('aType').value=old?.type||'tache';$('aStatus').value=old?.status||'a_faire';
 $('aDate').value=old?.date||date();$('aDue').value=old?.due||'';
 $('aDescription').value=old?.description||'';$('aNext').value=old?.next||'';
 $('aChannel').value=old?.channel||'';$('aRecipient').value=old?.recipient||'';$('aMessage').value=old?.message||'';
 showDialog('actionDialog');
}
function saveAction(e){
 e.preventDefault();const prospectId=$('aProspect').value,description=val($('aDescription').value,2600);
 if(!prospectId||!description){api().toast('Choisis une boutique et décris l’action.');return}
 const old=state.actions.find(x=>x.id===state.editingAction),stamp=new Date().toISOString();
 const a={id:old?.id||uid('action'),prospectId,date:validDate($('aDate').value),due:validDate($('aDue').value),type:$('aType').value,status:$('aStatus').value,description,next:val($('aNext').value,800),channel:$('aChannel').value,recipient:val($('aRecipient').value,240),message:val($('aMessage').value,1800),callGuide:old?.callGuide||[],completedAt:old?.completedAt||'',createdAt:old?.createdAt||stamp,updatedAt:stamp};
 if(old)Object.assign(old,a);else state.actions.push(a);
 const rec=getProspect(prospectId);
 if(rec&&a.status==='terminee'){rec.lastAction=a.description;if(a.date&&['email_envoye','appel','reponse_recue','relance'].includes(a.type))rec.lastContact=a.date;rec.updatedAt=stamp;api().persist()}
 saveLocal();closeDialog('actionDialog');renderToday();scheduleCloud();api().toast('Action enregistrée.');
}
function completeAction(id){
 const a=state.actions.find(x=>x.id===id);if(!a)return;
 a.status='terminee';a.updatedAt=new Date().toISOString();a.completedAt=a.updatedAt;
 if(['email_envoye','appel','relance'].includes(a.type))a.date=date();
 saveLocal();
 const r=getProspect(a.prospectId);if(r){r.lastAction=a.description;if(['email_envoye','appel','reponse_recue','relance'].includes(a.type))r.lastContact=date();if(a.type==='relance'&&r.followup===a.due)r.followup='';r.updatedAt=a.updatedAt;api().persist()}
 renderToday();scheduleCloud();api().toast('Action terminée, retirée de la liste À faire.');
}
function markTaskDone(id){
 const a=state.actions.find(x=>x.id===id);if(!a||done(a))return false;
 if(a.message&&['whatsapp','email'].includes(a.channel)&&!confirm('As-tu vraiment envoyé le message ?\n\nCocher Fait enregistre uniquement une action déjà réalisée.'))return false;
 completeAction(id);return true;
}
// Les diagnostics sont des notes privées, pas des tâches à accomplir ou des contacts envoyés.
function getDiagnostic(prospectId){
 const id='diagnostic-'+val(prospectId,120);
 return clone(state.actions.find(a=>a.id===id)||null);
}
function saveDiagnostic(prospectId,answers,notes){
 const prospect=getProspect(prospectId);
 if(!prospect)return false;
 const id='diagnostic-'+val(prospectId,120),now=new Date().toISOString();
 const previous=state.actions.find(a=>a.id===id);
 const cleanAnswers=Object.fromEntries(Object.entries(answers||{}).slice(0,35).filter(([key,v])=>/^[a-z_]{2,40}$/.test(key)&&['yes','no','na',''].includes(v)));
 const cleanNotes={goal:val(notes?.goal,250),tool:val(notes?.tool,150),notes:val(notes?.notes,1000)};
 const action={
  ...(previous||{}),id,prospectId,date:date(),due:'',type:'note',status:'terminee',
  description:'Diagnostic email — questions cochées',next:'',
  diagnosticAnswers:cleanAnswers,diagnosticNotes:cleanNotes,
  diagnosticEvidence:previous?.diagnosticEvidence||{},
  diagnosticUpdatedAt:now,createdAt:previous?.createdAt||now,updatedAt:now,completedAt:previous?.completedAt||now
 };
 if(previous)Object.assign(previous,action);else state.actions.push(action);
 saveLocal();renderToday();scheduleCloud();
 return true;
}
function postponeAction(id){
 const a=state.actions.find(x=>x.id===id);if(!a)return;
 const choice=prompt('Nouvelle date de relance (AAAA-MM-JJ) :',a.due||date());
 if(choice===null)return;
 if(!validDate(choice)){api().toast('Date invalide, utilise AAAA-MM-JJ.');return}
 const previous=a.due;a.due=choice;a.updatedAt=new Date().toISOString();const r=getProspect(a.prospectId);if(r&&a.type==='relance'&&r.followup===previous){r.followup=choice;r.updatedAt=a.updatedAt;api().persist()}saveLocal();renderToday();scheduleCloud();api().toast('Tâche reportée au '+format(choice)+'.');
}
function finishLead(id){
 const r=getProspect(id);if(!r)return;
 const target=r.followup;
 r.followup='';r.lastAction='Relance du '+format(target)+' traitée';r.updatedAt=new Date().toISOString();
 const stamp=r.updatedAt;
 state.actions.push({id:uid('action'),prospectId:id,date:date(),due:target,type:'relance',status:'terminee',description:'Relance prévue du '+format(target)+' traitée',next:'',createdAt:stamp,updatedAt:stamp});
 api().persist();saveLocal();renderToday();scheduleCloud();api().toast('Relance terminée et ajoutée à l’historique.');
}
function showTimeline(prospectId){
 const r=getProspect(prospectId);if(!r)return;
 state.activeProspect=prospectId;$('timelineTitle').textContent='Historique · '+r.name;
 const actions=state.actions.filter(x=>x.prospectId===prospectId).sort((a,b)=>(b.date||b.createdAt||'').localeCompare(a.date||a.createdAt||''));
 $('timelineBody').innerHTML=actions.length?actions.map(a=>'<div class="event '+(done(a)?'done':'')+'"><div class="event-head"><strong>'+esc(a.type.replaceAll('_',' '))+'</strong><small>'+format(a.date)+' · '+esc(a.status)+'</small></div><p>'+esc(a.description)+(a.next?'\nProchaine action : '+esc(a.next):'')+'</p><button type="button" data-action-edit="'+esc(a.id)+'">✎ Modifier</button></div>').join(''):'<p class="subtext">Aucune action enregistrée pour cette boutique.</p>';
 showDialog('timelineDialog');
}
function showEmails(prospectId){
 const r=getProspect(prospectId);if(!r)return;
 state.activeProspect=prospectId;$('emailTitle').textContent='Emails · '+r.name;
 const entries=state.emails.filter(x=>x.prospectId===prospectId).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
 $('emailList').innerHTML=entries.length?entries.map(x=>'<div class="email-history"><div><strong>'+esc(x.email)+'</strong><br><span class="'+(x.status==='invalide'?'bad':x.status==='confirme'?'good':'')+'">'+esc(({trouve_non_teste:'Trouvé, non testé',confirme:'Fonctionnel confirmé',invalide:'Invalide — ne pas utiliser',alternatif_a_tester:'Alternatif à tester'}[x.status]||x.status))+(x.active?' · actuelle':' · historique')+'</span></div><small>'+esc(x.notes||'')+'</small></div>').join(''):'<p class="subtext">Aucun historique d’email.</p>';
 $('eValue').value='';$('eStatus').value='trouve_non_teste';$('eVerified').value='';$('eNotes').value='';
 showDialog('emailDialog');
}
function saveEmail(ev){
 ev.preventDefault();const prospectId=state.activeProspect,r=getProspect(prospectId),email=val($('eValue').value,240).toLowerCase();
 if(!r||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){api().toast('Indique une adresse email valide.');return}
 const status=$('eStatus').value,now=new Date().toISOString();
 for(const x of state.emails)if(x.prospectId===prospectId)x.active=false;
 const item={id:uid('email'),prospectId,email,status,active:status!=='invalide',verifiedAt:val($('eVerified').value,10),notes:val($('eNotes').value,2000),source:r.sourceUrl||'',createdAt:now,updatedAt:now};
 state.emails.push(item);
 r.email=status==='invalide'?'':email;r.emailStatus=status;r.updatedAt=now;
 api().persist();saveLocal();api().render();renderToday();scheduleCloud();closeDialog('emailDialog');api().toast(status==='invalide'?'Email invalide conservé en historique et désactivé.':'Adresse conservée et mise à jour.');showEmails(prospectId);
}
async function connect(){
 if(state.busy)return;
 if(state.connected&&tokenReady()){await syncCloud();return}
 if(!state.client||!state.sheet){$('cloudSettings').hidden=false;api().toast('Renseigne l’identifiant OAuth et le numéro du Google Sheets privé.');return}
 try{showCloud('Connexion à Google…');await oauth();await syncCloud({initial:true})}
 catch(e){showCloud('Connexion impossible : '+e.message,'error');api().toast('Vérifie ton client OAuth, ton compte Google et les autorisations.')}
}
function exportAll(){
 const payload={version:2,format:'mailotion-crm-private',records:api().state.records,deleted:api().state.deleted,actions:state.actions,emails:state.emails,createdAt:new Date().toISOString()};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Mailotion_CRM_complet_'+date()+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
 api().toast('✓ Sauvegarde complète téléchargée (boutiques, tâches, historiques, emails).');
}
async function restoreAll(file){
 try{
  const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.records))throw Error('Ce fichier ne contient pas de prospects.');
  if(!confirm('Importer cette sauvegarde dans ton CRM ? Les fiches de même identifiant seront mises à jour, sans supprimer les autres.'))return;
  let count=0;
  for(const raw of data.records){
   const r=api().sanitize(raw,raw.origin==='github'?'github':'local');if(!r)continue;
   const known=api().findMatch(r);
   if(known)Object.assign(known,r);else api().state.records.push(r);count++;
  }
  if(Array.isArray(data.deleted))for(const id of data.deleted)if(!api().state.deleted.includes(id))api().state.deleted.push(id);
  if(Array.isArray(data.actions)){const m=new Map(state.actions.map(x=>[x.id,x]));for(const a of data.actions)if(a.id)m.set(a.id,a);state.actions=[...m.values()]}
  if(Array.isArray(data.emails)){const m=new Map(state.emails.map(x=>[x.id,x]));for(const e of data.emails)if(e.id)m.set(e.id,e);state.emails=[...m.values()]}
  api().persist();saveLocal();api().render();renderToday();scheduleCloud();api().toast('✓ '+count+' fiche(s) importée(s) et historique conservé.');
 }catch(e){api().toast('Restauration impossible : '+e.message)}
}
function exportSaved(key,name){
 try{const data=localStorage.getItem(key);if(!data){api().toast('Aucune copie de ce type n’a encore été enregistrée.');return}
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
 a.href=url;a.download=name+'_'+date()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
 api().toast('Copie de sécurité exportée en JSON.');
 }catch(e){api().toast('Impossible de récupérer cette sauvegarde.')}
}

/* Prospection individualisée : l'ouverture du composeur ne prouve PAS l'envoi.
   Cette méthode est appelée uniquement après confirmation explicite de l'utilisateur. */
function recordOutreachSent(prospectId,recipient,subject,body,makeFollowup=false){
 const lead=getProspect(prospectId),addr=val(recipient,240),now=new Date().toISOString();
 if(!lead)return {ok:false,error:'Boutique introuvable.'};
 if(!addr||lead.email?.trim().toLowerCase()!==addr.toLowerCase())return {ok:false,error:'Adresse différente de la fiche. Vérifie-la avant envoi.'};
 if(lead.emailStatus==='invalide'||state.emails.some(x=>x.prospectId===prospectId&&x.email?.toLowerCase()===addr.toLowerCase()&&x.status==='invalide'))
  return {ok:false,error:'Adresse signalée invalide : envoi désactivé.'};
 if(state.actions.some(x=>x.prospectId===prospectId&&x.type==='email_envoye'&&x.status==='terminee'))
  return {ok:false,error:'Cette boutique possède déjà un email envoyé dans son historique. Vérifie avant d’en envoyer un deuxième.'};
 const stamp=date(),text='Premier email de prospection Mailotion envoyé à '+addr+'\nObjet : '+val(subject,230)+'\n\n'+val(body,1700);
 const action={id:uid('action'),prospectId,date:stamp,due:'',type:'email_envoye',status:'terminee',description:text,next:'',createdAt:now,updatedAt:now};
 state.actions.push(action);
 if(!lead.stage||lead.stage==='a_contacter')lead.stage='contactee';
 lead.lastContact=stamp;
 lead.lastAction='Premier email Mailotion envoyé à '+addr;
 lead.updatedAt=now;
 if(makeFollowup){
  const next=new Date();next.setHours(12,0,0,0);next.setDate(next.getDate()+5);
  const iso=next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0');
  if(!lead.followup)lead.followup=iso;
  if(!lead.nextAction)lead.nextAction='Relancer après le premier email de prospection';
  state.actions.push({id:uid('action'),prospectId,date:stamp,due:iso,type:'relance',status:'a_faire',
   description:'Relancer '+lead.name+' après le premier email Mailotion',next:'',createdAt:now,updatedAt:now});
 }
 saveLocal();api().persist();api().render();renderToday();scheduleCloud();
 return {ok:true,actionId:action.id};
}
function addUIEvents(){
 $('backupBtn').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();exportAll()},true);
 $('restoreInput').addEventListener('change',async e=>{e.stopImmediatePropagation();if(e.target.files?.[0])await restoreAll(e.target.files[0]);e.target.value=''},true);
  $('cloudConnect').addEventListener('click',connect);
 $('cloudRecoveryBtn').addEventListener('click',()=>exportSaved(MIG,'Mailotion_avant_migration'));
 $('cloudConflictsBtn').addEventListener('click',()=>exportSaved('mailotion-conflicts-v1','Mailotion_conflits'));
 $('cloudConfigBtn').addEventListener('click',()=>{$('cloudSettings').hidden=!$('cloudSettings').hidden});
 document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='visible'&&state.connected&&tokenReady()&&!state.busy){clearTimeout(actionTimer);actionTimer=setTimeout(()=>syncCloud(),700)}
 });
 $('cloudSaveSettings').addEventListener('click',()=>{if(saveSettings())$('cloudSettings').hidden=true});
 $('cloudSettings').hidden=!!(state.client&&state.sheet);
 $('cloudMessage').addEventListener('click',()=>{$('cloudSettings').hidden=!$('cloudSettings').hidden});
 $('todayAdd').addEventListener('click',()=>openAction());
 $('todayList').addEventListener('click',event=>{
  const b=event.target.closest('button');if(b){
   if(b.dataset.actionEdit)openAction(b.dataset.actionEdit);
   else if(b.dataset.taskDelay)postponeAction(b.dataset.taskDelay);
   else if(b.dataset.leadHistory)showTimeline(b.dataset.leadHistory);
   else if(b.dataset.leadEdit)api().edit(b.dataset.leadEdit);
  }
 });
 $('todayList').addEventListener('change',event=>{
  const e=event.target;if(e.dataset.taskComplete&&e.checked)completeAction(e.dataset.taskComplete);
  if(e.dataset.leadFinish&&e.checked)finishLead(e.dataset.leadFinish);
 });
 $('actionForm').addEventListener('submit',saveAction);
 $('emailForm').addEventListener('submit',saveEmail);
 $('historyBtn').addEventListener('click',()=>{if(api().state.editing)showTimeline(api().state.editing);else api().toast("Enregistre d’abord la boutique.")});
 $('emailsBtn').addEventListener('click',()=>{if(api().state.editing)showEmails(api().state.editing);else api().toast("Enregistre d’abord la boutique.")});
 $('timelineAdd').addEventListener('click',()=>{const id=state.activeProspect;closeDialog('timelineDialog');openAction(null,id)});
 $('timelineBody').addEventListener('click',event=>{const b=event.target.closest('button[data-action-edit]');if(b){closeDialog('timelineDialog');openAction(b.dataset.actionEdit)}});
 for(const b of document.querySelectorAll('[data-close-cloud]'))b.addEventListener('click',()=>closeDialog(b.dataset.closeCloud));
 for(const d of ['actionDialog','timelineDialog','emailDialog'])$(d).addEventListener('close',()=>document.body.style.overflow='');
 window.addEventListener('mailotion:changed',trackLocal);
}
function init(){
 if(!window.MailotionCRM){setTimeout(init,80);return}
 if(state.initialized)return;state.initialized=true;
 loadLocal();
 // Immutable snapshot before importing external records; optional disaster recovery.
 if(!localStorage.getItem(MIG)){try{localStorage.setItem(MIG,JSON.stringify({records:api().state.records,deleted:api().state.deleted,actions:state.actions,emails:state.emails,at:new Date().toISOString()}))}catch{}}
 seedPublicCallTasks();snapshot();addUIEvents();renderToday();
 if(state.client&&state.sheet)showCloud('Connexion privée configurée, appuie sur « Connecter Google » pour synchroniser.');
 else showCloud('Non connectée. Tes fiches actuelles restent sur ce téléphone, sans suppression.');
 window.MailotionCloud={sync:connect,status:()=>({connected:state.connected,sheetConfigured:!!state.sheet}),getActions:()=>clone(state.actions),getEmails:()=>clone(state.emails),getDiagnostic,saveDiagnostic,markTaskDone,editTask:openAction,refreshTasks:renderToday,recordOutreachSent};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();