(()=>{
'use strict';
// Atelier simple : un objet et un email complet par boutique, tous deux modifiables.
// Aucun email n'est envoyé automatiquement.
const $=id=>document.getElementById(id),crm=()=>window.MailotionCRM,cloud=()=>window.MailotionCloud;
const PUBLIC_DRAFTS={
  "echlo-cosmetique.fr": {
    "subject": "Une question sur votre coffret découverte",
    "body": "Bonjour à l'équipe d'ÉCHLO,\n\nJ'ai découvert votre coffret découverte et votre univers de soins botaniques. Est-ce que vous expliquez déjà par email comment utiliser ces produits ensemble ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "sous-l-ecorce.fr": {
    "subject": "Une question sur vos coffrets bien-être",
    "body": "Bonjour à l'équipe de Sous l’Écorce,\n\nJ'ai vu votre coffret Rituel Visage Botanique, qui associe plusieurs soins. Est-ce que vous donnez déjà par email quelques conseils d'utilisation après la commande ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "cledeschamps.eu": {
    "subject": "Une question sur vos soins d'automne",
    "body": "Bonjour à l'équipe de Clé des Champs,\n\nJ'ai découvert vos soins pensés selon les saisons, notamment la crème à la châtaigne et le sérum d'automne. Est-ce que vous accompagnez déjà vos clientes par email quand elles changent de routine avec les saisons ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "symphytum.fr": {
    "subject": "Une question sur votre routine Peau Délicate",
    "body": "Bonjour à l'équipe de Symphytum,\n\nJ'ai découvert votre routine « Peau Délicate » et votre travail autour de la consoude. Est-ce que vous partagez déjà par email des conseils pour utiliser ces soins après un achat ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "fleursdecafe.fr": {
    "subject": "Une question sur vos soins au café",
    "body": "Bonjour à l'équipe de Fleurs de Café,\n\nJ'ai vu vos soins au café revalorisé, notamment le gommage et la crème. Est-ce que vous expliquez déjà par email comment ces produits peuvent s'utiliser dans une même routine ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "kaleparis.com": {
    "subject": "Une question sur votre sérum hydratant",
    "body": "Bonjour à l'équipe de KALE Paris,\n\nJ'ai découvert votre Base Nacrée et votre Sérum Hydratant & Régénérant. Est-ce que vous envoyez déjà des conseils par email pour aider vos clientes à les intégrer dans une routine ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "nansca.com": {
    "subject": "Une question sur vos routines de soins",
    "body": "Bonjour à l'équipe de Nansca,\n\nJ'ai découvert votre laboratoire familial et votre gamme de soins naturels, des crèmes aux élixirs. Est-ce que vous proposez déjà par email des conseils de routine après une première commande ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "la-canopee.com": {
    "subject": "Une question sur vos routines de soins",
    "body": "Bonjour à l'équipe de La Canopée,\n\nJ'ai vu que vous proposez déjà une newsletter, un programme de fidélité et plusieurs routines de soins. Est-ce que vos emails après-achat donnent des conseils différents selon les produits commandés ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "odenya.fr": {
    "subject": "Une question sur votre diagnostic de peau",
    "body": "Bonjour à l'équipe d'Odenya,\n\nJ'ai découvert votre diagnostic de peau et vos gammes Essencya, Nutricya et Juvencya. Est-ce que vous envoyez déjà des conseils personnalisés par email après un diagnostic ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  },
  "caliece.fr": {
    "subject": "Une question sur vos deux boutiques",
    "body": "Bonjour à l'équipe de Calièce,\n\nJ'ai remarqué votre espace pour les particuliers et celui dédié aux professionnels. Est-ce que vos emails de bienvenue sont déjà différents selon ces deux publics ?\n\nJe lance MAILOTION, qui aide les boutiques en ligne à installer des emails automatiques. Pour mes premiers cas concrets, je cherche trois boutiques à accompagner gratuitement : je crée et installe une séquence de 2 ou 3 emails, sans engagement. Rien ne part à vos clients sans votre accord. En échange, j'aimerais simplement votre avis sincère.\n\nSi l'idée vous parle, répondez-moi simplement ici et je vous dirai ce que j'imagine pour votre boutique.\n\nBonne journée,\nLudovic — MAILOTION"
  }
};
const state={current:'',opened:'',openedSubject:'',openedMessage:'',skipped:new Set(),signature:'',loadedSubject:'',loadedBody:'',ready:false};
let saveTimer;
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim())}
function alreadySent(p){return (cloud()?.getActions()||[]).some(x=>x.prospectId===p.id&&x.type==='email_envoye'&&x.status==='terminee')}
function isInvalid(p){return p.emailStatus==='invalide'||(cloud()?.getEmails()||[]).some(x=>x.prospectId===p.id&&x.email?.trim().toLowerCase()===p.email?.trim().toLowerCase()&&x.status==='invalide')}
function eligible(p){return !!p&&!p.archived&&!p.clientAcquired&&['','a_contacter'].includes(p.stage||'')&&!p.lastContact&&!alreadySent(p)&&validEmail(p.email)&&!isInvalid(p)}
function queue(){return (crm()?.state.records||[]).filter(p=>eligible(p)&&!state.skipped.has(p.id)).sort((a,b)=>({haute:0,moyenne:1,basse:2}[a.priority]??3)-({haute:0,moyenne:1,basse:2}[b.priority]??3)||a.name.localeCompare(b.name,'fr'))}
function current(){return (crm()?.state.records||[]).find(p=>p.id===state.current)}
function fallback(p){const m=String(p?.website||'').match(/^(?:https?:\/\/)?([^/:?#]+)/i);return m?PUBLIC_DRAFTS[m[1].toLowerCase().replace(/^www\./,'')]||null:null}
function values(p){const d=fallback(p);return {subject:p?.outreachDraftSubject||d?.subject||'',body:p?.outreachDraftBody||d?.body||''}}
function setLead(id){
 const p=(crm()?.state.records||[]).find(x=>x.id===id);
 state.current=p?.id||'';state.opened='';state.openedSubject='';state.openedMessage='';
 const v=p?values(p):{subject:'',body:''};
 state.loadedSubject=v.subject;state.loadedBody=v.body;
 $('outreachSubject').value=v.subject;$('outreachBody').value=v.body;
 $('outreachLead').value=state.current;
 for(const key of ['outreachSubject','outreachBody','outreachFollowup'])$(key).disabled=!p;
 $('outreachSaved').textContent=p?(v.body?'✓ Mail prêt, modifiable librement':'Tu peux écrire ou coller le mail ici'):'Choisis une boutique';
 renderPreview();
}
function refresh(){
 if(!crm()||!cloud())return;
 const q=queue(),sig=q.map(p=>p.id+'|'+p.email+'|'+p.name).join('~');
 $('outreachCount').textContent=q.length+' boutique'+(q.length===1?'':'s')+' à contacter';
 if(sig!==state.signature){
  state.signature=sig;const select=$('outreachLead');select.replaceChildren();
  if(!q.length){select.add(new Option('Aucune boutique éligible',''));select.disabled=true}
  else{select.disabled=false;q.forEach(p=>select.add(new Option(p.name+(p.priority==='haute'?' ★':''),p.id)))}
 }
 $('outreachSkip').disabled=!q.length;
 if(!q.some(p=>p.id===state.current)){setLead(q[0]?.id||'');return}
 $('outreachLead').value=state.current;
 const v=values(current());
 if(v.subject!==state.loadedSubject&&document.activeElement!==$('outreachSubject')){state.loadedSubject=v.subject;$('outreachSubject').value=v.subject}
 if(v.body!==state.loadedBody&&document.activeElement!==$('outreachBody')){state.loadedBody=v.body;$('outreachBody').value=v.body}
 renderPreview();
}
function renderPreview(){
 const p=current(),valid=eligible(p)&&!state.skipped.has(p.id);
 const subject=$('outreachSubject').value.trim(),body=$('outreachBody').value.trim();
 $('outreachPreviewSubject').textContent=valid?subject:'Aucun mail à préparer';
 $('outreachPreviewTo').textContent=valid?'À : '+p.email:'Aucune boutique à contacter avec une adresse valide.';
 $('outreachPreviewBody').textContent=valid?body:'';
 $('outreachRecipient').textContent=valid?'Destinataire : '+p.email:'Aucun prospect éligible.';
 const badge=document.querySelector('.outreach-live');if(badge)badge.textContent=body?'● MAIL COMPLET':'○ À RÉDIGER';
 let warning='';
 if(valid){warning=p.emailStatus==='alternatif_a_tester'?'Adresse alternative à vérifier.':p.emailStatus!=='confirme'?'Adresse email non confirmée : vérifie-la avant envoi.':'';
 if(!cloud().status().connected)warning+=(warning?' ':'')+'Sans connexion Google : tes modifications restent sur ce téléphone jusqu’à synchronisation.';}
 $('outreachWarning').hidden=!warning;$('outreachWarning').textContent=warning;
 const ready=valid&&!!subject&&!!body,link=$('outreachCompose');
 link.href=ready?'mailto:'+encodeURIComponent(p.email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body):'#';
 link.setAttribute('aria-disabled',ready?'false':'true');link.classList.toggle('disabled',!ready);
 $('outreachConfirm').disabled=!(ready&&state.opened===p.id&&state.openedSubject===subject&&state.openedMessage===body);
}
function saveDraft(){
 const p=current();if(!p)return;
 p.outreachDraftSubject=$('outreachSubject').value.slice(0,200);p.outreachDraftBody=$('outreachBody').value.slice(0,4800);
 p.updatedAt=new Date().toISOString();state.loadedSubject=p.outreachDraftSubject;state.loadedBody=p.outreachDraftBody;
 state.opened='';state.openedSubject='';state.openedMessage='';
 $('outreachSaved').textContent='✓ Modifications enregistrées sur ce téléphone';
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>crm().persist(),450);
 renderPreview();
}
function openDraft(event){
 const p=current(),subject=$('outreachSubject').value.trim(),body=$('outreachBody').value.trim();
 if(!eligible(p)||!subject||!body){event.preventDefault();crm().toast('Complète l’objet et le mail avant d’ouvrir Gmail.');return}
 state.opened=p.id;state.openedSubject=subject;state.openedMessage=body;renderPreview();
}
function confirmSent(){
 const p=current();if(!p||p.id!==state.opened)return;
 const subject=$('outreachSubject').value.trim(),body=$('outreachBody').value.trim();
 if(subject!==state.openedSubject||body!==state.openedMessage){crm().toast('Brouillon modifié : ouvre-le à nouveau avant de confirmer.');return}
 if(!confirm('As-tu réellement envoyé cet email à '+p.name+' dans Gmail ?\n\nOK enregistrera cet envoi dans le CRM.'))return;
 const r=cloud().recordOutreachSent(p.id,p.email,subject,body,$('outreachFollowup').checked);
 if(!r.ok){crm().toast(r.error);return}
 $('outreachFollowup').checked=false;crm().toast('✓ Envoi enregistré pour '+p.name+'.');setTimeout(refresh,90);
}
function skip(){if(state.current)state.skipped.add(state.current);refresh()}
function init(){
 if(state.ready)return;if(!crm()||!cloud()){setTimeout(init,100);return}
 state.ready=true;
 $('outreachLead').addEventListener('change',e=>setLead(e.target.value));
 $('outreachSkip').addEventListener('click',skip);
 $('outreachSubject').addEventListener('input',saveDraft);$('outreachBody').addEventListener('input',saveDraft);
 $('outreachCompose').addEventListener('click',openDraft);$('outreachConfirm').addEventListener('click',confirmSent);
 window.addEventListener('mailotion:changed',()=>setTimeout(refresh,110));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refresh,110)});
 $('cloudConnect').addEventListener('click',()=>setTimeout(refresh,2500));
 refresh();
}
window.MailotionOutreach={select(id){if(!state.ready)return false;state.skipped.delete(id);if(!queue().some(p=>p.id===id))return false;refresh();setLead(id);$('outreachPanel').scrollIntoView({behavior:'smooth',block:'start'});return true}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();