const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
const html=read('index.html'),app=read('app.js'),cloud=read('crm-cloud.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'IDs HTML uniques');
// M003 — simplification d'interface non destructive, reversible sur telephone.
assert.ok(html.includes('id="modeToggle"')&&html.includes('src="./simple.js"'));
assert.ok(html.includes('href="./simple.css"'));
const simpleJs=read('simple.js'),simpleCss=read('simple.css');
new Function(simpleJs);
assert.ok(simpleJs.includes('mailotion-crm-display-v1')&&simpleJs.includes('crm-simple'));
assert.ok(simpleJs.includes('fEmailStatus')&&simpleJs.includes('fPaidOffer'),
 'Les champs anciens restent presents meme s\'ils sont masques');
assert.ok(simpleCss.includes('.outreach-panel')&&simpleCss.includes('.stat[data-summary="free"]'));
for(const id of ['cloudConnect','fName','fEmail','fPhone','fStage','fNotes','outreachConfirm','backupBtn','restoreBtn','modeToggle'])
 assert.ok(ids.includes(id),'Composant obligatoire conserve : '+id);
assert.ok(read('sw.js').includes('simple.js')&&read('sw.js').includes('simple.css'),
 'Le cache PWA contient le mode simple');

for(const name of ['app.js','crm-cloud.js','outreach.js','sw.js'])new Function(read(name));
for(const [,id] of [...app.matchAll(/\$\('([^']+)'\)/g),...cloud.matchAll(/\$\('([^']+)'\)/g)])assert.ok(ids.includes(id),'Champ '+id+' existe dans HTML');
const publicData=JSON.parse(read('prospects.json'));
assert.equal(publicData.boutiques.length,32,'Les 11 anciens + 21 nouveaux prospects publics sont disponibles');
assert.equal(publicData.boutiques.filter(x=>x.campagne_appel==='savonneries-2026-10').length,21,
 'Les 21 savonneries sont publiées pour le mode sans connexion');
const newCallIds=publicData.boutiques.filter(x=>x.campagne_appel==='savonneries-2026-10');
assert.equal(new Set(newCallIds.map(x=>x.id)).size,21,'Aucun doublon d’entreprise');
for(const x of newCallIds){
 assert.match(x.telephone,/^(06|07)\s/,'Téléphone professionnel mobile fourni');
 assert.ok(x.site.startsWith('https://')&&x.source_url.startsWith('https://'),
 'Site et source publics vérifiables');
 assert.ok(!('notes' in x)&&!('stage' in x)&&!('lastContact' in x)&&!('callGuide' in x)&&!('email' in x),
 'Aucune donnée privée ni statut diffusé dans le dépôt public');
}
assert.ok(app.includes('callCampaign:txt')&&app.includes('callAngle:txt'),
 'La campagne n’est pas perdue durant l’import public');
assert.ok(cloud.includes("seedPublicCallTasks()"),'Tâches d’appels créées en local');
assert.ok(cloud.includes("call-20261026-"),'Identifiant public identique au Sheets privé');
assert.ok(cloud.includes("['Prospects!A2:G','Actions!A2:H','Emails!A2:G']"),
 'Synchronisation privée sans dépassement de la taille du classeur');
assert.ok(cloud.includes("const seeded=seedPublicCallTasks();"),
 'Nouvelles boutiques génèrent bien des tâches lorsqu’elles arrivent');

for(const b of publicData.boutiques){assert.equal(b.notes,undefined,'Pas de notes privées dans GitHub');assert.equal(b.contact_statut,undefined,'Pas de statut privé dans GitHub');}
const replaced=cloud.replace(/if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',init,\{once:true\}\);else init\(\);\n\}\)\(\);/, 'return {mergeRecord,deduplicate,values,fp,clean};\n})();');
assert.notEqual(replaced,cloud,'Test extraction fonctions cloud');
const store={};
const env={localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},window:{MailotionCRM:{sanitize:r=>r}}};
const api=vm.runInNewContext(replaced,env);
const base={id:'id-1',name:'Boutique fictive',website:'https://exemple.fr',notes:'a',priority:'moyenne',updatedAt:'2026-10-10T00:00:00Z'};
assert.equal(api.mergeRecord('Prospects',{...base,notes:'nouveau'},base,base).notes,'nouveau','Changement ChatGPT conservé');
assert.equal(api.mergeRecord('Prospects',base,{...base,priority:'haute'},base).priority,'haute','Changement téléphone conservé');
assert.equal(api.mergeRecord('Prospects',{...base,notes:'cloud'},{...base,notes:'phone'},base).notes,'cloud','Conflit ne remplace pas silencieusement le cloud');
assert.ok(store['mailotion-conflicts-v1'],'Conflit sauvegardé');
assert.equal(api.deduplicate([{id:'a',name:'Échoppe',website:'https://www.exemple.fr'},{id:'b',name:'Echoppe',website:'https://exemple.fr'},{id:'c',name:'Autre',website:'https://autre.fr'}]).length,2,'Doublons évités');
const values=api.values('Prospects',base);
assert.equal(values.length,7,'Colonnes Sheets prospects');
assert.equal(JSON.parse(values[6]).id,base.id,'JSON intact');
const sw=read('sw.js');assert.ok(sw.includes('crm-cloud.js'),'Module cloud disponible hors ligne');

