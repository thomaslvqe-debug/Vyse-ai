/* Vyse AI — service worker. Ne met JAMAIS en cache : Clerk, Supabase, fonctions, API. */
const VERSION = 'vyse-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const LIB_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Navigation : réseau d'abord (toujours la dernière version), repli sur le cache hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put('/index.html', cp)); }
      return r;
    }).catch(() => caches.match('/index.html').then(r => r || caches.match('/'))));
    return;
  }
  // Polices : cache d'abord
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return r;
    })));
    return;
  }
  // Bibliothèques (Supabase, PDF.js...) et Clerk JS : cache + mise à jour en arrière-plan
  if (LIB_HOSTS.includes(url.hostname) || (url.hostname.endsWith('.clerk.accounts.dev') && url.pathname.startsWith('/npm/'))) {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  // Fichiers statiques du site (icônes, manifest) : cache d'abord
  if (url.origin === location.origin && /^\/(icons\/|manifest)/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
  // Tout le reste (auth, base de données, IA) : réseau uniquement
});
