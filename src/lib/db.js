import { openDB } from "idb";

let db = null;

// Initialize database only on client side
export async function initDB() {
  if (typeof window === 'undefined') return null;
  
  if (!db) {
    try {
      db = await openDB("billing", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("pendingBills")) {
            db.createObjectStore("pendingBills", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("pendingMenuItems")) {
            db.createObjectStore("pendingMenuItems", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("cachedMenuItems")) {
            db.createObjectStore("cachedMenuItems", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("cachedBills")) {
            db.createObjectStore("cachedBills", { keyPath: "id" });
          }
        }
      });
    } catch (error) {
      console.error('Failed to open database:', error);
      return null;
    }
  }
  return db;
}

export async function getDB() {
  if (typeof window === 'undefined') return null;
  return await initDB();
}

// Save bill offline
export async function saveBillOffline(bill) {
  if (typeof window === 'undefined') return { status: "server-only" };
  
  const database = await getDB();
  if (!database) return { status: "server-only" };
  
  const isOnline = navigator.onLine;

  if (!isOnline) {
    const id = crypto.randomUUID();
    await database.put("pendingBills", { 
      id, 
      ...bill, 
      timestamp: new Date().toISOString(),
      synced: false 
    });
    return { status: "saved-offline", id };
  }

  // Online → save directly to database
  return await sendBillToServer(bill);
}

// Save menu item offline
export async function saveMenuItemOffline(item) {
  if (typeof window === 'undefined') return { status: "server-only" };
  
  const database = await getDB();
  if (!database) return { status: "server-only" };
  
  const isOnline = navigator.onLine;

  if (!isOnline) {
    const id = crypto.randomUUID();
    await database.put("pendingMenuItems", { 
      id, 
      ...item, 
      timestamp: new Date().toISOString(),
      synced: false 
    });
    return { status: "saved-offline", id };
  }

  return await sendMenuItemToServer(item);
}

// Cache menu items for offline use
export async function cacheMenuItems(items) {
  if (typeof window === 'undefined') return;
  
  const database = await getDB();
  if (!database) return;
  
  const tx = database.transaction("cachedMenuItems", "readwrite");
  await Promise.all(items.map(item => tx.store.put(item)));
  await tx.done;
}

// Get cached menu items
export async function getCachedMenuItems() {
  if (typeof window === 'undefined') return [];
  
  const database = await getDB();
  if (!database) return [];
  
  return await database.getAll("cachedMenuItems");
}

// Cache bills for offline use
export async function cacheBills(bills) {
  if (typeof window === 'undefined') return;
  
  const database = await getDB();
  if (!database) return;
  
  const tx = database.transaction("cachedBills", "readwrite");
  await Promise.all(bills.map(bill => tx.store.put(bill)));
  await tx.done;
}

// Get cached bills
export async function getCachedBills() {
  if (typeof window === 'undefined') return [];
  
  const database = await getDB();
  if (!database) return [];
  
  return await database.getAll("cachedBills");
}

// Send bill to server
async function sendBillToServer(bill) {
  try {
    const response = await fetch('/api/bills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bill),
    });

    if (!response.ok) {
      throw new Error('Failed to save bill');
    }

    const result = await response.json();
    return { status: "saved-online", data: result.data };
  } catch (error) {
    // If online request fails, save to offline queue
    const database = await getDB();
    if (database) {
      const id = crypto.randomUUID();
      await database.put("pendingBills", { 
        id, 
        ...bill, 
        timestamp: new Date().toISOString(),
        synced: false 
      });
      return { status: "fallback-offline", id };
    }
    return { status: "error", error: error.message };
  }
}

// Send menu item to server
async function sendMenuItemToServer(item) {
  try {
    const response = await fetch('/api/menu-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error('Failed to save menu item');
    }

    const result = await response.json();
    return { status: "saved-online", data: result.data };
  } catch (error) {
    // If online request fails, save to offline queue
    const database = await getDB();
    if (database) {
      const id = crypto.randomUUID();
      await database.put("pendingMenuItems", { 
        id, 
        ...item, 
        timestamp: new Date().toISOString(),
        synced: false 
      });
      return { status: "fallback-offline", id };
    }
    return { status: "error", error: error.message };
  }
}

// Sync pending bills when internet returns
export async function syncPendingBills() {
  if (typeof window === 'undefined') return { synced: [], failed: [] };
  
  const database = await getDB();
  if (!database) return { synced: [], failed: [] };
  
  const items = await database.getAll("pendingBills");
  const synced = [];
  const failed = [];

  for (const bill of items) {
    try {
      const result = await sendBillToServer(bill);
      if (result.status === "saved-online") {
        await database.delete("pendingBills", bill.id);
        synced.push(bill.id);
      } else {
        failed.push(bill.id);
      }
    } catch (error) {
      console.error('Failed to sync bill:', bill.id, error);
      failed.push(bill.id);
    }
  }

  return { synced, failed };
}

// Sync pending menu items when internet returns
export async function syncPendingMenuItems() {
  if (typeof window === 'undefined') return { synced: [], failed: [] };
  
  const database = await getDB();
  if (!database) return { synced: [], failed: [] };
  
  const items = await database.getAll("pendingMenuItems");
  const synced = [];
  const failed = [];

  for (const item of items) {
    try {
      const result = await sendMenuItemToServer(item);
      if (result.status === "saved-online") {
        await database.delete("pendingMenuItems", item.id);
        synced.push(item.id);
      } else {
        failed.push(item.id);
      }
    } catch (error) {
      console.error('Failed to sync menu item:', item.id, error);
      failed.push(item.id);
    }
  }

  return { synced, failed };
}

// Get pending items count
export async function getPendingItemsCount() {
  if (typeof window === 'undefined') return { bills: 0, menuItems: 0 };
  
  const database = await getDB();
  if (!database) return { bills: 0, menuItems: 0 };
  
  const pendingBills = await database.getAll("pendingBills");
  const pendingMenuItems = await database.getAll("pendingMenuItems");
  return {
    bills: pendingBills.filter(item => !item.synced).length,
    menuItems: pendingMenuItems.filter(item => !item.synced).length
  };
}
