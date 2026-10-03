"use strict";

// Bump VERSION whenever any cached application file changes.
const VERSION = "v1";
const CACHE_PREFIX = `flip-clock-${encodeURIComponent(self.registration.scope)}-`;
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const ASSETS = [
  "./", "./index.html", "./style.css", "./script.js", "./pwa.js", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"
].map(file => new URL(file, self.registration.scope).href);
const ASSET_URLS = new Set(ASSETS);
const INDEX_URL = new URL("./index.html", self.registration.scope).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Complete the entire shell before activating, never install a partial app.
    await cache.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  url.search = "";
  url.hash = "";
  if (!ASSET_URLS.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = event.request.mode === "navigate" ? INDEX_URL : url.href;
    return (await cache.match(key)) || fetch(event.request);
  })());
});
