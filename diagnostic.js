/* M007 — Questionnaire commercial facultatif, enregistré dans Actions (Google Sheets privé).
   Aucune donnée client dans le dépôt public. Chaque réponse est une observation déclarée ou vérifiée.
   Une absence de réponse n'est jamais interprétée comme « Non ». */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const QUESTIONS=[
{id:'welcome',q:'Un email de bienvenue pour les nouveaux inscrits ?',group:'common'},
{id:'cart',q:'Une relance des paniers abandonnés ?',group:'common'},
{id:'after_purchase',q:'Des conseils utiles après la commande ?',group:'common'},
{id:'measurement',q:'Un suivi des clics et des commandes liées aux emails ?',group:'common'},
{id:'reorder',q:'Un rappel pour recommander un produit consommé ?',group:'consumable'},
{id:'complement',q:'Des suggestions de produits complémentaires ?',group:'products'},
{id:'personalization',q:'Un suivi des demandes sur mesure ou personnalisées ?',group:'custom'},
{id:'size_help',q:'Des conseils sur les tailles, matières ou entretien ?',group:'fashion'},
{id:'availability',q:'Une alerte pour les nouveautés ou les retours en stock ?',group:'products'},
{id:'reviews',q:'Une demande d’avis après réception ?',group:'other'},
{id:'segmentation',q:'Des emails adaptés aux achats ou centres d’intérêt ?',group:'other'},
{id:'inactive',q:'Un message aux anciens clients inactifs ?',group:'other'},
{id:'buyer_stop',q:'La relance s’arrête après un achat ?',group:'other'},
{id:'consent',q:'Une gestion des consentements et du désabonnement ?',group:'other'},
{id:'loyalty',q:'Un suivi des clients fidèles ou des offres de parrainage ?',group:'other'},
{id:'order_followup',q:'Des informations claires entre achat et livraison ?',group:'other'}
];
const A=['','yes','no','na'];
const label={yes:'✓ Oui',no:'✕ Non',na:'— Pas utile','':'? À vérifier'};
let chosen='',draft={answers:{},notes:{goal:'',tool:'',notes:''}},timer=0,dirty=false;
const lead=()=>window.MailotionCRM?.state?.records?.find(x=>x.id===chosen);
const cloud=()=>window.MailotionCloud;
function profile(p){
 const t=(String(p?.sector||'')+' '+String(p?.name||'')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const consumable=/infusion|the|bouillon|savon|shampoing|cosmet|soin|cafe|tisane|aliment|huile|parfum|bougie|th[eé]|epice|epicerie/.test(t);
 const custom=/sur mesure|personnal|couture|createur|creation|artisan|tissuth/.test(t);
 const fashion=/vetement|mode|accessoire|ceinture|textile|tissu|sac|chaussure/.test(t);
 const recommended=[
 ...(consumable?['reorder']:[]),
 ...(custom?['personalization']:[]),
 ...(fashion?['size_help']:[]),
 'complement',
 'availability'
 ];
 return [...new Set(recommended)].slice(0,3);
}
function entry(q){
 const selected=draft.answers[q.id]||'';
 const evidence=cloud()?.getDiagnostic?.(chosen)?.diagnosticEvidence?.[q.id]||'';
 return '<div class="diag-row"><div class="diag-row-text"><span>'+esc(q.q)+'</span>'+
 (evidence?'<small>Confirmé : '+esc(evidence)+'</small>':'')+'</div>'+
 '<select data-diag-answer="'+esc(q.id)+'" aria-label="'+esc(q.q)+'">'+
 A.map(v=>'<option value="'+v+'" '+(selected===v?'selected':'')+'>'+label[v]+'</option>').join('')+'</select></div>';
}
function count(){
 const n=Object.values(draft.answers).filter(v=>v&&A.includes(v)).length;
 const e=$('diagnosticProgress');if(e)e.textContent=n+' / '+QUESTIONS.length+' réponses';
}
function render(){
 const p=lead(),host=$('diagnosticQuestions');if(!host)return;
 if(!p){host.innerHTML='<p>Sélectionne une boutique.</p>';return}
 const extra=profile(p);
 const common=QUESTIONS.filter(x=>x.group==='common');
 const relevant=QUESTIONS.filter(x=>extra.includes(x.id));
 const other=QUESTIONS.filter(x=>!common.includes(x)&&!extra.includes(x.id));
 host.innerHTML='<div class="diag-section"><h3>À demander d’abord</h3>'+common.map(entry).join('')+'</div>'+
 '<div class="diag-section"><h3>Selon cette boutique</h3>'+relevant.map(entry).join('')+'</div>'+
 '<details class="diag-extra"><summary>Voir toutes les autres questions ('+other.length+')</summary>'+
 other.map(entry).join('')+'</details>';
 $('diagnosticGoal').value=draft.notes.goal||'';
 $('diagnosticTool').value=draft.notes.tool||'';
 $('diagnosticNotes').value=draft.notes.notes||'';
 count();
}
function store(){
 if(!chosen)return false;
 clearTimeout(timer);
 const ok=cloud()?.saveDiagnostic?.(chosen,draft.answers,draft.notes)===true;
 if(ok){dirty=false;$('diagnosticSaved').textContent=cloud()?.status?.().connected?'✓ Enregistré · synchro Google en cours':'✓ Enregistré sur ce téléphone · connecter Google pour synchroniser';}
 else $('diagnosticSaved').textContent='⚠ Impossible d’enregistrer. Vérifier la connexion.';
 return ok;
}
function schedule(){dirty=true;$('diagnosticSaved').textContent='Enregistrement…';clearTimeout(timer);timer=setTimeout(store,650)}
function selected(id){
 if(dirty)store();
 chosen=id;
 const record=cloud()?.getDiagnostic?.(id);
 draft={answers:{...(record?.diagnosticAnswers||{})},notes:{goal:record?.diagnosticNotes?.goal||'',tool:record?.diagnosticNotes?.tool||'',notes:record?.diagnosticNotes?.notes||''}};
 dirty=false;
 render();
 $('diagnosticSaved').textContent='Réponses privées · modifiables à tout moment';
}
function fill(){
 const records=window.MailotionCRM?.state?.records||[];
 const sel=$('diagnosticProspect');const before=sel.value;
 sel.innerHTML=records.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr')).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
 if(records.some(p=>p.id===before))sel.value=before;
}
function open(id=''){
 const dlg=$('diagnosticDialog');if(!dlg)return;
 fill();
 const opt=Array.from($('diagnosticProspect').options).find(o=>o.value===id);
 if(opt)$('diagnosticProspect').value=id;
 else if(chosen)$('diagnosticProspect').value=chosen;
 if(!$('diagnosticProspect').value){window.MailotionCRM?.toast?.('Ajoute une boutique avant de commencer.');return}
 selected($('diagnosticProspect').value);
 if(!dlg.open){dlg.showModal();document.body.style.overflow='hidden'}
}
function close(){
 if(dirty)store();
 const dlg=$('diagnosticDialog');if(dlg.open)dlg.close();
 document.body.style.overflow='';
}
function init(){
 $('diagnosticLaunch')?.addEventListener('click',()=>open('chic-des-plantes'));
 $('diagnosticClose')?.addEventListener('click',close);
 $('diagnosticSave')?.addEventListener('click',store);
 $('diagnosticProspect')?.addEventListener('change',e=>selected(e.target.value));
 $('diagnosticQuestions')?.addEventListener('change',e=>{
  const select=e.target.closest('select[data-diag-answer]');if(!select)return;
  if(!A.includes(select.value))return;
  draft.answers[select.dataset.diagAnswer]=select.value;count();schedule();
 });
 for(const [id,key] of [['diagnosticGoal','goal'],['diagnosticTool','tool'],['diagnosticNotes','notes']]){
  $(id)?.addEventListener('input',e=>{draft.notes[key]=e.target.value;schedule()});
 }
 document.querySelector('#cards')?.addEventListener('click',e=>{
  const target=e.target.closest('[data-diagnostic-prospect]');if(target)open(target.dataset.diagnosticProspect);
 });
 $('diagnosticDialog')?.addEventListener('cancel',()=>{if(dirty)store()});
 // Le bouton de chaque tâche est traité dans task-inbox.js.
 window.MailotionDiagnostic={open,questions:QUESTIONS};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();