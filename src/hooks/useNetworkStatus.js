import { useState, useEffect } from 'react'
import { syncPendingBills, syncPendingMenuItems, getPendingItemsCount } from '@/lib/db'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState({ bills: 0, menuItems: 0 })

  // Function to check actual internet connectivity
  const checkInternetConnection = async () => {
    try {
      // First try our health endpoint (fastest)
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(2000)
      })
      if (response.ok) return true
    } catch (error) {
      // Continue to external check
    }

    try {
      // Try external resource as backup
      const response = await fetch('https://httpbin.org/json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch (error) {
      // Fallback to browser's online status
      return navigator.onLine
    }
  }

  useEffect(() => {
    // Update initial pending count
    updatePendingCount()

    // Initial connectivity check
    const checkInitialConnection = async () => {
      const hasInternet = await checkInternetConnection()
      setIsOnline(hasInternet)
    }
    checkInitialConnection()

    // Listen for online/offline events
    const handleOnline = async () => {
      // Verify actual connectivity before marking as online
      const hasInternet = await checkInternetConnection()
      if (hasInternet) {
        setIsOnline(true)
        syncData()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Listen for service worker messages
    const handleServiceWorkerMessage = async (event) => {
      if (event.data.type === "ONLINE") {
        const hasInternet = await checkInternetConnection()
        if (hasInternet) {
          setIsOnline(true)
          await syncData()
        }
      }
    }

    // Periodic connectivity check (every 30 seconds)
    const intervalId = setInterval(async () => {
      const hasInternet = await checkInternetConnection()
      setIsOnline(hasInternet)
    }, 30000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for service worker messages
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
      clearInterval(intervalId)
    }
  }, [])

  const updatePendingCount = async () => {
    try {
      const count = await getPendingItemsCount()
      setPendingCount(count)
    } catch (error) {
      console.error('Failed to get pending count:', error)
    }
  }

  const syncData = async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      // Sync pending bills
      const billSyncResult = await syncPendingBills()
      
      // Sync pending menu items
      const menuItemSyncResult = await syncPendingMenuItems()

      // Update pending count
      await updatePendingCount()

      // Show notification to user
      if (billSyncResult.synced.length > 0 || menuItemSyncResult.synced.length > 0) {
        const totalSynced = billSyncResult.synced.length + menuItemSyncResult.synced.length
        showSyncNotification(`Successfully synced ₹{totalSynced} items`)
      }

      if (billSyncResult.failed.length > 0 || menuItemSyncResult.failed.length > 0) {
        const totalFailed = billSyncResult.failed.length + menuItemSyncResult.failed.length
        showSyncNotification(`₹{totalFailed} items failed to sync`, 'error')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      showSyncNotification('Sync failed. Please try again.', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  const showSyncNotification = (message, type = 'success') => {
    // Create a simple notification (you can replace this with a toast library)
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ₹{
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 3000)
  }

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncData,
    updatePendingCount
  }
}