// La prospection n'envoie jamais d'email toute seule : le mailto ouvre la messagerie,
// l'historique est créé seulement après validation humaine explicite.
const outreach=read('outreach.js');
assert.ok(html.includes('id="outreachCompose"')&&html.includes('id="outreachConfirm"'));
assert.ok(html.includes('src="./outreach.js"'));
assert.ok(sw.includes('outreach.js'),'Prospection disponible après installation de la PWA');
assert.ok(outreach.includes('mailto:')&&outreach.includes('recordOutreachSent'));
// L'atelier actuel contient UN email complet et un objet par boutique.
// L'utilisateur modifie librement le brouillon, puis ouvre sa messagerie.
assert.ok(outreach.includes('outreachDraftSubject') && outreach.includes('outreachDraftBody'),
 'Chaque boutique conserve son objet et son email complet');
assert.ok(outreach.includes('function openDraft(') && outreach.includes('function confirmSent('));
assert.ok(outreach.includes("state.opened===p.id") && outreach.includes('recordOutreachSent('),
 'Le CRM ne confirme pas une ouverture de brouillon comme un envoi');
assert.ok(outreach.includes("if(!confirm("), 'Validation humaine avant historique d’envoi');

const extract=outreach.replace(/if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',init,\{once:true\}\);else init\(\);\n\}\)\(\);/,
 'return {eligible,selectable,queue,alreadySent,isInvalid,values,fallback};\n})();');
assert.notEqual(extract,outreach,'Extraire les fonctions actuelles de prospection');
const leads=[
 {id:'a',name:'Boutique Bonjour',email:'contact@bonjour.fr',stage:'a_contacter',lastContact:'',priority:'haute'},
 {id:'b',name:'Boutique Contactée',email:'contact@deja.fr',stage:'contactee'},
 {id:'c',name:'Boutique invalide',email:'invalide@shop.fr',stage:'a_contacter',emailStatus:'invalide'},
 {id:'d',name:'Boutique déjà envoyée',email:'contact@ancienne.fr',stage:'a_contacter'},
 {id:'e',name:'Boutique sans email',email:'',stage:'a_contacter'},
 {id:'f',name:'Boutique Paul',contact:'Paul',email:'bonjour@paul.fr',stage:'a_contacter'}
];
const outreachContext={window:{
 MailotionCRM:{state:{records:leads}},
 MailotionCloud:{getActions:()=>[{prospectId:'d',type:'email_envoye',status:'terminee'}],getEmails:()=>[]}
}};
const funcs=vm.runInNewContext(extract,outreachContext);
const queueIds=funcs.queue().map(p=>p.id);
assert.equal(funcs.queue()[0].id,'a','Prospect prioritaire en premier');
assert.equal(queueIds.length,4,'Deux emails possibles, deux contacts via formulaire');
assert.ok(queueIds.includes('c')&&queueIds.includes('e'),'Les boutiques sans email valide restent joignables via formulaire');
assert.ok(!queueIds.includes('b')&&!queueIds.includes('d'),'Aucun nouvel email pour les boutiques déjà contactées');
assert.equal(funcs.eligible(leads[0]),true,'Adresse présente et prospect non contacté');
assert.equal(funcs.eligible(leads[2]),false,'Email rejeté jamais autorisé à l’envoi');
assert.equal(funcs.eligible(leads[3]),false,'Envoi déjà historisé interdit');
assert.equal(funcs.eligible(leads[4]),false,'Adresse manquante jamais utilisée');
assert.equal(funcs.selectable(leads[2]),true,'Email invalide orienté vers formulaire');
assert.equal(funcs.selectable(leads[4]),true,'Email manquant orienté vers formulaire');
const cur=funcs.values({website:'https://echlo-cosmetique.fr'});
assert.ok(cur.subject.includes('coffret découverte')&&cur.body.includes('ÉCHLO'),
 'La maquette publique personnalisée peut servir de secours');
