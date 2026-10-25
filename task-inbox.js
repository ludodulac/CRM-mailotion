/* MAILOTION — Mission 005. Les tâches privées proviennent de Google Sheets via crm-cloud.js.
   Aucun prospect ni message client n'est intégré dans le dépôt public. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const localDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const active=a=>a&&a.status!=='terminee'&&a.status!=='annulee';
const channelName=c=>({whatsapp:'WhatsApp',email:'Email',telephone:'Téléphone'}[c]||'');
const dayLabel=v=>{if(!/^\d{4}-\d\d-\d\d$/.test(v||''))return '';if(v<localDate())return 'En retard';if(v===localDate())return "Aujourd'hui";const d=new Date(v+'T12:00:00');return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})};
function recipient(a,p){
 const explicit=String(a.recipient||'').trim();
 if(explicit)return explicit;
 if(a.channel==='whatsapp'||a.channel==='telephone')return String(p?.phone||'').trim();
 if(a.channel==='email')return String(p?.email||'').trim();
 return '';
}
function link(a,to){
 if(a.channel==='whatsapp'){
  const n=to.replace(/\D/g,'');
  return n.length>=9&&n.length<=15?'https://wa.me/'+n:'';
 }
 if(a.channel==='email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
  return 'mailto:'+encodeURIComponent(to)+(a.message?'?body='+encodeURIComponent(a.message):'');
 if(a.channel==='telephone'){
  const n=to.replace(/[^\d+]/g,'');
  return n.replace(/\D/g,'').length>=9?'tel:'+n:'';
 }
 return '';
}
function card(a,lookup){
 const p=lookup.get(a.prospectId),to=recipient(a,p),url=link(a,to);
 const message=String(a.message||'');
 const qa=Array.isArray(a.callGuide)?a.callGuide.slice(0,15).filter(x=>x?.q&&x?.a):[];
 const aide=qa.length?'<details class="inbox-qa"><summary>❓ Questions / réponses pendant l’appel</summary>'+
   '<div class="inbox-qa-content">'+qa.map(x=>'<div class="inbox-qa-item"><b>'+esc(x.q)+'</b><p>'+esc(x.a)+'</p></div>').join('')+'</div></details>':'';
 const date=dayLabel(a.due||'');
 const target=(p?.name||'Boutique')+(p?.contact?' · '+p.contact:'');
 const taskTitle=String(a.description||'Tâche').split('\n')[0].slice(0,160);
 const meta=[channelName(a.channel),to,date].filter(Boolean);
 return '<article class="inbox-task">'+
   '<div class="inbox-task-head"><div><div class="inbox-target">'+esc(target)+'</div><h3>'+esc(taskTitle)+'</h3></div>'+
   '<label class="inbox-check"><input type="checkbox" data-inbox-done="'+esc(a.id)+'" aria-label="J’ai fait cette tâche"><span>Fait</span></label></div>'+
   (meta.length?'<div class="inbox-meta">'+meta.map(s=>'<span>'+esc(s)+'</span>').join('')+'</div>':'')+
   (message?'<div class="inbox-message">'+esc(message)+'</div>':'')+
   aide+
   '<div class="inbox-task-actions">'+
   (message?'<button type="button" data-inbox-copy="'+esc(a.id)+'">📋 Copier le message</button>':'')+
   (url?'<a href="'+esc(url)+'" target="'+(a.channel==='telephone'?'_self':'_blank')+'" rel="noopener noreferrer">'+esc(a.channel==='whatsapp'?'Ouvrir WhatsApp':a.channel==='email'?'Écrire':"Appeler")+' ↗</a>':'')+
   '<button type="button" data-inbox-edit="'+esc(a.id)+'">Modifier</button></div></article>';
}
function render(){
 const host=$('taskInboxList');if(!host)return;
 const leads=new Map((window.MailotionCRM?.state?.records||[]).map(p=>[p.id,p]));
 const cloud=window.MailotionCloud;
 const todo=(cloud?.getActions?.()||[]).filter(active).sort((a,b)=>{
  const da=a.due||'9999-12-31',db=b.due||'9999-12-31';
  return da.localeCompare(db)||(a.createdAt||'').localeCompare(b.createdAt||'');
 });
 const count=$('taskInboxCount');if(count)count.textContent=String(todo.length);
 const shown=todo.slice(0,8);
 const connected=cloud?.status?.().connected===true;
 const connect=$('inboxConnect');if(connect)connect.hidden=connected;
 const note=!connected?'<div class="inbox-sync-hint">↻ Connecte Google pour retrouver les tâches enregistrées par ChatGPT.</div>':'';
 host.innerHTML=note+(shown.length?shown.map(a=>card(a,leads)).join(''):
 '<div class="inbox-empty">'+(connected?'✓ Rien à faire pour le moment.':'Tes tâches apparaîtront ici après synchronisation.')+'</div>')+
 (todo.length>8?'<p class="inbox-more">+'+(todo.length-8)+' autres tâches : ouvre le mode complet.</p>':'');
}
async function copyText(s){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(s);return true}catch{}}
 const field=document.createElement('textarea');field.value=s;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';
 document.body.append(field);field.select();let ok=false;try{ok=document.execCommand('copy')}catch{}field.remove();return ok;
}
function init(){
 $('taskInboxRefresh')?.addEventListener('click',()=>window.MailotionCloud?.sync?.());
 $('inboxConnect')?.addEventListener('click',()=>document.getElementById('cloudConnect')?.click());
 $('taskInboxList')?.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.inboxCopy){
   const a=window.MailotionCloud?.getActions?.().find(x=>x.id===b.dataset.inboxCopy);
   if(a?.message){const ok=await copyText(a.message);window.MailotionCRM?.toast?.(ok?'✓ Message copié.':'Copie impossible : sélectionne le texte dans la carte.')}
  }else if(b.dataset.inboxEdit)window.MailotionCloud?.editTask?.(b.dataset.inboxEdit);
 });
 $('taskInboxList')?.addEventListener('change',event=>{
  const box=event.target;if(!box.matches('[data-inbox-done]')||!box.checked)return;
  if(window.MailotionCloud?.markTaskDone?.(box.dataset.inboxDone)!==true)box.checked=false;
 });
 document.addEventListener('mailotion:tasks-changed',render);
 window.MailotionTasks={render};
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
