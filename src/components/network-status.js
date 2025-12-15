'use client'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'

export function NetworkStatus() {
  const { isOnline, isSyncing, pendingCount, syncData } = useNetworkStatus()

  const totalPending = pendingCount.bills + pendingCount.menuItems

  if (isOnline && totalPending === 0 && !isSyncing) {
    return null // Don't show anything when online and no pending items
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg ₹{
        isOnline 
          ? isSyncing 
            ? 'bg-blue-500 text-white' 
            : totalPending > 0 
              ? 'bg-yellow-500 text-white' 
              : 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}>
        {isOnline ? (
          isSyncing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Syncing...</span>
            </>
          ) : totalPending > 0 ? (
            <>
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{totalPending} pending items</span>
              <button
                onClick={syncData}
                className="ml-2 px-2 py-1 bg-white text-yellow-600 rounded text-xs font-medium hover:bg-gray-100"
              >
                Sync Now
              </button>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              <span className="text-sm">Online</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">Offline</span>
            {totalPending > 0 && (
              <span className="text-xs ml-2">({totalPending} saved locally)</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
