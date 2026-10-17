(()=>{
'use strict';
// Un email à la fois. Aucun envoi automatique.
const STORAGE='mailotion-outreach-template-v1';
const LEGACY_BODY="Je développe actuellement MAILOTION et je cherche\nquelques boutiques en ligne pour tester gratuitement\nmon travail.\n\nMon idée est simple : vous aider à récupérer davantage\nde ventes grâce aux paniers abandonnés et à donner\nenvie à vos clients de revenir acheter, avec des emails\nmieux pensés et adaptés à votre univers.\n\nMême si vous avez déjà des emails automatiques,\nil y a peut-être des choses à améliorer.\n\nJe vous propose de m'en occuper gratuitement,\nsans engagement. En échange, j'aimerais simplement\navoir votre avis sur le résultat.\n\nEst-ce que ça pourrait vous intéresser ?\n\nBonne journée,\nLudovic — MAILOTION";
const PREVIOUS_PILOT_BODY="Je lance MAILOTION et je sélectionne trois boutiques en ligne pour un programme pilote gratuit.\n\nJe commence par regarder les emails déjà en place, puis je prépare une seule automatisation adaptée (bienvenue, panier abandonné ou après-achat), avec 2 à 3 emails. Je la configure et la teste, puis je propose un premier bilan après 10 à 14 jours et un petit ajustement si nécessaire.\n\nIl n'y a aucun paiement ni engagement. En échange, j'aimerais simplement un retour franc sur le travail réalisé. Je choisis les trois boutiques selon leurs besoins et la compatibilité de leurs outils.\n\nBonne journée,\nLudovic — MAILOTION";
const DEFAULT_BODY="Je lance MAILOTION et, pour commencer, je cherche trois boutiques en ligne avec lesquelles travailler gratuitement. J'ai pris le temps de regarder votre boutique et j'ai eu envie de vous écrire.\n\nL'idée est toute simple : regarder ce que vous avez déjà mis en place, puis créer et installer une seule petite séquence automatique de 2 ou 3 emails (bienvenue, panier abandonné ou après-achat). Rien ne part à vos clients sans votre accord. On fait ensuite un premier point après 10 à 14 jours et un petit ajustement si besoin.\n\nC'est entièrement gratuit pour mon travail, sans abonnement à MAILOTION et sans engagement. En échange, j'aimerais juste avoir votre avis sincère.\n\nBonne journée,\nLudovic — MAILOTION";
const PILOT_URL="https://www.ludovicdulac.com/7841a0d7";
const PILOT_INVITATION="Vous pouvez tout simplement me répondre ici si cela vous intéresse. J'ai aussi prévu un petit formulaire si vous préférez :\nhttps://www.ludovicdulac.com/7841a0d7";
const $=id=>document.getElementById(id);
const crm=()=>window.MailotionCRM;
const cloud=()=>window.MailotionCloud;

/*
 * Repli hors connexion basé UNIQUEMENT sur des informations publiques des sites.
 * Aucune adresse email, fiche, note privée ni donnée Google Sheets publiée ici.
 * Si une vraie personnalisation du CRM privé est disponible, elle est prioritaire.
 */
const PUBLIC_SITE_QUESTIONS={
 'echlo-cosmetique.fr': {
  text:"D'ailleurs, en regardant votre site, j'ai découvert votre coffret découverte et vos soins botaniques. Est-ce que vous expliquez déjà par email comment associer les différents produits ? Et après un premier achat, proposez-vous une routine complémentaire ?",
  source:"https://echlo-cosmetique.fr/produit/coffret-decouverte/"
 },
 'sous-l-ecorce.fr': {
  text:"D'ailleurs, j'ai vu vos coffrets bien-être et le rituel visage qui associe plusieurs soins. Est-ce que vous envoyez déjà des conseils d'utilisation après l'achat d'un coffret ? Et lorsqu'une personne hésite et laisse sa commande en cours, reçoit-elle un rappel adapté ?",
  source:"https://www.sous-l-ecorce.fr/categorie-produit/coffrets-bien-etre/"
 },
 'cledeschamps.eu': {
  text:"D'ailleurs, en parcourant votre site, j'ai aimé votre façon de décliner les soins selon les saisons, avec notamment la crème à la châtaigne et le sérum d'automne. Est-ce que vous accompagnez déjà vos clientes par email quand elles passent d'une saison à l'autre ? Et avez-vous un message prévu pour celles qui hésitent avant de terminer leur commande ?",
  source:"https://www.cledeschamps.eu/automne/"
 },
 'symphytum.fr': {
  text:"D'ailleurs, j'ai découvert votre routine « Peau Délicate » et votre travail autour de la consoude. Est-ce que vous envoyez déjà des conseils pour utiliser les soins d'une routine après l'achat ? Et lorsqu'une personne hésite avant de commander, l'aidez-vous par email à choisir ?",
  source:"https://symphytum.fr/produit/routine-peau-delicate/"
 },
 'fleursdecafe.fr': {
  text:"D'ailleurs, en regardant votre site, j'ai découvert vos soins à base de café revalorisé, notamment le gommage et la crème. Est-ce que vous présentez déjà par email comment les associer dans une routine ? Et avez-vous prévu une relance pour les personnes qui ne terminent pas leur panier ?",
  source:"https://fleursdecafe.fr/"
 },
 'kaleparis.com': {
  text:"D'ailleurs, j'ai vu sur votre boutique la Base Nacrée et le Sérum Hydratant & Régénérant. Est-ce que vous expliquez déjà par email comment utiliser ces produits dans une routine ? Et avez-vous prévu un rappel pour les visiteurs qui hésitent à commander ?",
  source:"https://www.kaleparis.com/boutique"
 },
 'nansca.com': {
  text:"D'ailleurs, j'ai découvert votre laboratoire familial et la variété de vos soins, notamment vos crèmes et vos élixirs. Est-ce que vous aidez déjà chaque client à choisir sa routine par email ? Et après un premier achat, proposez-vous des soins complémentaires adaptés ?",
  source:"https://nansca.com/"
 },
 'la-canopee.com': {
  text:"D'ailleurs, j'ai remarqué que vous proposez déjà une newsletter, un programme de fidélité et plusieurs routines de soins. Est-ce que vos emails après-achat conseillent une suite différente selon le produit acheté ? Et avez-vous testé plusieurs types de rappels de panier selon les gammes ?",
  source:"https://www.la-canopee.com/"
 },
 'odenya.fr': {
  text:"D'ailleurs, j'ai vu votre diagnostic de peau et vos différentes gammes de soins. Est-ce que les personnes qui font ce diagnostic reçoivent déjà des conseils adaptés par email ? Et lorsqu'elles hésitent sur un pack, avez-vous un message de relance qui reprend les soins regardés ?",
  source:"https://odenya.fr/"
 },
 'caliece.fr': {
  text:"D'ailleurs, j'ai remarqué vos deux espaces de vente, l'un pour les particuliers et l'autre pour les professionnels. Est-ce que vos emails de bienvenue sont déjà différents selon ces publics ? Et avez-vous prévu un rappel de panier adapté aux particuliers ?",
  source:"https://caliece.fr/"
 }
};
function publicSiteData(p){
 try{
  const u=new URL(p?.website||'');const host=u.hostname.toLowerCase().replace(/^www\./,'');
  return PUBLIC_SITE_QUESTIONS[host]||null;
 }catch{return null}
}
function personalText(p){return (p?.outreachPersonal||'').trim()||publicSiteData(p)?.text||''}

const state={current:'',opened:'',openedMessage:'',openedSubject:'',skipped:new Set(),signature:'',ready:false};
let personalTimer;
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
 return (/^[AaEeIiOoUuYyÀÂÄÉÈÊËÎÏÔÖÙÛÜŒÆ]/.test(p.name)?'Bonjour à l’équipe d’':'Bonjour à l’équipe de ')+p.name+',';
}
function setLead(id){
 const p=(crm()?.state.records||[]).find(x=>x.id===id);
 state.current=p?.id||'';state.opened='';state.openedMessage='';state.openedSubject='';
 $('outreachGreeting').value=p?greeting(p):'';
 $('outreachSubject').value=p?'Une proposition un peu particulière pour '+p.name:'';
 $('outreachPersonal').value=p?personalText(p):'';
 $('outreachLead').value=state.current;
 for(const n of ['outreachGreeting','outreachSubject','outreachBody','outreachFollowup','outreachPersonal'])$(n).disabled=!p;
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
 if(q.some(p=>p.id===state.current)){
  $('outreachLead').value=state.current;
  const p=current();if(document.activeElement!==$('outreachPersonal')&&$('outreachPersonal').value!==personalText(p))$('outreachPersonal').value=personalText(p);
  renderPreview()
 }
 else setLead(q[0]?.id||'');
}
function composeMessage(){
 const salutation=$('outreachGreeting').value.trim();
 const common=$('outreachBody').value.trim();
 const personal=$('outreachPersonal').value.trim();
 // Préserver les deux questions personnalisées avant le lien et la signature.
 // Ajouter le lien à tous les brouillons, même si le modèle local a été modifié.
 const invitation=(common+'\n'+personal).includes(PILOT_URL)?'':PILOT_INVITATION;
 const match=common.match(/\n\s*(Bonne journée,\s*\nLudovic\s*[—-]\s*MAILOTION\s*)$/i);
 if(!match)return [salutation,common,personal,invitation].filter(Boolean).join('\n\n');
 const text=common.slice(0,match.index).trim();
 return [salutation,text,personal,invitation,match[1].trim()].filter(Boolean).join('\n\n');
}
function updateResearch(p){
 const fromPrivate=!!p?.outreachPersonal?.trim();
 const backup=!fromPrivate?publicSiteData(p):null;
 const filled=!!personalText(p);
 $('outreachResearchBadge').textContent=fromPrivate?(p.outreachReviewedAt?'Analysé le '+p.outreachReviewedAt.split('-').reverse().join('/'):'Questions enregistrées'):backup?'Questions préparées':'À analyser';
 $('outreachResearchBadge').classList.toggle('ready',filled);
 $('outreachResearchNote').textContent=fromPrivate?(p.outreachResearch||'Questions personnalisées enregistrées dans ton CRM.'):(backup?'Questions préparées à partir d’éléments publics du site. Tu peux les vérifier avant d’envoyer.':'Aucune question prête pour cette boutique. Il faut analyser son site avant l’envoi.');
 const live=document.querySelector('.outreach-live');
 if(live)live.textContent=filled?'● QUESTIONS PRÉPARÉES':'○ À PERSONNALISER';
 let link='';
 try{const u=new URL(p?.outreachSource||backup?.source||'');if(u.protocol==='https:'||u.protocol==='http:')link=u.href}catch{}
 $('outreachSource').hidden=!link;if(link)$('outreachSource').href=link;
}
function savePersonal(){
 const p=current();if(!p)return;
 p.outreachPersonal=$('outreachPersonal').value.slice(0,1800);
 p.updatedAt=new Date().toISOString();
 $('outreachResearchBadge').textContent='Modifié sur ce téléphone';
 clearTimeout(personalTimer);
 personalTimer=setTimeout(()=>{crm().persist();},420);
 renderPreview();
}
function renderPreview(){
 const p=current(),valid=eligible(p)&&!state.skipped.has(p.id);
 const subject=valid?$('outreachSubject').value.trim():'Aucun email à préparer';
 const content=valid?composeMessage():'';
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
 if(valid&&!$('outreachPersonal').value.trim())warning+=(warning?' ':'')+'Personnalisation absente : questions à préparer avant l’envoi.';
  $('outreachWarning').hidden=!warning;$('outreachWarning').textContent=warning;
 updateResearch(p);
 const ready=valid&&!!$('outreachGreeting').value.trim()&&!!$('outreachSubject').value.trim()&&!!$('outreachBody').value.trim()&&!!$('outreachPersonal').value.trim();
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
 if(!eligible(p)||!$('outreachGreeting').value.trim()||!$('outreachSubject').value.trim()||!$('outreachBody').value.trim()||!$('outreachPersonal').value.trim()){
  event.preventDefault();crm().toast('Vérifie la boutique, l’adresse, l’objet et le message.');return;
 }
 state.opened=p.id;
 state.openedSubject=$('outreachSubject').value.trim();
 state.openedMessage=composeMessage();
 renderPreview();
 // La véritable action Envoyer doit être réalisée dans la messagerie choisie.
}
function confirmSent(){
 const p=current();if(!p||p.id!==state.opened)return;
 const subject=$('outreachSubject').value.trim(),content=composeMessage();
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
 try{
  const saved=localStorage.getItem(STORAGE);
  const olderShopify=LEGACY_BODY.replace('quelques boutiques en ligne','quelques boutiques Shopify');
  const upgrade=saved===LEGACY_BODY||saved===olderShopify||saved===PREVIOUS_PILOT_BODY;
  $('outreachBody').value=(saved===null||upgrade)?DEFAULT_BODY:saved;
  if(upgrade)localStorage.setItem(STORAGE,DEFAULT_BODY);
 }catch{$('outreachBody').value=DEFAULT_BODY}
 $('outreachLead').addEventListener('change',e=>setLead(e.target.value));
 $('outreachSkip').addEventListener('click',skip);
 $('outreachBody').addEventListener('input',()=>{saveText();renderPreview()});
 $('outreachGreeting').addEventListener('input',renderPreview);
 $('outreachSubject').addEventListener('input',renderPreview);
 $('outreachPersonal').addEventListener('input',savePersonal);
 $('outreachReset').addEventListener('click',()=>{if(!confirm('Revenir au message initial Mailotion et remplacer ton texte enregistré ?'))return;$('outreachBody').value=DEFAULT_BODY;saveText();renderPreview()});
 $('outreachCompose').addEventListener('click',openDraft);
 $('outreachConfirm').addEventListener('click',confirmSent);
 window.addEventListener('mailotion:changed',()=>setTimeout(refresh,110));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refresh,110)});
 $('cloudConnect').addEventListener('click',()=>setTimeout(refresh,2500));
 refresh();
}
// Le raccourci des fiches doit ouvrir cet atelier, pas un ancien email générique.
window.MailotionOutreach={
 select(id){
  if(!state.ready)return false;
  state.skipped.delete(id);
  if(!queue().some(p=>p.id===id))return false;
  refresh();setLead(id);
  $('outreachPanel').scrollIntoView({behavior:'smooth',block:'start'});
  return true;
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();