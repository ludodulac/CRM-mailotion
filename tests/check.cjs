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
assert.ok(outreach.includes('Je développe actuellement MAILOTION'));
assert.ok(outreach.includes('Je vous propose de m\u0027en occuper gratuitement'));
assert.ok(outreach.includes('As-tu réellement appuyé'));
const extract=outreach.replace(/if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',init,\{once:true\}\);else init\(\);\n\}\)\(\);/,
 'return {eligible,greeting,queue,alreadySent,isInvalid};\n})();');
assert.notEqual(extract,outreach,'Extraire les fonctions pures de prospection');
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
assert.equal(funcs.queue().length,2,'Aucune boutique déjà contactée ou invalide dans la file');
assert.equal(funcs.queue()[0].id,'a','Prospect prioritaire en premier');
assert.equal(funcs.greeting(leads[0]),'Bonjour à l’équipe de Boutique Bonjour,');
assert.equal(funcs.greeting(leads[5]),'Bonjour Paul,');
assert.equal(funcs.eligible(leads[2]),false,'Jamais proposer un email invalide');
assert.equal(funcs.eligible(leads[3]),false,'Ne pas contacter une deuxième fois le même prospect');

assert.ok(outreach.includes('D’ailleurs')||outreach.includes('outreachPersonal'),'Questions par boutique disponibles');
assert.ok(outreach.includes('quelques boutiques en ligne'),"Le texte commun fonctionne pour les sites non Shopify.");
const extractedCompose=outreach.replace(/if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',init,\{once:true\}\);else init\(\);\n\}\)\(\);/,
 'return {composeMessage};\n})();');
const formMap={
 outreachGreeting:{value:'Bonjour à l’équipe de Boutique Exemple,'},
 outreachBody:{value:"Je développe MAILOTION.\n\nBonne journée,\nLudovic — MAILOTION"},
 outreachPersonal:{value:"D'ailleurs, j'ai vu que vous proposez des coffrets. Avez-vous une relance de panier ? Et des conseils après achat ?"}
};
const context={document:{getElementById:id=>formMap[id]}};
const compose=vm.runInNewContext(extractedCompose,context).composeMessage();
assert.ok(compose.startsWith('Bonjour à l’équipe de Boutique Exemple,'),"Conserver la formule d'accueil");
assert.ok(compose.indexOf("D'ailleurs, j'ai vu que")>compose.indexOf("Je développe MAILOTION"),"Questions ajoutées après le texte");
assert.ok(compose.indexOf("D'ailleurs, j'ai vu que")<compose.indexOf("Bonne journée"),"Questions placées avant la signature");
assert.equal((compose.match(/\?/g)||[]).length,2,'Deux questions personnalisées');


console.log('PASS - scripts, UI, 11 contacts + prospection, données privées, merge, conflits, dédoublonnage, schéma Google Sheets.');
