import { useEffect, useRef, useState } from 'react'

export function useWebSocket(url) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const [error, setError] = useState(null)
  const ws = useRef(null)

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        // For now, we'll use a polling approach since WebSockets require server setup
        // This is a placeholder for future WebSocket implementation
        console.log('WebSocket connection placeholder - using polling fallback')
        setIsConnected(true)
      } catch (err) {
        console.error('WebSocket connection error:', err)
        setError(err)
        setIsConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [url])

  const sendMessage = (message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage
  }
}

// Simple polling for real-time updates without device locking
export function useRealtimeItemsSync(tableId, onItemsUpdate) {
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef(null)
  const lastItemsRef = useRef([])

  useEffect(() => {
    if (!tableId) return

    const startPolling = () => {
      setIsPolling(true)
      
      intervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/temporary-items?table_id=${tableId}`)
          if (response.ok) {
            const data = await response.json()
            
            if (data.data && data.data.length > 0) {
              // Group items by item_id to handle potential duplicates (same logic as fetchTemporaryItems)
              const groupedItems = {}
              data.data.forEach(item => {
                const itemId = item.item_id
                if (groupedItems[itemId]) {
                  // If item already exists, add quantity
                  groupedItems[itemId].quantity += item.quantity
                } else {
                  // Create new item entry with unique identifier
                  groupedItems[itemId] = {
                    cartId: `${itemId}_${Date.now()}_${Math.random()}`, // Unique identifier for cart
                    id: item.item_id,
                    name: item.item_name,
                    category: item.item_category,
                    price: item.price,
                    quantity: item.quantity
                  }
                }
              })
              
              // Convert grouped items back to array
              const currentItems = Object.values(groupedItems)
              
              // Only update if items actually changed (prevent unnecessary re-renders)
              const itemsChanged = JSON.stringify(currentItems) !== JSON.stringify(lastItemsRef.current)
              
              if (itemsChanged) {
                lastItemsRef.current = currentItems
                onItemsUpdate(currentItems)
              }
            } else if (lastItemsRef.current.length > 0) {
              // Items were cleared
              lastItemsRef.current = []
              onItemsUpdate([])
            }
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
      }, 2000) // Poll every 2 seconds
    }

    startPolling()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        setIsPolling(false)
      }
    }
  }, [tableId, onItemsUpdate])

  return { isPolling }
}
