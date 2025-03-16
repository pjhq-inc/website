/**
 * PJHQ Shared Cache Paths
 * Central location for defining all cacheable resources
 */

// Define all cacheable resources in a single location
const CACHE_PATHS = {
  // Core pages
  pages: [
    '/',
    '/index.html',
    '/about/index.html',
  ],
  
  // Stylesheets
  styles: [
    '/style.css',
    '/about/style.css',
  ],
  
  // JavaScript files
  scripts: [
    '/about/script.js',
    '/src/js/script.js',
    '/src/js/slides.js',
    '/src/js/caching/cache-paths.js',
    '/src/js/caching/cache-messaging.js'
  ],
  
  // Images
  images: [
    // Main site images
    '/assets/images/pj_logo.png',
    '/assets/images/landing_bg.jpg',
    
    // About page team images
    '/about/assets/images/zeldalord.png',
    '/about/assets/images/pixel.png',
    '/about/assets/images/kuudraloremaster.png',
    '/about/assets/images/reclipse.png',
    '/about/assets/images/zilla.png',
    '/about/assets/images/flop.png',
    '/about/assets/images/uwudwagon.png',
    '/about/assets/images/sqrt.png',
    '/about/assets/images/about_background.png'
  ],
  
  // External resources
  external: [
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
  ]
};

// Get all paths as a flat array
function getAllPaths() {
  return [
    ...CACHE_PATHS.pages,
    ...CACHE_PATHS.styles,
    ...CACHE_PATHS.scripts,
    ...CACHE_PATHS.images,
    ...CACHE_PATHS.external
  ];
}

// Context-aware export
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  // Service worker context
  self.CACHE_PATHS = CACHE_PATHS;
  self.getAllCachePaths = getAllPaths;
} else if (typeof window !== 'undefined') {
  // Browser context
  window.CACHE_PATHS = CACHE_PATHS;
  window.getAllCachePaths = getAllPaths;
} else {
  // Node.js or other context
  module.exports = {
    CACHE_PATHS,
    getAllPaths
  };
}