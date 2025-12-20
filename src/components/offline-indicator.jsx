'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { networkStatus } from '@/lib/network-status.js'
import { offlineManager } from '@/lib/offline-manager.js'

export function OfflineIndicator() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    syncInProgress: false
  })
  const [syncStatus, setSyncStatus] = useState({
    pendingCount: 0,
    failedCount: 0
  })
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Listen for network status changes
    const unsubscribe = networkStatus.addListener((networkStatus) => {
      setStatus({
        isOnline: networkStatus === 'online',
        syncInProgress: networkStatus.syncInProgress
      })
    })

    // Update sync status periodically
    const updateSyncStatus = async () => {
      try {
        const status = await offlineManager.getStatus()
        setSyncStatus({
          pendingCount: status.pendingOperations,
          failedCount: 0 // Manager doesn't track failed count separately
        })
      } catch (error) {
        console.error('Failed to get sync status:', error)
      }
    }

    updateSyncStatus()
    const interval = setInterval(updateSyncStatus, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleForceSync = async () => {
    if (status.isOnline && !status.syncInProgress) {
      try {
        await offlineManager.forceSync()
        // Update status after sync
        const updatedStatus = await offlineManager.getStatus()
        setSyncStatus({
          pendingCount: updatedStatus.pendingOperations,
          failedCount: 0 // Reset failed count after force sync
        })
      } catch (error) {
        console.error('Manual sync failed:', error)
      }
    }
  }

  if (status.isOnline && syncStatus.pendingCount === 0 && syncStatus.failedCount === 0) {
    // Don't show indicator when everything is synced
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className={`shadow-lg border ${
        !status.isOnline ? 'border-red-200 bg-red-50' : 
        syncStatus.pendingCount > 0 ? 'border-yellow-200 bg-yellow-50' : 
        'border-green-200 bg-green-50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {!status.isOnline ? (
                <WifiOff className="h-5 w-5 text-red-600" />
              ) : syncStatus.pendingCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <Wifi className="h-5 w-5 text-green-600" />
              )}
            </div>

            {/* Status Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {!status.isOnline 
                  ? 'Offline Mode' 
                  : syncStatus.pendingCount > 0 
                    ? 'Sync Pending' 
                    : 'Online'
                }
              </p>
              
              {/* Additional Info */}
              <div className="flex items-center space-x-2 mt-1">
                {!status.isOnline && (
                  <span className="text-xs text-gray-500">
                    No internet connection
                  </span>
                )}
                
                {syncStatus.pendingCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {syncStatus.pendingCount} pending
                  </Badge>
                )}
                
                {syncStatus.failedCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {syncStatus.failedCount} failed
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {status.isOnline && syncStatus.pendingCount > 0 && !status.syncInProgress && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceSync}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8 w-8 p-0"
              >
                <AlertCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Detailed Status */}
          {showDetails && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Connection:</span>
                  <span className={`font-medium ${
                    status.isOnline ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {status.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Pending sync:</span>
                  <span className="font-medium text-yellow-600">
                    {syncStatus.pendingCount} items
                  </span>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Failed sync:</span>
                  <span className="font-medium text-red-600">
                    {syncStatus.failedCount} items
                  </span>
                </div>
                
                {status.syncInProgress && (
                  <div className="flex items-center text-xs text-blue-600">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                  </div>
                )}
              </div>
              
              {!status.isOnline && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  Data is being saved locally. It will sync automatically when you're back online.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
