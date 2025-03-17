/**
 * PJHQ Service Worker - v3
 * Strict caching - only caches paths explicitly defined in CACHE_PATHS
 */

// Import shared cache paths
importScripts('/src/js/caching/cache-paths.js');

const CACHE_NAME = 'pjhq-cache-v3';

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

// Create a flat array of all paths to cache
const getAllPathsArray = () => {
  const allPaths = [];
  
  // Only add non-empty arrays
  if (CACHE_PATHS.pages && CACHE_PATHS.pages.length) {
    allPaths.push(...CACHE_PATHS.pages);
  }
  
  if (CACHE_PATHS.styles && CACHE_PATHS.styles.length) {
    allPaths.push(...CACHE_PATHS.styles);
  }
  
  if (CACHE_PATHS.scripts && CACHE_PATHS.scripts.length) {
    allPaths.push(...CACHE_PATHS.scripts);
  }
  
  if (CACHE_PATHS.images && CACHE_PATHS.images.length) {
    allPaths.push(...CACHE_PATHS.images);
  }
  
  if (CACHE_PATHS.external && CACHE_PATHS.external.length) {
    allPaths.push(...CACHE_PATHS.external);
  }
  
  return allPaths;
};

// Check if a URL matches any of our defined paths
const isUrlInCachePaths = (url) => {
  const allPaths = getAllPathsArray();
  
  // Handle both absolute and relative URLs
  const urlObj = new URL(url, self.location.origin);
  const urlPath = urlObj.href;
  
  // Check if the URL exactly matches any of our defined paths
  // We convert both to full URLs for comparison
  return allPaths.some(path => {
    const fullPath = path.startsWith('http') ? path : new URL(path, self.location.origin).href;
    return fullPath === urlPath;
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
};

// Explicit caching function
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

// Install event - cache core resources
self.addEventListener('install', event => {
  log('Installing service worker...');
  
  // Log the paths we're going to cache
  const pathsToCacheAtInstall = getAllPathsArray();
  log(`Paths to cache on install: ${pathsToCacheAtInstall.length}`);
  
  if (pathsToCacheAtInstall.length === 0) {
    log('No paths defined in CACHE_PATHS, nothing to cache at install');
    return self.skipWaiting();
  }
  
  event.waitUntil(
    cacheUrls(pathsToCacheAtInstall)
      .then(() => {
        log('Initial cache complete, activating immediately');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
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
        notifyClients('sw-ready', { version: 'v3' });
      })
  );
});

// Fetch event - ONLY serve cached resources that match our paths
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const url = event.request.url;
  
  // Check if this URL is one we should be caching/serving from cache
  const shouldHandleFromCache = isUrlInCachePaths(url);
  
  // Only intercept requests for URLs in our cache paths
  if (!shouldHandleFromCache) {
    // Let the browser handle it normally
    return;
  }
  
  // For URLs we care about, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached response
          return cachedResponse;
        }
        
        // Not in cache but it should be, try to fetch and cache it
        return fetch(event.request)
          .then(response => {
            // Return immediately if not a successful response
            if (!response || response.status !== 200) {
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
            
            // Cache the successful response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                notifyClients('cache-updated', { url: event.request.url });
                log(`Cached on-demand: ${url}`);
              })
              .catch(error => {
                logCacheError({
                  url: event.request.url,
                  error: error.message,
                  type: 'cache-write-error',
                  timestamp: Date.now()
                });
              });
            
            return response;
          })
          .catch(error => {
            logCacheError({
              url: event.request.url,
              error: error.message,
              type: 'network-error',
              timestamp: Date.now()
            });
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
      
      // Filter out URLs that aren't in our cache paths
      const urlsToCache = data.urls.filter(url => isUrlInCachePaths(url));
      
      if (urlsToCache.length !== data.urls.length) {
        log(`Filtered out ${data.urls.length - urlsToCache.length} URLs that aren't in CACHE_PATHS`);
      }
      
      event.waitUntil(
        cacheUrls(urlsToCache)
          .then(results => {
            // Send response if there's a port
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({
                success: true,
                cached: results.succeeded,
                failed: results.failed,
                filtered: data.urls.length - urlsToCache.length,
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
              cached: !!response,
              inCachePaths: isUrlInCachePaths(data.url)
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
              cachePaths: {
                defined: getAllPathsArray().length,
                cached: keys.filter(r => isUrlInCachePaths(r.url)).length
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
      
    case 'LIST_CACHE_PATHS':
      // New command to list all cache paths
      const allPaths = getAllPathsArray();
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          paths: allPaths,
          count: allPaths.length
        });
      }
      break;
  }
});