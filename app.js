(()=>{
'use strict';
const REPO='ludodulac/CRM-mailotion';
const KEY='mailotion-crm-v1';
const STAGES=[
 ['a_contacter','À contacter'],
 ['contactee','Contactée'],
 ['echange','En discussion'],
 ['gratuit','Aide gratuite'],
 ['offre','Offre payante'],
 ['cliente','Cliente'],
 ['sans_suite','Sans suite']
];
const LABEL=Object.fromEntries(STAGES);
const $=id=>document.getElementById(id);
const txt=(v,max=4000)=>String(v??'').trim().slice(0,max);
const norm=s=>txt(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const today=()=>{const d=new Date(),pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const isoDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(txt(s))?txt(s):'';
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const saveAs=(blob,name)=>{const a=document.createElement('a');const u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000)};
const makeId=()=> 'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
const safeId=s=>txt(s,120).replace(/[^a-zA-Z0-9_-]/g,'_');
const state={records:[],deleted:[],filter:'all',query:'',editing:null,sync:false};
let toastTimer;
const toast=message=>{const e=$('toast');e.textContent=message;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),4700)};
const listStage=()=>Object.fromEntries(STAGES);
function get(o,names){for(const k of names){if(o[k]!==undefined && o[k]!==null && String(o[k]).trim()!=='')return o[k]}return ''}
function stageFor(s){let value=norm(s).replaceAll(' ','_');const a={
 'a_contacter':'a_contacter','a_contacter_':'a_contacter','nouveau':'a_contacter','a_appeler':'a_contacter',
 'contactee':'contactee','contacte':'contactee','contact':'contactee','contacted':'contactee',
 'reponse':'echange','echange':'echange','echange_en_cours':'echange','discussion':'echange','en_discussion':'echange',
 'gratuit':'gratuit','audit_gratuit':'gratuit','aide_gratuite':'gratuit','aider_gratuitement':'gratuit',
 'offre':'offre','proposition':'offre','payant':'offre','offre_payante':'offre','proposition_payante':'offre',
 'client':'cliente','cliente':'cliente','clientes':'cliente','gagne':'cliente',
 'sans_suite':'sans_suite','perdu':'sans_suite','refus':'sans_suite'};
 return a[value]||'a_contacter';
}
function webUrl(s){const raw=txt(s,500);if(!raw)return '';try{const url=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);return /^https?:$/.test(url.protocol)?url.href:''}catch{return ''}}
function emailUrl(s,shop){const e=txt(s,240);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return '';const subj='Une idée pour vos emails — Mailotion';const body='Bonjour,\n\nJe découvre votre boutique '+shop+' et j’aimerais vous proposer un premier regard gratuit, sans engagement, sur les emails envoyés à vos clients (bienvenue, panier abandonné, après-achat).\n\nSeriez-vous disponible pour en parler ?\n\nBelle journée,\nMailotion';
 return 'mailto:'+encodeURIComponent(e)+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
}
function phoneUrl(s){const p=txt(s,50).replace(/[^0-9+]/g,'');return p.replace(/\D/g,'').length>=5?'tel:'+p:''}
function sanitize(raw,source='local'){
 if(!raw || typeof raw!=='object'||Array.isArray(raw))return null;
 const name=txt(get(raw,['name','boutique','nom','enseigne','shop','magasin']),160);
 if(!name)return null;
 const id=safeId(get(raw,['id','identifiant']))||makeId();
 return {
 id, name,
 city:txt(get(raw,['city','ville','localite']),90),
 sector:txt(get(raw,['sector','secteur','categorie','niche','activite']),100),
 website:txt(get(raw,['website','site','site_web','url','siteInternet']),300),
 email:txt(get(raw,['email','mail','courriel','email_professionnel']),240),
 phone:txt(get(raw,['phone','tel','telephone','téléphone','numero']),55),
 contact:txt(get(raw,['contact','interlocuteur','contact_nom','responsable']),130),
 sourceUrl:txt(get(raw,['sourceUrl','source_url','source','url_source']),320),
 stage:stageFor(get(raw,['stage','statut','etape'])),
 followup:isoDate(get(raw,['followup','relance','date_relance'])),
 lastContact:isoDate(get(raw,['lastContact','dernier_contact','date_contact'])),
 offer:txt(get(raw,['offer','prix','montant','devis']),35),
 help:txt(get(raw,['help','aide','prestation']),2000),
 notes:txt(get(raw,['notes','note','commentaire']),4000),
 origin:source==='github'?'github':'local',
 createdAt:txt(raw.createdAt,30)||new Date().toISOString(),
 updatedAt:txt(raw.updatedAt,30)||new Date().toISOString()
 };
}
function fingerprint(r){return norm(r.name)+'|'+norm(r.city)}
function findMatch(record){return state.records.find(r=>r.id===record.id||(r.name&&fingerprint(r)===fingerprint(record)))}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify({version:1,records:state.records,deleted:state.deleted,exportedAt:new Date().toISOString()}));return true}
 catch(e){toast('Espace de stockage saturé : sauvegarde tes données en JSON.');return false}
}
function load(){
 try{const data=JSON.parse(localStorage.getItem(KEY)||'null');if(data && Array.isArray(data.records)){state.records=data.records.map(x=>sanitize(x,x.origin==='github'?'github':'local')).filter(Boolean);state.deleted=Array.isArray(data.deleted)?data.deleted.map(safeId):[]}}
 catch(e){toast('Les données enregistrées sont illisibles : une sauvegarde pourra les restaurer.')}
}
function mergeContacts(input,origin,withUpdates=false){
 const incoming=Array.isArray(input)?input:input&&Array.isArray(input.boutiques)?input.boutiques:input&&Array.isArray(input.contacts)?input.contacts:input&&Array.isArray(input.prospects)?input.prospects:[];
 let added=0,found=0,ignored=0;
 for(const raw of incoming.slice(0,2000)){
   const r=sanitize(raw,origin);if(!r){ignored++;continue}
   const existing=findMatch(r);
   if((state.deleted.includes(r.id))||existing&&state.deleted.includes(existing.id)){ignored++;continue}
   if(existing){found++;if(withUpdates&&origin==='github'){
    for(const f of ['email','phone','website','sourceUrl','sector','city','contact'])if(!existing[f]&&r[f])existing[f]=r[f];
    existing.origin=existing.origin==='local'?'local':'github';
   }continue}
   if(origin==='github'){r.notes='';r.help='';r.offer='';r.lastContact='';r.followup='';r.stage='a_contacter'}
   state.records.push(r);added++;
 }
 if(added || (found && withUpdates))persist();
 return {added,found,ignored};
}
async function sync(silent=false){
 if(state.sync)return;
 state.sync=true;$('syncBtn').disabled=true;
 showSync('↻ Synchronisation…');
 try{
   const res=await fetch('./prospects.json?v='+Date.now(),{cache:'no-store'});
   if(!res.ok)throw Error('HTTP '+res.status);
   const data=await res.json();
   if(!Array.isArray(data)&&!Array.isArray(data.boutiques)&&!Array.isArray(data.contacts)&&!Array.isArray(data.prospects))throw Error('Format JSON');
   const r=mergeContacts(data,'github',true);
   showSync('● À jour · '+(r.added?'+'+r.added+' boutiques':'aucun ajout'),'good');
   if(r.added&&!silent)toast(r.added+' boutique(s) ajoutée(s) depuis ChatGPT / GitHub.');
   else if(!silent)toast('Ton carnet est à jour.');
   render();
 }catch(e){showSync('○ Hors ligne · carnet local','bad');if(!silent)toast('Synchronisation impossible. Tes fiches locales sont disponibles.')}
 finally{state.sync=false;$('syncBtn').disabled=false}
}
function showSync(text,cls){const el=$('syncStatus');el.className='sync-status '+(cls||'');el.textContent=text}
function isFollowup(r){return !!r.followup&&r.followup<=today()&&r.stage!=='cliente'&&r.stage!=='sans_suite'}
function count(k){if(k==='all')return state.records.length;if(k==='relance')return state.records.filter(isFollowup).length;return state.records.filter(r=>r.stage===k).length}
function displaySubset(){const q=norm(state.query);return state.records.filter(r=>{
 if(state.filter==='relance'){if(!isFollowup(r))return false}
 else if(state.filter!=='all'&&r.stage!==state.filter)return false;
 if(!q)return true;
 return norm([r.name,r.city,r.sector,r.email,r.phone,r.contact,r.website,r.notes,r.help].join(' ')).includes(q);
 }).sort((a,b)=>{const ar=isFollowup(a),br=isFollowup(b);if(ar!==br)return ar?-1:1;return a.name.localeCompare(b.name,'fr')})}
