// ---------- Service worker ----------
// Cacher kun appens egen skal (HTML/CSS/JS), aldrig noget på tværs af
// origin (esm.sh, Supabase) — sync-korrekthed kræver at de altid rammer
// netværket live, aldrig et forældet cache-svar. Netværk-først for egen
// origin, så en online bruger altid får den nyeste udgave med det samme;
// cachen er kun et fallback når der reelt ikke er forbindelse.
const CACHE_NAME = "nyt-eventyr-shell-v1";

const APP_SHELL = [
  "./",
  "index.html",
  "styles.css",
  "manifest.json",
  "js/config.js",
  "js/constants.js",
  "js/data.js",
  "js/i18n.js",
  "js/icons.js",
  "js/ics.js",
  "js/main.js",
  "js/router.js",
  "js/selectors.js",
  "js/sync.js",
  "js/toast.js",
  "js/utils.js",
  "js/modals/activity.js",
  "js/modals/adventure.js",
  "js/modals/datepicker.js",
  "js/modals/invite.js",
  "js/modals/modal.js",
  "js/modals/sheet.js",
  "js/views/calendar.js",
  "js/views/detail.js",
  "js/views/join.js",
  "js/views/list.js",
  "js/views/opsparing.js",
  "js/views/oversigt.js",
  "js/views/program.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
