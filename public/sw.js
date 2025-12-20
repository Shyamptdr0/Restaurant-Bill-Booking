self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("Service worker installed");
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
  event.waitUntil(clients.claim());
});

// Background sync
self.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", event.tag);
  
  if (event.tag === "background-sync") {
    event.waitUntil(performBackgroundSync());
  }
});

// Handle push notifications for sync status
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    
    // Show notification for sync completion
    if (data.type === "SYNC_COMPLETE") {
      event.waitUntil(
        self.registration.showNotification("Sync Complete", {
          body: "Your offline data has been synchronized",
          icon: "/icon-192x192.png",
          tag: "sync-complete"
        })
      );
    }
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});

// Network status detection
self.addEventListener("online", () => {
  console.log("Network connection restored");
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: "ONLINE", timestamp: Date.now() });
    });
  });
  
  // Trigger background sync when coming online
  self.registration.sync.register("background-sync");
});

self.addEventListener("offline", () => {
  console.log("Network connection lost");
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: "OFFLINE", timestamp: Date.now() });
    });
  });
});

// Background sync function
async function performBackgroundSync() {
  try {
    console.log("Performing background sync...");
    
    // Notify all clients about sync start
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: "SYNC_START", 
        timestamp: Date.now() 
      });
    });
    
    // Here you would implement the actual sync logic
    // For now, we'll just simulate it
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Notify all clients about sync completion
    clients.forEach(client => {
      client.postMessage({ 
        type: "SYNC_COMPLETE", 
        timestamp: Date.now(),
        success: true
      });
    });
    
    console.log("Background sync completed successfully");
    
  } catch (error) {
    console.error("Background sync failed:", error);
    
    // Notify clients about sync failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: "SYNC_COMPLETE", 
        timestamp: Date.now(),
        success: false,
        error: error.message
      });
    });
  }
}

// Cache management for offline functionality
const CACHE_NAME = "restaurant-app-v1";
const urlsToCache = [
  "/",
  "/dashboard",
  "/menu/list",
  "/billing/create",
  "/api/menu-items",
  "/api/bills"
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Network request
        return fetch(event.request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          
          // Clone response since it can only be used once
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // Offline fallback
          if (event.request.url.includes("/api/")) {
            // Return cached API data or empty response
            return new Response(JSON.stringify({ data: [] }), {
              headers: { "Content-Type": "application/json" }
            });
          }
        });
      })
  );
});
