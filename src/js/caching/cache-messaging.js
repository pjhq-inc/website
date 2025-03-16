/**
 * PJHQ Cache Messaging System
 * Handles communication between the main thread and service worker
 */

class CacheMessenger {
    constructor() {
      this.initialized = false;
      this.messageQueue = [];
      this.eventListeners = {
        'sw-ready': [],
        'cache-updated': [],
        'cache-error': []
      };
      
      // Initialize on DOM content loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
    
    /**
     * Initialize the messenger
     */
    init() {
      if (this.initialized) return;
      this.initialized = true;
      
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported in this browser');
        return;
      }
      
      // Set up service worker communication
      navigator.serviceWorker.ready.then(registration => {
        console.log('Service Worker ready, setting up communication');
        
        // Process any queued messages
        this.messageQueue.forEach(message => {
          this.sendMessageToSW(message.type, message.data);
        });
        this.messageQueue = [];
        
        // Trigger ready event
        this.triggerEvent('sw-ready', { registration });
      });
      
      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', event => {
        const { type, data } = event.data;
        
        if (type && this.eventListeners[type]) {
          this.triggerEvent(type, data);
        }
      });
    }
    
    /**
     * Send a message to the service worker
     * @param {string} type - Message type
     * @param {any} data - Message data
     */
    sendMessageToSW(type, data = {}) {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        // Queue message if service worker not ready
        this.messageQueue.push({ type, data });
        return Promise.reject('Service Worker not ready');
      }
      
      return new Promise((resolve, reject) => {
        // Create a message channel for the response
        const messageChannel = new MessageChannel();
        
        // Set up response handler
        messageChannel.port1.onmessage = event => {
          if (event.data.error) {
            reject(event.data.error);
          } else {
            resolve(event.data);
          }
        };
        
        // Send the message
        navigator.serviceWorker.controller.postMessage({
          type,
          data
        }, [messageChannel.port2]);
      });
    }
    
    /**
     * Add event listener
     * @param {string} type - Event type
     * @param {Function} callback - Event callback
     */
    addEventListener(type, callback) {
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      
      this.eventListeners[type].push(callback);
    }
    
    /**
     * Remove event listener
     * @param {string} type - Event type
     * @param {Function} callback - Event callback to remove
     */
    removeEventListener(type, callback) {
      if (!this.eventListeners[type]) return;
      
      this.eventListeners[type] = this.eventListeners[type]
        .filter(listener => listener !== callback);
    }
    
    /**
     * Trigger event
     * @param {string} type - Event type
     * @param {any} data - Event data
     */
    triggerEvent(type, data) {
      if (!this.eventListeners[type]) return;
      
      this.eventListeners[type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
    
    /**
     * Request resources to be cached
     * @param {Array} urls - URLs to cache
     * @param {string} reason - Reason for caching
     */
    cacheResources(urls, reason = 'manual') {
      return this.sendMessageToSW('CACHE_RESOURCES', { urls, reason });
    }
    
    /**
     * Request preloading of a specific page
     * @param {string} page - Page path
     */
    preloadPage(page) {
      // Determine which resources to preload based on the page
      let pagePaths = [];
      
      if (page === 'about') {
        pagePaths = [
          ...CACHE_PATHS.pages.filter(p => p.includes('about')),
          ...CACHE_PATHS.styles.filter(p => p.includes('about')),
          ...CACHE_PATHS.scripts.filter(p => p.includes('about')),
          ...CACHE_PATHS.images.filter(p => p.includes('about'))
        ];
      } else if (page === 'home') {
        pagePaths = [
          ...CACHE_PATHS.pages.filter(p => !p.includes('about') || p === '/'),
          ...CACHE_PATHS.styles.filter(p => !p.includes('about')),
          ...CACHE_PATHS.scripts.filter(p => !p.includes('about'))
        ];
      }
      
      return this.cacheResources(pagePaths, `preload_${page}`);
    }
    
    /**
     * Check if a URL is cached
     * @param {string} url - URL to check
     */
    checkCacheStatus(url) {
      return this.sendMessageToSW('CHECK_CACHE', { url });
    }
    
    /**
     * Get stats about the cache
     */
    getCacheStats() {
      return this.sendMessageToSW('GET_STATS');
    }
  }
  
  // Create global instance
  window.cacheMessenger = new CacheMessenger();
  
  // Automatically preload the other page when ready
  document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    
    // Set up the preloading after a short delay
    setTimeout(() => {
      if (currentPath === '/' || currentPath === '/index.html') {
        window.cacheMessenger.preloadPage('about');
      } else if (currentPath.includes('about')) {
        window.cacheMessenger.preloadPage('home');
      }
    }, 2000); // Wait 2 seconds to let the page finish loading first

    /* Optional indicator, uncomment for testing :p
    window.cacheMessenger.addEventListener('cache-updated', data => {
      console.log(`[CM] Cache updated: ${data.url}`);
      
      // Create temporary visual indicator (optional)
      const indicator = document.createElement('div');
      indicator.textContent = `[CM] Cached: ${data.url.split('/').pop()}`;
      indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 9999;
        transition: opacity 0.5s;
      `;
      document.body.appendChild(indicator);
      
      // Fade out and remove after 2 seconds
      setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 500);
      }, 2000);
    });
    */
  });