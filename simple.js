/* M003 — affichage seulement : aucun changement aux feuilles Google, aux fiches ou aux historiques. */
(()=>{
'use strict';
const KEY='mailotion-crm-display-v1';
const ADVANCED_IDS=['fCity','fLast','fOffer','fHelp','fPriority','fQualification','fEmailTool','fEmailStatus','fProblems','fOpportunities','fContactPage','fVerifiedAt','fLastAction','fPaidOffer','fProposalSent','fFreeInProgress','fClientAcquired','fSource'];
const el=id=>document.getElementById(id);
// Toujours ouvrir sur l'écran simple : l'ancienne préférence « full » ne doit
// plus réafficher les longs panneaux au prochain lancement.
let compact=true;
function apply(){
 document.body.classList.toggle('crm-simple',compact);
 const toggle=el('modeToggle');
 if(toggle){toggle.textContent=compact?'⚙ Mode complet':'✓ Mode simple';toggle.setAttribute('aria-pressed',compact?'false':'true');}
 const formToggle=el('advancedFormToggle');
 if(formToggle)formToggle.textContent=compact?'Voir les détails de la fiche':'Afficher les détails';
 window.MailotionTasks?.render?.();
}
function setCompact(v){compact=!!v;apply()}
function init(){
 const toggle=el('modeToggle');if(toggle)toggle.addEventListener('click',()=>setCompact(!compact));
 const boutiques=el('simpleBoutiquesToggle');
 if(boutiques)boutiques.addEventListener('click',()=>{
  const opened=document.body.classList.toggle('simple-boutiques-open');
  boutiques.setAttribute('aria-expanded',String(opened));
  boutiques.textContent=opened?'Masquer les boutiques ↑':'Voir les boutiques ↓';
 });
 const dialog=el('leadDialog'),form=el('leadForm');
 if(dialog&&form){
  for(const id of ADVANCED_IDS){const field=el(id)?.closest('.field');if(field)field.classList.add('mailotion-advanced-field');}
  const subs=form.querySelectorAll('.inline-section');
  for(const title of subs){const field=title.closest('.field');if(field)field.classList.add('mailotion-advanced-field');}
  const btn=document.createElement('button');btn.type='button';btn.id='advancedFormToggle';btn.className='crm-advanced-toggle';btn.textContent='Voir les détails de la fiche';btn.setAttribute('aria-expanded','false');
  const first=el('fPriority')?.closest('.field');
  if(first)first.before(btn);else form.append(btn);
  btn.addEventListener('click',()=>{
   const expanded=dialog.classList.toggle('crm-form-expanded');
   btn.textContent=expanded?'Masquer les détails':'Voir les détails de la fiche';btn.setAttribute('aria-expanded',String(expanded));
  });
  dialog.addEventListener('close',()=>{dialog.classList.remove('crm-form-expanded');btn.setAttribute('aria-expanded','false');});
 }
 // Les liens de prospection existants restent utilisables : ouvrir le mode complet.
 document.addEventListener('click',e=>{
  const a=e.target.closest?.('[data-action="outreach"]');
  if(a&&compact)setCompact(false);
 },true);
 apply();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
