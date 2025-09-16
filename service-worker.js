const CACHE='hybrid-trainer-v2-repack-2'; // bump version to force refresh
const ASSETS=['./','./index.html','./app.js','./manifest.webmanifest'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))
});
self.addEventListener('activate',e=>{
  e.waitUntil(self.clients.claim())
});
self.addEventListener('fetch',e=>{
  e.respondWith(
    fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});
