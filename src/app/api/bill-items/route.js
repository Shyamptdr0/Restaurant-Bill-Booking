import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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
      console.error('Supabase error:', error)
      throw error
    }

    // Update Inventory (Decrement Stock)
    try {
      console.log('Starting inventory deduction for bill items (batch):', billItems.length, 'line items');
      for (const item of billItems) {
        // Attempt atomic decrement via RPC first
        const { error: rpcError } = await supabase.rpc('decrement_stock', { 
          inv_id: item.item_id, 
          amount: parseInt(item.quantity) 
        });

        // Fallback to manual fetch-and-update
        if (rpcError) {
          console.log(`RPC decrement_stock failed for item ₹{item.item_id}, falling back to direct update. Error: ₹{rpcError.message}`);
          
          const { data: menuItem, error: fetchError } = await supabase
            .from('menu_items')
            .select('track_inventory, stock_quantity, name')
            .eq('id', item.item_id)
            .single();

          if (!fetchError && menuItem?.track_inventory) {
            const currentStock = menuItem.stock_quantity || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            
            console.log(`Deducting stock for ₹{menuItem.name}: ₹{currentStock} -> ₹{newStock}`);
            
            const { error: updateError } = await supabase
              .from('menu_items')
              .update({ stock_quantity: newStock })
              .eq('id', item.item_id);
              
            if (updateError) console.error(`Failed to update stock for ₹{menuItem.name}:`, updateError);
          } else if (fetchError) {
            console.error(`Failed to fetch menu item ₹{item.item_id}:`, fetchError);
          }
        } else {
          console.log(`Successfully decremented stock for item ₹{item.item_id} via RPC`);
        }
      }
    } catch (invError) {
      console.error('Critical error in inventory update loop:', invError);
    }

    // Return proper JSON response
    return NextResponse.json({ 
      data: data || [], 
      error: null 
    })
  } catch (error) {
    console.error('Error adding bill items:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      status: 500 
    })
  }
}
