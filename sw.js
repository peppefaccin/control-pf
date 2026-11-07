// Guarda o app para abrir sem internet. Sempre tenta a versão nova primeiro.
const CACHE = 'controlpf-v2';
const ARQUIVOS = ['./', 'index.html', 'estilo.css', 'app.js', 'logo-branco.png', 'icone-192.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return; // GitHub API passa direto
  e.respondWith(
    fetch(r)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(r, copia));
        return resp;
      })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('./'))),
  );
});
