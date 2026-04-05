/* ============================================================
Property Pal — Service Worker
Стратегія:
• Shell (/, /index.html, статика з /assets/) — Cache-First
• API (/api/*) — Network-First з fallback на кеш
• Решта — Network-First
============================================================ */

const CACHE_NAME = “property-pal-v1”;
const SHELL_URLS = [
“/”,
“/index.html”,
];

/* ––––– install ––––– */
self.addEventListener(“install”, (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)),
);
self.skipWaiting();
});

/* ––––– activate ––––– */
self.addEventListener(“activate”, (event) => {
event.waitUntil(
caches.keys().then((keys) =>
Promise.all(
keys
.filter((key) => key !== CACHE_NAME)
.map((key) => caches.delete(key)),
),
),
);
self.clients.claim();
});

/* ––––– fetch ––––– */
self.addEventListener(“fetch”, (event) => {
const { request } = event;
const url = new URL(request.url);

/* Ігноруємо не-GET та chrome-extension тощо */
if (request.method !== “GET” || !url.protocol.startsWith(“http”)) {
return;
}

/* API — Network-First */
if (url.pathname.startsWith(”/api/”)) {
event.respondWith(networkFirst(request));
return;
}

/* Статика з /assets/ — Cache-First */
if (url.pathname.startsWith(”/assets/”)) {
event.respondWith(cacheFirst(request));
return;
}

/* Навігаційні запити — повертаємо shell */
if (request.mode === “navigate”) {
event.respondWith(
fetch(request).catch(() =>
caches.match(”/index.html”),
),
);
return;
}

/* Решта — Network-First */
event.respondWith(networkFirst(request));
});

/* ––––– helpers ––––– */

async function cacheFirst(request) {
const cached = await caches.match(request);
if (cached) return cached;

const response = await fetch(request);
if (response.ok) {
const cache = await caches.open(CACHE_NAME);
cache.put(request, response.clone());
}
return response;
}

async function networkFirst(request) {
try {
const response = await fetch(request);
if (response.ok) {
const cache = await caches.open(CACHE_NAME);
cache.put(request, response.clone());
}
return response;
} catch {
const cached = await caches.match(request);
if (cached) return cached;
return new Response(JSON.stringify({ error: “Офлайн” }), {
status: 503,
headers: { “Content-Type”: “application/json” },
});
}
}

/* ––––– push notifications ––––– */
self.addEventListener(“push”, (event) => {
if (!event.data) return;

let data;
try {
data = event.data.json();
} catch {
data = { title: “Property Pal”, body: event.data.text() };
}

event.waitUntil(
self.registration.showNotification(data.title ?? “Property Pal”, {
body: data.body ?? “”,
icon: “/icons/icon-192.png”,
badge: “/icons/badge-96.png”,
tag: data.tag ?? “property-pal”,
data: { url: data.url ?? “/” },
}),
);
});

self.addEventListener(“notificationclick”, (event) => {
event.notification.close();
const target = event.notification.data?.url ?? “/”;

event.waitUntil(
self.clients
.matchAll({ type: “window”, includeUncontrolled: true })
.then((clients) => {
const existing = clients.find((c) => c.url.includes(self.location.origin));
if (existing) {
existing.focus();
existing.navigate(target);
} else {
self.clients.openWindow(target);
}
}),
);
});