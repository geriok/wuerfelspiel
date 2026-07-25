// Legt das Spiel beim ersten Aufruf in den Cache, damit es danach ohne Netz
// startet – auch aus dem Icon am Home-Bildschirm.
const CACHE = "wuerfelspiel-v2";
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

const isPage = req =>
  req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1;

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;

  // Die Seite selbst zuerst aus dem Netz holen. Sonst zeigt das Icon am
  // Home-Bildschirm hartnäckig eine alte Fassung, obwohl längst eine neue
  // veröffentlicht ist. Ohne Netz kommt die gespeicherte Fassung.
  if(isPage(e.request)){
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if(res && res.status === 200){
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request, {ignoreSearch:true})
          .then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Alles andere ändert sich selten: aus dem Speicher, im Hintergrund auffrischen.
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
