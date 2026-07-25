// Legt das Spiel beim ersten Aufruf komplett in den Cache, damit es danach
// ohne Netz startet – auch aus dem Icon am Home-Bildschirm.
const CACHE = "wuerfelspiel-v1";
const FILES = ["./", "./index.html", "./icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    // Jede Datei einzeln: fehlt eine, bleibt der Rest trotzdem offline nutzbar
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Aus dem Cache bedienen; das Netz nur nutzen, um im Hintergrund zu aktualisieren.
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(hit => {
      const fromNet = fetch(e.request)
        .then(res => {
          if(res && res.status === 200 && res.type === "basic"){
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);           // offline: nimm was da ist
      return hit || fromNet;
    })
  );
});
