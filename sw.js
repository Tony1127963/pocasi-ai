/* Service worker aplikace Počasí AI · Fable 5
   - Uloží celou appku (shell) + písma a knihovny do telefonu
   - Otevírá se okamžitě z paměti a na pozadí si stáhne novou verzi
   - Nová verze čeká na potvrzení uživatele (aktualizační obrazovka v appce)
   - Data počasí neblokuje (ta si appka řeší sama, aby byla čerstvá) */

const VERSION = '1.25';
const CACHE = 'pocasi-' + VERSION;
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  /* žádný skipWaiting — nová verze čeká, až ji uživatel potvrdí v appce */
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* klepnutí na oznámení otevře / vytáhne appku do popředí */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return clients.openWindow('./');
    })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  const isShell = url.origin === location.origin;
  const isAsset = url.hostname.includes('fonts.googleapis.com')
               || url.hostname.includes('fonts.gstatic.com')
               || url.hostname.includes('cdnjs.cloudflare.com');

  if (!isShell && !isAsset) return; // data počasí a radar jdou vždy ze sítě

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fromNet = fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fromNet;
    })
  );
});
