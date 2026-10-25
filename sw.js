const CACHE='mailotion-crm-v13-m003-mode-simple';
const CORE=['./','./index.html','./style.css','./app.js','./crm-cloud.js','./outreach.js','./simple.js','./simple.css','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./prospects.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)))}return response}).catch(()=>caches.match(event.request).then(result=>result||caches.match('./'))))});
