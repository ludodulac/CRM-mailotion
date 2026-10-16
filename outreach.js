(()=>{
'use strict';
// Un email à la fois. Aucun envoi automatique.
const STORAGE='mailotion-outreach-template-v1';
const DEFAULT_BODY="Je développe actuellement MAILOTION et je cherche\nquelques boutiques Shopify pour tester gratuitement\nmon travail.\n\nMon idée est simple : vous aider à récupérer davantage\nde ventes grâce aux paniers abandonnés et à donner\nenvie à vos clients de revenir acheter, avec des emails\nmieux pensés et adaptés à votre univers.\n\nMême si vous avez déjà des emails automatiques,\nil y a peut-être des choses à améliorer.\n\nJe vous propose de m'en occuper gratuitement,\nsans engagement. En échange, j'aimerais simplement\navoir votre avis sur le résultat.\n\nEst-ce que ça pourrait vous intéresser ?\n\nBonne journée,\nLudovic — MAILOTION";
const $=id=>document.getElementById(id);
const crm=()=>window.MailotionCRM;
const cloud=()=>window.MailotionCloud;
const state={current:'',opened:'',openedMessage:'',openedSubject:'',skipped:new Set(),signature:'',ready:false};
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim())}
function isInvalid(p){return p.emailStatus==='invalide'||(cloud()?.getEmails()||[]).some(x=>x.prospectId===p.id&&x.email?.trim().toLowerCase()===p.email?.trim().toLowerCase()&&x.status==='invalide')}
function alreadySent(p){return (cloud()?.getActions()||[]).some(x=>x.prospectId===p.id&&x.type==='email_envoye'&&x.status==='terminee')}
function eligible(p){return !!p&&!p.archived&&!p.clientAcquired&&['','a_contacter'].includes(p.stage||'')&&!p.lastContact&&!alreadySent(p)&&validEmail(p.email)&&!isInvalid(p)}
function queue(){return (crm()?.state.records||[]).filter(p=>eligible(p)&&!state.skipped.has(p.id)).sort((a,b)=>{
 const r=x=>({haute:0,moyenne:1,basse:2}[x.priority]??3);return r(a)-r(b)||a.name.localeCompare(b.name,'fr');
})}
function current(){return (crm()?.state.records||[]).find(x=>x.id===state.current)}
function greeting(p){
 const name=String(p.contact||'').trim();
 if(/^[A-Za-zÀ-ÿ-]{2,25}$/.test(name)&&!/^(service|direction|manager|gérant|gerant|contact|client|responsable|équipe|equipe)$/i.test(name))return 'Bonjour '+name+',';
 return 'Bonjour à l’équipe de '+p.name+',';
}
function setLead(id){
 const p=(crm()?.state.records||[]).find(x=>x.id===id);
 state.current=p?.id||'';state.opened='';state.openedMessage='';state.openedSubject='';
 $('outreachGreeting').value=p?greeting(p):'';
 $('outreachSubject').value=p?'Une petite proposition pour '+p.name:'';
 $('outreachLead').value=state.current;
 for(const n of ['outreachGreeting','outreachSubject','outreachBody','outreachFollowup'])$(n).disabled=!p;
 renderPreview();
}
function refresh(){
 if(!crm()||!cloud())return;
 const q=queue();const sig=q.map(p=>p.id+'|'+p.email+'|'+p.name).join('~');
 $('outreachCount').textContent=q.length+' boutique'+(q.length===1?'':'s')+' à contacter';
 if(sig!==state.signature){
  state.signature=sig;
  const sel=$('outreachLead');sel.replaceChildren();
  if(!q.length){sel.add(new Option('Aucune boutique éligible',''));sel.disabled=true}
  else{sel.disabled=false;for(const p of q)sel.add(new Option(p.name+(p.priority==='haute'?' ★':''),p.id))}
 }
 $('outreachSkip').disabled=!q.length;
 if(q.some(p=>p.id===state.current)){$('outreachLead').value=state.current;renderPreview()}
 else setLead(q[0]?.id||'');
}
function renderPreview(){
 const p=current(),valid=eligible(p)&&!state.skipped.has(p.id);
 const subject=valid?$('outreachSubject').value.trim():'Aucun email à préparer';
 const content=valid?$('outreachGreeting').value.trim()+'\n\n'+$('outreachBody').value.trim():'';
 $('outreachPreviewSubject').textContent=subject;
 $('outreachPreviewTo').textContent=valid?'À : '+p.email:'Ajoute une boutique « À contacter » avec une adresse email, ou synchronise le CRM.';
 $('outreachPreviewBody').textContent=content;
 $('outreachRecipient').textContent=valid?'Destinataire : '+p.email:'Aucun prospect éligible pour le moment.';
 let warning='';
 if(valid){
  warning=p.emailStatus==='alternatif_a_tester'?'Adresse alternative non encore testée : vérifie-la avant envoi.':
   p.emailStatus!=='confirme'?'Adresse email non confirmée : vérifie-la avant envoi.':'';
  if(!cloud().status().connected)warning+=(warning?' ':'')+'Google non connecté : l’historique sera d’abord enregistré sur ton téléphone.';
 }
 $('outreachWarning').hidden=!warning;$('outreachWarning').textContent=warning;
 const ready=valid&&!!$('outreachGreeting').value.trim()&&!!$('outreachSubject').value.trim()&&!!$('outreachBody').value.trim();
 const link=$('outreachCompose');
 link.href=ready?'mailto:'+encodeURIComponent(p.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(content):'#';
 link.setAttribute('aria-disabled',ready?'false':'true');link.classList.toggle('disabled',!ready);
 $('outreachConfirm').disabled=!(ready&&state.opened===p.id&&state.openedSubject===subject&&state.openedMessage===content);
}
function saveText(){
 try{localStorage.setItem(STORAGE,$('outreachBody').value);$('outreachSaved').textContent='✓ Modèle enregistré sur ce téléphone'}
 catch{$('outreachSaved').textContent='⚠ Stockage saturé : texte non sauvegardé'}
}
function openDraft(event){
 const p=current();
 if(!eligible(p)||!$('outreachGreeting').value.trim()||!$('outreachSubject').value.trim()||!$('outreachBody').value.trim()){
  event.preventDefault();crm().toast('Vérifie la boutique, l’adresse, l’objet et le message.');return;
 }
 state.opened=p.id;
 state.openedSubject=$('outreachSubject').value.trim();
 state.openedMessage=$('outreachGreeting').value.trim()+'\n\n'+$('outreachBody').value.trim();
 renderPreview();
 // La véritable action Envoyer doit être réalisée dans la messagerie choisie.
}
function confirmSent(){
 const p=current();if(!p||p.id!==state.opened)return;
 const subject=$('outreachSubject').value.trim(),content=$('outreachGreeting').value.trim()+'\n\n'+$('outreachBody').value.trim();
 if(subject!==state.openedSubject||content!==state.openedMessage){crm().toast('Le texte a changé : rouvre le brouillon avant de confirmer.');return}
 if(!confirm('As-tu réellement appuyé sur « Envoyer » dans ta messagerie pour '+p.name+' ?\n\nOK inscrira cet envoi dans l’historique.'))return;
 const r=cloud().recordOutreachSent(p.id,p.email,subject,content,$('outreachFollowup').checked);
 if(!r.ok){crm().toast(r.error);return}
 $('outreachFollowup').checked=false;
 crm().toast('✓ Email envoyé à '+p.name+' : enregistrement effectué. Contact suivant prêt.');
 setTimeout(refresh,90);
}
function skip(){
 if(state.current)state.skipped.add(state.current);
 refresh();
 if(!queue().length)crm().toast('Toutes les boutiques éligibles ont été parcourues pour cette session.');
}
function init(){
 if(state.ready)return;if(!crm()||!cloud()){setTimeout(init,100);return}
 state.ready=true;
 try{$('outreachBody').value=localStorage.getItem(STORAGE)??DEFAULT_BODY}catch{$('outreachBody').value=DEFAULT_BODY}
 $('outreachLead').addEventListener('change',e=>setLead(e.target.value));
 $('outreachSkip').addEventListener('click',skip);
 $('outreachBody').addEventListener('input',()=>{saveText();renderPreview()});
 $('outreachGreeting').addEventListener('input',renderPreview);
 $('outreachSubject').addEventListener('input',renderPreview);
 $('outreachReset').addEventListener('click',()=>{if(!confirm('Revenir au message initial Mailotion et remplacer ton texte enregistré ?'))return;$('outreachBody').value=DEFAULT_BODY;saveText();renderPreview()});
 $('outreachCompose').addEventListener('click',openDraft);
 $('outreachConfirm').addEventListener('click',confirmSent);
 window.addEventListener('mailotion:changed',()=>setTimeout(refresh,110));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refresh,110)});
 $('cloudConnect').addEventListener('click',()=>setTimeout(refresh,2500));
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();