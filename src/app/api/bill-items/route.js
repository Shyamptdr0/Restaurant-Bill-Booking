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