assert.equal((cur.body.match(/\?/g)||[]).length,1,'Un seul point de question dans la prospection individualisée');
assert.ok(!cur.body.includes('https://www.ludovicdulac.com/7841a0d7'),
 'Pas de lien vers la page pilote dans le premier email');
const custom=funcs.values({website:'https://echlo-cosmetique.fr',outreachDraftSubject:'Objet validé',outreachDraftBody:'Message validé par l’utilisateur'});
assert.equal(custom.subject,'Objet validé','Le sujet privé prévaut sur le modèle');
assert.equal(custom.body,'Message validé par l’utilisateur','Le texte privé prévaut sur le modèle');
assert.equal(funcs.values({website:'https://exemple-inconnu.fr'}).body,'',
 'Ne jamais inventer le contenu d’un brouillon sans modèle');

// M005 — l'accueil doit montrer les actions réelles, leur destinataire et le message à copier.
const inbox=read('task-inbox.js');
new Function(inbox);
for(const id of ['taskInbox','taskInboxCount','taskInboxList','taskInboxRefresh','aChannel','aRecipient','aMessage'])
 assert.ok(ids.includes(id),'Composant tâches présent : '+id);
assert.ok(sw.includes('task-inbox.js'),'Le cache mobile contient la liste des tâches');
assert.ok(html.includes('src="./task-inbox.js"'),'Le module tâches est chargé sur mobile');
assert.ok(html.indexOf('id="taskInbox"')<html.indexOf('class="stats"'),'À faire est avant les statistiques');
assert.ok(cloud.includes('markTaskDone')&&cloud.includes('completedAt'),'Une confirmation précède la clôture');
const actionForm=api.clean('Actions',{id:'x',prospectId:'p',type:'relance',status:'a_faire',channel:'whatsapp',recipient:'+33 6 00 00 00 00',message:'Bonjour <Thomas>'});
assert.equal(actionForm.channel,'whatsapp');
assert.equal(actionForm.recipient,'+33 6 00 00 00 00');
assert.equal(actionForm.message,'Bonjour <Thomas>');
assert.equal(api.values('Actions',actionForm).length,8,'Schéma Sheets 8 colonnes inchangé');
assert.ok(JSON.parse(api.values('Actions',actionForm)[7]).message.includes('<Thomas>'),'Message conservé dans le JSON privé');
const inboxExtract=inbox.replace(/if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',init,\{once:true\}\);else init\(\);\n\}\)\(\);/,
 'return {active,recipient,link,card};\n})();');
assert.notEqual(inboxExtract,inbox,'Les fonctions de tâches sont testables');
const inboxApi=vm.runInNewContext(inboxExtract,{window:{},document:{},navigator:{},URL,Date});
const exampleCard=inboxApi.card(actionForm,new Map([['p',{name:'Prospect fictif'}]]));
assert.ok(exampleCard.includes('Bonjour &lt;Thomas&gt;'),'Le message est échappé dans le HTML');
assert.ok(exampleCard.includes('Copier le message')&&exampleCard.includes('data-inbox-done'),'Copie et validation manuelle');
assert.ok(inboxApi.link(actionForm,'+33 6 00 00 00 00').startsWith('https://wa.me/'),'WhatsApp est ouvert sans envoyer');
assert.equal(inboxApi.active({...actionForm,status:'terminee'}),false,'Une tâche terminée disparaît');

