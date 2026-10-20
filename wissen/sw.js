// Offline-Cache: Version erhöhen, wenn sich Dateien ändern.
const CACHE = "wissensfeed-v1";
const DATA = ["politik-de", "politik-welt", "vwl-mikro", "vwl-makro", "geschichte-1", "geschichte-2",
  "bwl-1", "bwl-2", "finanzen-boerse", "finanzen-privat"].map(f => `js/data/${f}.js`);
const FILES = ["./", "index.html", "css/style.css", "js/app.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", ...DATA];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Netzwerk zuerst (für Updates), bei Offline aus dem Cache
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
