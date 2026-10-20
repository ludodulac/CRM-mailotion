const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
const html=read('index.html'),app=read('app.js'),cloud=read('crm-cloud.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'IDs HTML uniques');
for(const name of ['app.js','crm-cloud.js','outreach.js','sw.js'])new Function(read(name));
for(const [,id] of [...app.matchAll(/\$\('([^']+)'\)/g),...cloud.matchAll(/\$\('([^']+)'\)/g)])assert.ok(ids.includes(id),'Champ '+id+' existe dans HTML');
const publicData=JSON.parse(read('prospects.json'));
assert.equal(publicData.boutiques.length,11,'Les 11 prospects publics initiaux sont conservés');
for(const b of publicData.boutiques){assert.equal(b.notes,undefined,'Pas de notes privées dans GitHub');assert.equal(b.contact_statut,undefined,'Pas de statut privé dans GitHub');}
const replaced=cloud.replace(/if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',init,\{once:true\}\);else init\(\);\n\}\)\(\);/, 'return {mergeRecord,deduplicate,values,fp};\n})();');
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

console.log('PASS - scripts, UI, 11 contacts publics, brouillons complets, Gmail manuel, sécurité, merge, conflits, dédoublonnage et schéma Sheets.');