// M005 mobile — le mode simple doit être le défaut, même avec un ancien réglage full.
assert.ok(html.includes('<body class="crm-simple">'),'Le HTML s’ouvre directement en mode simple');
assert.ok(html.includes('id="simpleBoutiquesToggle"'),'Boutiques accessibles à la demande');
assert.ok(html.includes('id="inboxConnect"'),'Google connecté depuis l’écran des tâches');
assert.ok(!simpleJs.includes('localStorage.getItem(KEY)'),'Ancienne préférence full ignorée au lancement');
assert.ok(simpleJs.includes("let compact=true"),'Mode simple réinitialisé à chaque ouverture');
assert.ok(simpleJs.includes('simple-boutiques-open'),'Liste des boutiques repliable');
assert.ok(simpleCss.includes('body.crm-simple .board{display:none}'),'Fiches boutique masquées en mode simple');
assert.ok(simpleCss.includes('body.crm-simple.simple-boutiques-open .board{display:block}'),'Boutiques affichables sur demande');
assert.ok(read('task-inbox.js').includes("connect.hidden=connected"),'Connecter Google proposé lorsque non connecté');

// M006 — antisèche téléphonique repliable et sauvegardée hors du GitHub public.
const phoneGuide=[{q:'Est-ce gratuit ?',a:'Oui, pilote gratuit sans engagement.'},{q:'<Code?>',a:'Ne jamais inventer.'}];
const cleanedGuide=api.clean('Actions',{id:'guide',prospectId:'p',status:'a_faire',callGuide:phoneGuide});
assert.equal(cleanedGuide.callGuide.length,2,'Deux réponses persistées dans l’action privée');
assert.deepEqual(JSON.parse(api.values('Actions',cleanedGuide)[7]).callGuide,phoneGuide,'Les réponses survivent au JSON Google Sheets');
const maliciousGuide=api.clean('Actions',{callGuide:[{q:'<iframe>',a:'<script>alert(1)</script>'}]});
const safeCard=inboxApi.card(maliciousGuide,new Map());
assert.ok(safeCard.includes('Questions / réponses pendant l’appel'),'Antisèche accessible depuis la tâche');
assert.ok(safeCard.includes('&lt;iframe&gt;'),'Question échappée');
assert.ok(safeCard.includes('&lt;script&gt;'),'Réponse échappée');
assert.ok(!safeCard.includes('<iframe>')&&!safeCard.includes('<script>'),'Aucune injection HTML');
assert.ok(safeCard.includes('<details'),'Aide fermée par défaut');
assert.ok(simpleCss.includes('.inbox-qa{'),'Aide lisible sur Android');
assert.ok(sw.includes('mailotion-crm-v22-m012-newsletter-audit'),'Cache Android incrémenté et valide');
assert.ok(cloud.includes('callGuide:old?.callGuide||[]'),'L’édition n’efface pas la fiche Q/R');

// M007 — questions par boutique, données privées, non supposées à l'avance.
const diag=read('diagnostic.js');
new Function(diag);
for(const id of ['diagnosticLaunch','diagnosticDialog','diagnosticProspect','diagnosticQuestions','diagnosticGoal','diagnosticTool','diagnosticNotes','diagnosticSave','diagnosticSaved','diagnosticClose','diagnosticProgress'])
 assert.ok(ids.includes(id),'Élément diagnostic présent : '+id);
assert.ok(html.includes('src="./diagnostic.js"'),'Nouvel écran diagnostique chargé');
assert.ok(sw.includes("'./diagnostic.js'"),'Diagnostic préchargé pour usage hors ligne');
assert.ok(sw.includes('mailotion-crm-v22-m012-newsletter-audit'),'Le cache PWA mobile est renouvelé');
assert.ok(app.includes('data-diagnostic-prospect'),'Accès depuis chaque fiche boutique');
assert.ok(inbox.includes('data-diag-prospect'),'Accès depuis la tâche téléphonique');
assert.ok(cloud.includes('saveDiagnostic')&&cloud.includes('getDiagnostic'),'Accès aux enregistrements privés');
const answers=api.clean('Actions',{id:'diagnostic-chic',prospectId:'chic',type:'note',status:'terminee',
 diagnosticAnswers:{welcome:'yes',cart:'no',after_purchase:'',reorder:'na',injection:'<script>'},
 diagnosticNotes:{goal:'Augmenter le 2e achat',tool:'Shopify Email',notes:'Retour direct du marchand'},
 diagnosticEvidence:{welcome:'Email reçu le 25 octobre',bad:17}});
