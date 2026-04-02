import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        'Connection': 'keep-alive'
      }
    }
  }
)

// Helper function for retry logic
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      // Check if it's a connection timeout error
      if (error.message?.includes('Connect Timeout Error') || 
          error.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
          error.message?.includes('fetch failed')) {
        
        if (attempt === maxRetries) {
          throw new Error('Database connection failed after multiple attempts. Please check your internet connection.')
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        continue
      }
      
      // For non-timeout errors, throw immediately
      throw error
    }
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('table_id')

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .select('*')
        .eq('table_id', tableId) // tableId is string UUID, works fine
        .order('created_at', { ascending: true })
    })

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { table_id, table_name, section, items } = body

    if (!table_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Table ID and items are required' },
        { status: 400 }
      )
    }

    // First, clear existing temporary items for this table
    await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .delete()
        .eq('table_id', table_id)
    })

    // Create bill items to insert - group by item_id to prevent duplicates
    const groupedItems = {}
    items.forEach(item => {
      const id = item.id || item.item_id
      if (groupedItems[id]) {
        groupedItems[id].quantity += item.quantity
        groupedItems[id].total += (item.price * item.quantity)
      } else {
        groupedItems[id] = {
          table_id, // UUID string
          table_name,
          section,
          item_id: id, // UUID string
          item_name: item.name || item.item_name,
          item_category: item.category || item.item_category,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          created_at: new Date().toISOString()
        }
      }
    })

    const tempItems = Object.values(groupedItems)

    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .insert(tempItems)
        .select()
    })

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { table_id, items } = body

    if (!table_id || !items) {
      return NextResponse.json(
        { error: 'Table ID and items are required' },
        { status: 400 }
      )
    }

    // Get existing items
    const { data: existingItems, error: fetchError } = await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .select('*')
        .eq('table_id', table_id)
    })

    // Process updates: add new items, update existing ones, remove deleted ones
    // First, consolidate the incoming items list to prevent duplicates
    const consolidatedItems = {}
    items.forEach(item => {
      const id = item.id || item.item_id
      if (consolidatedItems[id]) {
        consolidatedItems[id].quantity += item.quantity
      } else {
        consolidatedItems[id] = { ...item }
      }
    })

    const itemsToProcess = Object.values(consolidatedItems)
    const incomingItemIds = itemsToProcess.map(item => item.id || item.item_id)
    const existingItemIds = existingItems.map(item => item.item_id)

    // Remove items that are no longer in the cart
    const itemsToRemove = existingItemIds.filter(id => !incomingItemIds.includes(id))
    if (itemsToRemove.length > 0) {
      await withRetry(async () => {
        return await supabase
          .from('temporary_items')
          .delete()
          .eq('table_id', table_id)
          .in('item_id', itemsToRemove)
      })
    }

    // Add or update items
    for (const item of itemsToProcess) {
      const existingItem = existingItems.find(existing => existing.item_id === item.id)
      
      if (existingItem) {
        // Update existing item
        await withRetry(async () => {
          return await supabase
            .from('temporary_items')
            .update({
              quantity: item.quantity,
              total: item.price * item.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('table_id', table_id)
            .eq('item_id', item.id)
        })
      } else {
        // Add new item
        await withRetry(async () => {
          return await supabase
            .from('temporary_items')
            .insert({
              table_id,
              table_name: body.table_name || existingItems[0]?.table_name || null,
              section: body.section || existingItems[0]?.section || null,
              item_id: item.id,
              item_name: item.name,
              item_category: item.category,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
              created_at: new Date().toISOString()
            })
        })
      }
    }

    // Fetch updated items
    const { data: updatedItems, error: finalFetchError } = await withRetry(async () => {
      const query = supabase
        .from('temporary_items')
        .select('*')
        .eq('table_id', table_id)
        .order('created_at', { ascending: true })
      return await query
    })

    if (finalFetchError) throw finalFetchError

    return NextResponse.json({ data: updatedItems, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('table_id')

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .delete()
        .eq('table_id', tableId)
        .select()
    })

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