function render(){
 $('totalCount').textContent=count('all');
 $('todoCount').textContent=count('a_contacter');
 $('freeCount').textContent=count('gratuit');
 $('clientCount').textContent=count('cliente');
 for(const el of document.querySelectorAll('[data-tabcount]'))el.textContent=count(el.dataset.tabcount);
 for(const el of document.querySelectorAll('[data-stage]')){el.classList.toggle('active',el.dataset.stage===state.filter)}
 const filtered=displaySubset();
 $('resultCount').textContent=filtered.length+' boutique'+(filtered.length===1?'':'s');
 $('cards').innerHTML=filtered.map(cardHtml).join('');
 $('empty').hidden=filtered.length>0;
 if(!filtered.length){
   if(state.records.length){$('emptyTitle').textContent='Aucun résultat';$('emptyText').textContent='Essaie une autre recherche ou un autre filtre.';$('emptyAdd').textContent='＋ Ajouter une boutique'}
   else{$('emptyTitle').textContent="C'est parti pour la prospection !";$('emptyText').textContent="Ajoute une boutique pour commencer. Tu peux aussi demander à ChatGPT d'ajouter des contacts professionnels dans ton dépôt GitHub.";$('emptyAdd').textContent='＋ Ajouter ma première boutique'}
 }
}
function cardHtml(r){
 const site=webUrl(r.website), mail=emailUrl(r.email,r.name),phone=phoneUrl(r.phone);
 const citySector=[r.city,r.sector].filter(Boolean).join(' · ')||'Boutique e-commerce';
 const initial=txt(r.name).split(/\s+/).slice(0,2).map(s=>s.slice(0,1)).join('').toUpperCase();
 const relance=r.followup?'<span class="deadline '+(isFollowup(r)?'overdue':'')+'">⏰ '+(isFollowup(r)?'À relancer':'Relance')+' : '+esc(displayDate(r.followup))+'</span>':'';
 const quickInfo=[r.email?'<span class="contact-mini">✉ '+esc(r.email)+'</span>':'',r.phone?'<span class="contact-mini">☎ '+esc(r.phone)+'</span>':''].filter(Boolean).join('');
 const link=(href,label,style)=>href?'<a class="action '+(style||'')+'" href="'+esc(href)+'" '+(href.startsWith('http')?'target="_blank" rel="noopener noreferrer"':'')+'>'+label+'</a>':'<span class="action disabled" aria-disabled="true">'+label+'</span>';
 return '<article class="lead-card" data-id="'+esc(r.id)+'">'+
 '<div class="card-head"><div class="avatar" aria-hidden="true">'+esc(initial)+'</div>'+
 '<div class="card-main"><h3 class="lead-name">'+esc(r.name)+'</h3><p class="lead-meta">'+esc(citySector)+'</p></div>'+
 '<button class="card-more" data-action="edit" data-id="'+esc(r.id)+'" type="button" aria-label="Modifier '+esc(r.name)+'">···</button></div>'+
 '<div class="tags"><span class="status s-'+esc(r.stage)+'">'+esc(LABEL[r.stage]||'À contacter')+'</span>'+relance+'</div>'+
 '<div class="contact-strip">'+(quickInfo||'<span class="contact-mini">Coordonnées à compléter</span>')+'</div>'+
 (r.notes?'<p class="lead-note">'+esc(r.notes.slice(0,150))+(r.notes.length>150?'…':'')+'</p>':'')+
 '<div class="card-actions">'+link(mail,'✉ Écrire','primary')+link(phone,'☎ Appeler','')+link(site,'↗ Site','')+'<button type="button" class="action" data-action="edit" data-id="'+esc(r.id)+'">✎ Fiche</button></div></article>';
}
function displayDate(s){const p=isoDate(s).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s}
function filterTo(k){state.filter=k;render();document.querySelector('.board').scrollIntoView({behavior:'smooth',block:'start'})}
function fillStageOptions(){const select=$('fStage');select.innerHTML=STAGES.map(([value,label])=>'<option value="'+value+'">'+esc(label)+'</option>').join('')}
function showDialog(dialog){dialog.showModal();document.body.style.overflow='hidden';}
function closeDialog(dialog){if(dialog.open)dialog.close();document.body.style.overflow=''}
function edit(id){
 const record=state.records.find(r=>r.id===id);
 state.editing=record?record.id:null;
 $('dialogTitle').textContent=record?'Modifier la boutique':'Nouvelle boutique';
 const fields={Name:'name',City:'city',Sector:'sector',Website:'website',Email:'email',Phone:'phone',Contact:'contact',Stage:'stage',Followup:'followup',Last:'lastContact',Offer:'offer',Help:'help',Notes:'notes',Source:'sourceUrl'};
 for(const [f,k] of Object.entries(fields))$('f'+f).value=record?(record[k]||''):(k==='stage'?'a_contacter':'');
 $('deleteBtn').hidden=!record;
 showDialog($('leadDialog'));
 setTimeout(()=>$('fName').focus(),120);
}
function readForm(){
 return {name:$('fName').value,city:$('fCity').value,sector:$('fSector').value,website:$('fWebsite').value,email:$('fEmail').value,phone:$('fPhone').value,contact:$('fContact').value,stage:$('fStage').value,followup:$('fFollowup').value,lastContact:$('fLast').value,offer:$('fOffer').value,help:$('fHelp').value,notes:$('fNotes').value,sourceUrl:$('fSource').value};
}
function handleForm(ev){
 ev.preventDefault();
 const input=readForm();
 if(!txt(input.name)){toast('Indique le nom de la boutique.');$('fName').focus();return}
 if(input.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())){toast("L'adresse email semble incorrecte.");$('fEmail').focus();return}
 const existing=state.editing?state.records.find(r=>r.id===state.editing):null;
 const lead=sanitize({...(existing||{}),...input,id:existing?.id||makeId(),origin:existing?.origin||'local',createdAt:existing?.createdAt||new Date().toISOString()},existing?.origin||'local');
 if(!lead)return;
 const duplicate=state.records.find(r=>r.id!==lead.id&&fingerprint(r)===fingerprint(lead));
 if(duplicate){toast('Cette boutique est déjà enregistrée. Ouvre sa fiche pour la modifier.');return}
 if(existing)Object.assign(existing,lead);else state.records.unshift(lead);
 persist();closeDialog($('leadDialog'));render();toast(existing?'Fiche mise à jour.':'Boutique ajoutée !');
}
function deleteLead(){
 const r=state.records.find(x=>x.id===state.editing);if(!r)return;
 if(!confirm('Supprimer « '+r.name+' » du CRM sur cet appareil ?'))return;
 if(r.origin==='github')state.deleted.push(r.id);
 state.records=state.records.filter(x=>x.id!==r.id);
 persist();closeDialog($('leadDialog'));render();toast('Boutique supprimée de ton CRM.');
}
function readCSV(input){
 const str=String(input||'').replace(/^\uFEFF/,'');
 const header=str.split(/\r?\n/,1)[0]||'';
 const delimiters=[';',',','\t'].map(ch=>[ch,(header.match(new RegExp(ch==='\t'?'\t':('\\'+ch),'g'))||[]).length]).sort((a,b)=>b[1]-a[1]);
 const separator=delimiters[0][1]>0?delimiters[0][0]:';';
 let out=[],cur='',row=[],quoted=false;
 for(let i=0;i<str.length;i++){
  let c=str[i];
  if(c==='"'){if(quoted&&str[i+1]==='"'){cur+='"';i++}else quoted=!quoted}
  else if(c===separator&&!quoted){row.push(cur);cur=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&str[i+1]==='\n')i++;row.push(cur);if(row.some(x=>x.trim()))out.push(row);row=[];cur=''}
  else cur+=c;
 }
 row.push(cur);if(row.some(x=>x.trim()))out.push(row);
 if(out.length<2)throw Error('Il faut une ligne d’en-têtes et au moins une boutique.');
 const keys=out[0].map(k=>norm(k).replaceAll(' ','_'));
 if(!keys.some(k=>['nom','boutique','enseigne','name','magasin','shop'].includes(k)))throw Error('Colonne boutique / nom manquante.');
 return out.slice(1).map(row=>Object.fromEntries(keys.map((k,i)=>[k,row[i]||''])));
}
function parseImport(str){
 const s=String(str||'').trim();if(!s)throw Error('Colle des contacts ou choisis un fichier.');
 if(s.startsWith('[')||s.startsWith('{')){const obj=JSON.parse(s);const arr=Array.isArray(obj)?obj:obj.boutiques||obj.contacts||obj.prospects;if(!Array.isArray(arr))throw Error('Liste JSON attendue : tableau ou objet avec « boutiques ».');return arr}
 return readCSV(s);
}
async function doImport(){
 try{const data=parseImport($('importText').value);
 const r=mergeContacts(data,'local',false);
 closeDialog($('importDialog'));$('importText').value='';$('importFileName').textContent='CSV ou JSON';render();
 toast(r.added+' ajout(s), '+r.found+' doublon(s) déjà présent(s)'+(r.ignored?' et '+r.ignored+' ligne(s) ignorée(s)':'')+'.');
 }catch(e){toast('Import impossible : '+(e.message||'format non reconnu'))}
}
function csvCell(x){let s=String(x??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(){
 const fields=['name','city','sector','website','email','phone','contact','stage','followup','lastContact','offer','help','notes','sourceUrl'];
 const head=['Boutique','Ville','Secteur','Site','Email','Téléphone','Contact','Étape','À relancer','Dernier contact','Montant envisagé','Prestation','Notes privées','Source'];
 const lines=[head.map(csvCell).join(';'),...state.records.map(r=>fields.map(k=>csvCell(k==='stage'?(LABEL[r[k]]||r[k]):r[k])).join(';'))];
 saveAs(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'}),'Mailotion_contacts_'+today()+'.csv');
 toast('Ton carnet a été exporté en CSV.');
}
function exportBackup(){saveAs(new Blob([JSON.stringify({version:1,records:state.records,deleted:state.deleted,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),'Mailotion_sauvegarde_'+today()+'.json');toast('Sauvegarde enregistrée. Garde-la dans un endroit sûr.')}
async function restoreBackup(file){
 try{
 const data=JSON.parse(await file.text());if(!Array.isArray(data.records))throw Error('Fichier non reconnu');
 const candidates=data.records.map(x=>sanitize(x,x.origin==='github'?'github':'local')).filter(Boolean);
 if(state.records.length&&!confirm('Restaurer cette sauvegarde ? Cela remplacera le CRM de ce navigateur.'))return;
 state.records=candidates;state.deleted=Array.isArray(data.deleted)?data.deleted.map(safeId):[];persist();render();toast(candidates.length+' boutiques restaurées.');
 }catch(e){toast('Fichier de sauvegarde non reconnu.')}
}
function copyPrompt(){
 const message='Ajoute ces boutiques à mon CRM Mailotion dans mon dépôt GitHub ludodulac/CRM-mailotion. Utilise uniquement le fichier prospects.json, sur main. Complète uniquement avec des coordonnées de boutique professionnelles, publiques et vérifiées (nom, ville, secteur, email professionnel, téléphone professionnel, site internet, source_url). Garde les boutiques déjà présentes et évite les doublons. Le format est {"version":1,"boutiques":[{"id":"slug-unique","boutique":"Nom de la boutique","ville":"Ville","secteur":"Catégorie","email":"contact@exemple.fr","telephone":"02...","site":"https://...","source_url":"https://..."}]}. N’ajoute ni notes personnelles, ni informations privées, ni clés d’accès. Préviens-moi si une donnée n’est pas vérifiée. Après le commit, je cliquerai « Actualiser » dans mon CRM.';
 if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(message).then(()=>toast('Consigne copiée ! Colle-la dans ta conversation ChatGPT.')).catch(()=>fallbackCopy(message))}
 else fallbackCopy(message);
}
function fallbackCopy(text){const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('Consigne copiée !')}catch{toast('Copie impossible : utilise le bouton sur Chrome.')}t.remove()}
async function importHash(){
 const match=location.hash.match(/^#(?:import|ajouter)=([A-Za-z0-9_-]+)$/);
 if(!match)return;
 try{
 let s=match[1].replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
 const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));const str=new TextDecoder().decode(bytes);
 const data=parseImport(str);const r=mergeContacts(data,'local');render();
 history.replaceState(null,'',location.pathname+location.search);toast(r.added+' boutique(s) importée(s) depuis la conversation.');
 }catch(e){toast("Impossible d'importer ce lien.");}
}
function install(){
 fillStageOptions();load();render();
 $('search').addEventListener('input',e=>{state.query=e.target.value;render()});
 for(const b of document.querySelectorAll('[data-stage]'))b.addEventListener('click',()=>filterTo(b.dataset.stage));
 for(const b of document.querySelectorAll('[data-summary]'))b.addEventListener('click',()=>filterTo({todo:'a_contacter',free:'gratuit',clients:'cliente'}[b.dataset.summary]||'all'));
 for(const id of ['addTop','emptyAdd'])$(id).addEventListener('click',()=>edit(null));
 $('cards').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;if(b.dataset.action==='edit')edit(b.dataset.id)});
 $('leadForm').addEventListener('submit',handleForm);$('deleteBtn').addEventListener('click',deleteLead);
 for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>closeDialog($(b.dataset.close)));
 for(const dlg of document.querySelectorAll('dialog')){dlg.addEventListener('close',()=>document.body.style.overflow='');dlg.addEventListener('click',e=>{if(e.target===dlg)closeDialog(dlg)})}
 $('syncBtn').addEventListener('click',()=>sync());
 $('importBtn').addEventListener('click',()=>showDialog($('importDialog')));
 $('importFileBtn').addEventListener('click',()=>$('importFile').click());
 $('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const contents=await file.text();$('importText').value=contents;$('importFileName').textContent=file.name;e.target.value=''});
 $('importConfirm').addEventListener('click',doImport);
 $('copyPrompt').addEventListener('click',copyPrompt);$('exportBtn').addEventListener('click',exportCsv);
 $('backupBtn').addEventListener('click',exportBackup);
 $('restoreBtn').addEventListener('click',()=>$('restoreInput').click());
 $('restoreInput').addEventListener('change',async e=>{const f=e.target.files[0];if(f)await restoreBackup(f);e.target.value=''});
 importHash().then(()=>sync(true));
 if('serviceWorker'in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();