/* ============================================================
   cache.js — Service Worker comodín con versionado manual
   ------------------------------------------------------------
   Sirve para TODAS tus invitaciones sin editar nada por proyecto:
   - Precarga solo lo que existe siempre (index.html).
   - Todo lo demás (CSS, JS, imágenes, música, estén donde estén)
     se guarda solo al visitar la página.
   - Cada vez que cambies algo, sube la VERSION (v1 → v2 → v3...).
     Eso es TODO lo que hay que tocar.
   ============================================================ */

const VERSION = "v45";
const CACHE = `invitacion-${VERSION}`;
const FUENTES = "invitacion-fuentes";

/* Núcleo mínimo: existe en todas las invitaciones */
const BASE = ["./", "./index.html"];

/* Instalación: guarda la base y se activa */
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches
            .open(CACHE)
            .then((cache) =>
                Promise.all(BASE.map((url) => cache.add(url).catch(() => null)))
            )
            .then(() => self.skipWaiting())
    );
});

/* Activación: borra cachés viejos y toma el control de inmediato */
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((nombres) =>
                Promise.all(
                    nombres
                        .filter((n) => n.startsWith("invitacion-") && n !== CACHE && n !== FUENTES)
                        .map((n) => caches.delete(n))
                )
            )
            .then(() => self.clients.claim())
    );
});

/* Comodín: primero caché; si no está, va a la red y guarda
   una copia (mismo origen en CACHE, fuentes de Google en FUENTES).
   Sin conexión y sin caché, devuelve el index guardado. */
self.addEventListener("fetch", (e) => {
    if (e.request.method !== "GET") return;
    e.respondWith(
        caches.match(e.request).then(
            (cacheada) =>
                cacheada ||
                fetch(e.request)
                    .then((red) => {
                        const url = new URL(e.request.url);
                        const mismoOrigen = url.origin === self.location.origin;
                        const esFuente = url.href.includes("fonts.g");
                        if (mismoOrigen || esFuente) {
                            const destino = esFuente ? FUENTES : CACHE;
                            const copia = red.clone();
                            caches.open(destino).then((c) => c.put(e.request, copia));
                        }
                        return red;
                    })
                    .catch(() => {
                        if (e.request.mode === "navigate") {
                            return caches.match("./index.html");
                        }
                    })
        )
    );
});
