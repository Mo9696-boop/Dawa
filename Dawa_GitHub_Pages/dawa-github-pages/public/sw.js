const ROOT=new URL('./',self.location.href).href;
const CACHE='dawa-pages-v2:'+new URL(ROOT).pathname;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const response=await fetch(new URL('index.html',ROOT),{cache:'no-store'});const html=await response.text();
 const assets=[...html.matchAll(/(?:src|href)="([^" ]*assets\/[^" ]+)"/g)].map(m=>new URL(m[1],ROOT).href);
 const cache=await caches.open(CACHE);await cache.addAll([ROOT,new URL('index.html',ROOT).href,new URL('favicon.svg',ROOT).href,...assets]);await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(ROOT))return;
 const suffix=u.href.slice(ROOT.length);if(!['','index.html','favicon.svg'].includes(suffix)&&!suffix.startsWith('assets/'))return;
 event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return r;}).catch(async()=>await caches.match(event.request)||new Response('بانتظار الاتصال',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})));
});
