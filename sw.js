const CACHE_NAME = "karaoke-picker-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/url-state.js",
  "./js/qr-generator.js",
  "./js/songs-data.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener(
  "install",
  (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          cache.addAll(ASSETS)
        )
        .then(() => self.skipWaiting())
    );
  }
);

self.addEventListener(
  "activate",
  (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key !== CACHE_NAME
              )
              .map((key) =>
                caches.delete(key)
              )
          )
        )
        .then(() =>
          self.clients.claim()
        )
    );
  }
);

self.addEventListener(
  "fetch",
  (event) => {
    const { request } = event;
    if (request.method !== "GET") {
      return;
    }

    const url = new URL(request.url);

    if (
      url.origin ===
      self.location.origin
    ) {
      event.respondWith(
        caches
          .match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              // Update cache in background when possible
              event.waitUntil(
                fetch(request)
                  .then(
                    (
                      networkResponse
                    ) => {
                      if (
                        networkResponse &&
                        networkResponse.ok
                      ) {
                        return caches
                          .open(
                            CACHE_NAME
                          )
                          .then(
                            (cache) => {
                              cache.put(
                                request,
                                networkResponse.clone()
                              );
                            }
                          );
                      }
                    }
                  )
                  .catch(() => {})
              );
              return cachedResponse;
            }

            return fetch(request)
              .then(
                (networkResponse) => {
                  if (
                    networkResponse &&
                    networkResponse.ok
                  ) {
                    const clone =
                      networkResponse.clone();
                    caches
                      .open(CACHE_NAME)
                      .then((cache) => {
                        cache.put(
                          request,
                          clone
                        );
                      });
                  }
                  return networkResponse;
                }
              )
              .catch(() =>
                caches.match(
                  "./index.html"
                )
              );
          })
      );
    }
  }
);