assert.equal(answers.diagnosticAnswers.welcome,'yes');
assert.equal(answers.diagnosticAnswers.cart,'no');
assert.equal(answers.diagnosticAnswers.reorder,'na');
assert.equal(answers.diagnosticAnswers.injection,undefined,'Ne pas conserver de statut non autorisé');
assert.equal(answers.diagnosticNotes.goal,'Augmenter le 2e achat');
assert.equal(answers.diagnosticEvidence.welcome,'Email reçu le 25 octobre');
assert.equal(answers.diagnosticEvidence.bad,undefined);
const roundtrip=JSON.parse(api.values('Actions',answers)[7]);
assert.equal(JSON.stringify(roundtrip.diagnosticAnswers),JSON.stringify(answers.diagnosticAnswers),'Case cochée préservée dans le JSON privé');
assert.equal(JSON.stringify(roundtrip.diagnosticNotes),JSON.stringify(answers.diagnosticNotes),'Notes préservées dans le JSON privé');
assert.ok(!JSON.stringify(publicData).includes('diagnosticAnswers'),'Aucune réponse privée dans les contacts publics');
assert.ok(diag.includes("selected===v?'selected':''"),'Valeurs sauvegardées remises dans les sélecteurs');
assert.ok(diag.includes('À vérifier'),'Une absence de réponse ne veut pas dire Non');
assert.ok(diag.includes('Pas utile'),'Une question peut être sans objet pour cette boutique');
assert.ok(diag.includes('Une boîte à idées')===false,'Les consignes restent dans le HTML et non dans le code');


/* M008 — inscription newsletter : lien https cliquable sans action déclenchée par le CRM. */
const newsletterAction=api.clean('Actions',{
 id:'newsletter-test',prospectId:'p',type:'tache',status:'a_faire',channel:'newsletter',
 recipient:'https://ulul-couture.fr/#:~:text=Inscris-toi',description:'S’inscrire à la newsletter'
});
assert.equal(newsletterAction.channel,'newsletter','Canal newsletter conservé après clean/synchro');
assert.equal(api.values('Actions',newsletterAction).length,8,'Schéma Google Sheets inchangé');
assert.equal(JSON.parse(api.values('Actions',newsletterAction)[7]).recipient,newsletterAction.recipient);
assert.equal(inboxApi.link(newsletterAction,newsletterAction.recipient),newsletterAction.recipient,'HTTPS autorisé');
assert.equal(inboxApi.link(newsletterAction,'javascript:alert(1)'),'', 'Schéma dangereux refusé');
assert.equal(inboxApi.link(newsletterAction,'http://ulul-couture.fr/'),'', 'HTTP refusé');
const newsletterCard=inboxApi.card(newsletterAction,new Map([['p',{name:'ULUL Couture'}]]));
assert.ok(newsletterCard.includes('S’inscrire ↗'),'Bouton direct accessible');
assert.ok(newsletterCard.includes('https://ulul-couture.fr/'),'Destination présente');
assert.ok(!newsletterCard.includes('>https://ulul-couture.fr'),'URL non encombrante');
const unknownSignup=api.clean('Actions',{id:'website',prospectId:'p',channel:'site',recipient:'https://example.com'});
assert.ok(inboxApi.card(unknownSignup,new Map()).includes('Voir le site ↗'),'Formulaire non confirmé : étiquette distincte');
assert.ok(inbox.includes('data-inbox-expand'),'Bouton Voir toutes les tâches présent');
assert.ok(html.includes('value="newsletter"')&&html.includes('value="site"'),'Canaux accessibles dans le formulaire');
assert.ok(sw.includes('mailotion-crm-v22-m012-newsletter-audit'),'Cache PWA mobile renouvelé');


// M009 — une fiche boutique accessible directement dans toute tâche (appel, email, newsletter).
const knownSite={name:'Chic des Plantes !',website:'https://www.chicdesplantes.fr/'};
const callSiteCard=inboxApi.card({
 id:'chic-call',prospectId:'chic-des-plantes',channel:'telephone',
 recipient:'01 81 80 15 80',description:'Appeler Chic des Plantes',
 message:'Bonjour, je voudrais parler au responsable.'
},new Map([['chic-des-plantes',knownSite]]));
assert.ok(callSiteCard.includes('href="https://www.chicdesplantes.fr/"'),'Site officiel dans le rendez-vous Chic');
assert.ok(callSiteCard.includes('🌐 Voir la boutique ↗'),'Lien visite visible dans la tâche');
assert.ok(callSiteCard.indexOf('🌐 Voir la boutique')<callSiteCard.indexOf('Bonjour, je voudrais parler'),
 'Site au-dessus du long discours pour une consultation rapide');
