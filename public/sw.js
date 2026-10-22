const CACHE='palsum-shell-v5';
const ASSETS=/* BUILD_ASSETS */ [];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('palsum-shell-')&&key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
// Cache only the public app shell. Auth, database and user responses are never cached.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const key='./'+url.pathname.replace(/^\//,'');
  if(event.request.mode!=='navigate'&&!ASSETS.includes(key))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&(ASSETS.includes(key)||event.request.mode==='navigate')){
      const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    }
    return response;
  }).catch(async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    if(event.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
    return Response.error();
  }));
});
