import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { bill_id, items } = body

    if (!bill_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Bill ID and items are required' },
        { status: 400 }
      )
    }

    // Create bill items - group by item_id to prevent duplicates
    const groupedItems = {}
    items.forEach(item => {
      const id = item.item_id || item.id
      if (groupedItems[id]) {
        groupedItems[id].quantity += item.quantity
        groupedItems[id].total += (item.price * item.quantity)
      } else {
        groupedItems[id] = {
          bill_id,
          item_id: id,
          item_name: item.item_name || item.name,
          item_category: item.item_category || item.category,
          quantity: item.quantity,
          price: item.price,
          total: item.total || (item.price * item.quantity)
        }
      }
    })

    const billItems = Object.values(groupedItems)

    const { data, error } = await supabase
      .from('bill_items')
      .insert(billItems)
      .select()

    if (error) {
      console.error('Supabase error in bill_items insert:', error)
      throw error
    }

    // Update Inventory (Decrement Stock)
    try {
      // First attempt RPC for all items
      for (const item of billItems) {
        const { error: rpcError } = await supabase.rpc('decrement_stock', { 
          inv_id: item.item_id, 
          amount: parseInt(item.quantity) 
        })

        // If RPC fails (e.g. function not created in DB yet), perform batch fallback
        if (rpcError) {
          const itemIds = billItems.map(i => i.item_id)
          const { data: menuItems } = await supabase
            .from('menu_items')
            .select('id, track_inventory, stock_quantity, name')
            .in('id', itemIds)

          if (menuItems && menuItems.length > 0) {
            const menuMap = new Map(menuItems.map(m => [m.id, m]))
            for (const bItem of billItems) {
              const menuItem = menuMap.get(bItem.item_id)
              if (menuItem && menuItem.track_inventory) {
                const currentStock = menuItem.stock_quantity || 0
                const newStock = Math.max(0, currentStock - bItem.quantity)
                await supabase
                  .from('menu_items')
                  .update({ stock_quantity: newStock })
                  .eq('id', bItem.item_id)
              }
            }
          }
          break; // Batch processed all items in fallback
        }
      }
    } catch (invError) {
      console.error('Error updating stock inventory:', invError)
    }

    return NextResponse.json({ 
      data: data || [], 
      error: null 
    })
  } catch (error) {
    console.error('Error adding bill items:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
