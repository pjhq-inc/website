/**
 * PJHQ Service Worker - v2
 * Enhanced with messaging capabilities
 */

// Import shared cache paths
importScripts('/src/js/caching/cache-paths.js');

const CACHE_NAME = 'pjhq-cache-v2';

// Resources to cache when they're requested
const RUNTIME_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif)$/,  // Images
  /\.(?:css)$/,                   // Stylesheets
  /\.(?:js)$/,                    // JavaScript
  /^https:\/\/fonts\.googleapis\.com/,  // Google Fonts CSS
  /^https:\/\/fonts\.gstatic\.com/,    // Google Fonts
  /^https:\/\/cdn\.discordapp\.com/    // Discord CDN
];

// Helper for logging
const log = msg => {
  console.log(`[SW] ${msg}`);
  
  // Try to notify all clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'sw-log',
        data: { message: msg, timestamp: Date.now() }
      });
    });
  });
};

// Dedicated function for logging cache errors
const logCacheError = (errorDetails) => {
  const { url, type, status, statusText, error } = errorDetails;
  let errorMessage = '';
  
  if (type === 'non-200-response') {
    errorMessage = `Failed to cache: ${url} - HTTP ${status} ${statusText}`;
  } else if (type === 'network-error') {
    errorMessage = `Failed to cache: ${url} - ${error}`;
  }
  
  log(errorMessage);
  
  // Notify clients of the error
  notifyClients('cache-error', errorDetails);
  
  // Optionally, you could store errors in IndexedDB for later analysis
};

// Schizophrenic caching
const cacheUrls = async (urls) => {
  const cache = await caches.open(CACHE_NAME);
  const results = { succeeded: 0, failed: 0, errors: [] };
  
  // Cache each URL individually to handle failures gracefully
  return Promise.allSettled(
    urls.map(url => 
      fetch(url)
        .then(response => {
          if (response.status === 200) {
            cache.put(url, response.clone());
            notifyClients('cache-updated', { url });
            results.succeeded++;
            return true;
          } else {
            // Log non-200 responses as failures
            const errorDetails = {
              url,
              status: response.status,
              statusText: response.statusText,
              type: 'non-200-response',
              timestamp: Date.now()
            };
            results.failed++;
            results.errors.push(errorDetails);
            logCacheError(errorDetails);
            return false;
          }
        })
        .catch(error => {
          // Log network errors as failures
          const errorDetails = {
            url,
            error: error.message,
            type: 'network-error',
            timestamp: Date.now()
          };
          results.failed++;
          results.errors.push(errorDetails);
          logCacheError(errorDetails);
          return false;
        })
    )
  ).then(() => {
    // Log summary of caching operation
    log(`Caching complete: ${results.succeeded} succeeded, ${results.failed} failed`);
    if (results.failed > 0) {
      log(`Failed URLs: ${results.errors.map(e => e.url).join(', ')}`);
    }
    return results;
  });
};

// Notify all clients of an event
const notifyClients = (type, data) => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type,
        data
      });
    });
  });
};

// Install event - cache core resources from the shared path definition
self.addEventListener('install', event => {
  log('Installing service worker...');
  
  // Get the core resources to cache immediately
  const initialCache = [
    ...CACHE_PATHS.pages,
    ...CACHE_PATHS.styles,
    ...CACHE_PATHS.scripts.filter(script => 
      !script.includes('cache-messaging.js') // Avoid circular dependency
    )
  ];
  
  event.waitUntil(
    cacheUrls(initialCache)
      .then(() => {
        log('Initial cache complete, activating immediately');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => { // Windows
  log('Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              log(`Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        log('Taking control of clients');
        return self.clients.claim();
      })
      .then(() => {
        log('Service worker activated and in control');
        notifyClients('sw-ready', { version: 'v2' });
      })
  );
});

// Fetch event - respond from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests unless they match our patterns
  if (url.origin !== self.location.origin && 
      !RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    return;
  }
  
  // Handle the request with a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached response
          return cachedResponse;
        }
        
        // Not in cache, try the network
        return fetch(event.request)
          .then(response => {
            // Return immediately if not a successful response
            if (!response || response.status !== 200) {
              // Log non-200 responses
              if (response) {
                logCacheError({
                  url: event.request.url,
                  status: response.status,
                  statusText: response.statusText,
                  type: 'non-200-response',
                  timestamp: Date.now()
                });
              }
              return response;
            }
            
            // Clone the response to cache it
            const responseToCache = response.clone();
            
            // Check if this resource should be cached
            const shouldCache = RUNTIME_CACHE_PATTERNS.some(pattern => 
              pattern.test(event.request.url)
            );
            
            if (shouldCache) {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                  notifyClients('cache-updated', { url: event.request.url });
                })
                .catch(error => {
                  logCacheError({
                    url: event.request.url,
                    error: error.message,
                    type: 'cache-write-error',
                    timestamp: Date.now()
                  });
                });
            }
            
            return response;
          })
          .catch(error => {
            logCacheError({
              url: event.request.url,
              error: error.message,
              type: 'network-error',
              timestamp: Date.now()
            });
            // Could return a fallback response here if needed
          });
      })
  );
});

// Message handling
self.addEventListener('message', event => {
  // Extract message data
  const { type, data } = event.data;
  
  // Handle different message types
  switch (type) {
    case 'CACHE_RESOURCES':
      log(`Received request to cache ${data.urls.length} resources (${data.reason})`);
      
      event.waitUntil(
        cacheUrls(data.urls)
          .then(results => {
            // Send response if there's a port
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({
                success: true,
                cached: results.succeeded,
                failed: results.failed,
                total: data.urls.length
              });
            }
          })
      );
      break;
      
    case 'CHECK_CACHE':
      // Check if a URL is in the cache
      event.waitUntil(
        caches.match(data.url)
          .then(response => {
            const result = {
              url: data.url,
              cached: !!response
            };
            
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage(result);
            }
          })
      );
      break;
      
    case 'GET_STATS':
      // Get cache statistics
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(async cache => {
            const keys = await cache.keys();
            
            // Group by type
            const stats = {
              total: keys.length,
              byType: {
                html: keys.filter(r => r.url.endsWith('.html')).length,
                css: keys.filter(r => r.url.endsWith('.css')).length,
                js: keys.filter(r => r.url.endsWith('.js')).length,
                images: keys.filter(r => 
                  /\.(png|jpg|jpeg|gif|svg)$/.test(r.url)
                ).length,
                other: keys.filter(r => 
                  !r.url.match(/\.(html|css|js|png|jpg|jpeg|gif|svg)$/)
                ).length
              },
              sampleUrls: keys.slice(0, 5).map(r => r.url)
            };
            
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage(stats);
            }
          })
      );
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      log('Skip waiting instruction received');
      break;
  }
});