assert.ok(callSiteCard.includes('target="_blank" rel="noopener noreferrer"'),'Site s’ouvre séparément');
assert.ok(inboxApi.card({
 id:'test-mail',prospectId:'chic-des-plantes',channel:'email',recipient:'test@example.org'
},new Map([['chic-des-plantes',knownSite]])).includes('Voir la boutique'),
 'Le lien existe aussi dans les tâches email');
const missingSite=inboxApi.card({
 id:'missing',prospectId:'missing',channel:'telephone',recipient:'01 01 01 01 01'
},new Map([['missing',{email:'hello@example.com'}]]));
assert.ok(missingSite.includes('Site de la boutique à renseigner'),'Ne pas inventer de site depuis l’email');
assert.ok(!missingSite.includes('href="https://example.com"'),'Pas de domaine déduit de l’adresse email');
const unsafeSite=inboxApi.card({
 id:'unsafe',prospectId:'unsafe',channel:'telephone'
},new Map([['unsafe',{website:'javascript:alert(1)'}]]));
assert.ok(!unsafeSite.includes('href="javascript:'),'URL dangereuse bloquée');
const fallbackSite=inboxApi.card({
 id:'fallback',prospectId:'fallback',channel:'newsletter',recipient:'https://boutique-exemple.fr/'
},new Map([['fallback',{name:'Boutique'}]]));
assert.ok(fallbackSite.includes('href="https://boutique-exemple.fr/"'),'Repli sûr sur le lien existant');
assert.ok(simpleCss.includes('.inbox-site-link{'),'Lien adapté à la lecture mobile');


// M010 — Appels : vue filtrée, tous les numéros visibles, résumé dépliable par boutique.
assert.ok(html.includes('id="taskInboxCalls"'),'Bouton « Mes appels » accessible sur l’accueil');
assert.ok(inbox.includes("a.channel==='telephone'?'📞 Récapitulatif de l’appel'"),'Le résumé remplace le texte long sur les appels');
assert.ok(inbox.includes("todo=all.filter(a=>!callsOnly||a.channel==='telephone')"),'Filtre d’appel séparé des newsletters et autres tâches');
assert.ok(inbox.includes("expanded||callsOnly?todo:todo.slice(0,8)"),'Tous les appels de la session affichés');
assert.ok(inbox.includes("$('taskInboxCalls')?.addEventListener"),'Bascule appels/toutes les tâches');
assert.ok(simpleCss.includes('#taskInboxCalls[aria-pressed="true"]'),'État de séance visible sur Android');
const exampleCall=inboxApi.card({id:'new-call',prospectId:'p',type:'appel',channel:'telephone',recipient:'06 28 20 40 02',callGuide:[{q:'Pourquoi ?',a:'Savons solides'}]},new Map([['p',{name:'Savonnerie',website:'https://exemple.fr'}]]));
assert.ok(exampleCall.includes('Récapitulatif de l’appel'),'Résumé téléphonique de la boutique');
assert.ok(exampleCall.includes('Savons solides'),'Contexte réel visible dans le panneau');
assert.ok(exampleCall.includes('Appeler ↗')&&exampleCall.includes('Voir la boutique ↗'),'Un clic téléphone et un clic boutique conservés');
assert.ok(exampleCall.includes('tel:0628204002'),'Numéro professionnel joignable');
assert.ok(sw.includes('mailotion-crm-v22-m012-newsletter-audit'),'Version cache testée après déploiement');


// M012 — l'analyse des emails vérifiée par Gmail doit survivre au roundtrip Sheets.
// Ne pas effacer le témoignage de bienvenue ni les séquences à la synchro.
assert.ok(app.includes('newsletterAudit:Array.isArray(raw.newsletterAudit)'), 'Gmail audit conservé par sanitize');
assert.ok(app.includes('newsletterWelcome:raw.newsletterWelcome'), 'Bienvenue historique conservée');
assert.ok(app.includes('newsletterSignupSource:txt'), 'Origine inscription conservée');
assert.ok(app.includes('newsletterEvidenceDocument:txt'), 'Référence Drive conservée');
console.log('PASS - scripts, UI, 11 contacts publics, brouillons complets, Gmail manuel, sécurité, merge, conflits, dédoublonnage et schéma Sheets.');
