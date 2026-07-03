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
    const { error: deleteError } = await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .delete()
        .eq('table_id', table_id)
    })

    if (deleteError) {
      console.error('Delete error in POST:', deleteError)
      throw new Error(`Failed to delete existing temporary items: ${deleteError.message}`)
    }

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

    if (fetchError) throw fetchError

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

    // Map existing items by item_id (collect all rows per item_id to handle duplicates)
    const existingByItemId = {}
    ;(existingItems || []).forEach(item => {
      const itemId = item.item_id
      if (!existingByItemId[itemId]) {
        existingByItemId[itemId] = []
      }
      existingByItemId[itemId].push(item)
    })

    const updates = []
    const inserts = []
    const deleteIds = []

    // Determine updates, inserts, and duplicate deletions
    itemsToProcess.forEach(incomingItem => {
      const itemId = incomingItem.id || incomingItem.item_id
      const existingRows = existingByItemId[itemId]

      if (existingRows && existingRows.length > 0) {
        // Update the first matching row
        const firstRow = existingRows[0]
        updates.push({
          id: firstRow.id,
          quantity: incomingItem.quantity,
          total: incomingItem.price * incomingItem.quantity
        })

        // Delete any duplicate matching rows (self-healing)
        if (existingRows.length > 1) {
          existingRows.slice(1).forEach(row => {
            deleteIds.push(row.id)
          })
        }
      } else {
        // Insert new row
        inserts.push({
          table_id,
          table_name: body.table_name || existingItems?.[0]?.table_name || null,
          section: body.section || existingItems?.[0]?.section || null,
          item_id: itemId,
          item_name: incomingItem.name || incomingItem.item_name,
          item_category: incomingItem.category || incomingItem.item_category,
          quantity: incomingItem.quantity,
          price: incomingItem.price,
          total: incomingItem.price * incomingItem.quantity,
          created_at: new Date().toISOString()
        })
      }
    })

    // Determine deletions for removed items
    Object.keys(existingByItemId).forEach(itemId => {
      if (!consolidatedItems[itemId]) {
        existingByItemId[itemId].forEach(row => {
          deleteIds.push(row.id)
        })
      }
    })

    // Execute database operations
    const dbOperations = []

    // Batch Delete
    if (deleteIds.length > 0) {
      dbOperations.push(withRetry(async () => {
        const { error } = await supabase
          .from('temporary_items')
          .delete()
          .in('id', deleteIds)
        if (error) throw error
      }))
    }

    // Batch Insert
    if (inserts.length > 0) {
      dbOperations.push(withRetry(async () => {
        const { error } = await supabase
          .from('temporary_items')
          .insert(inserts)
        if (error) throw error
      }))
    }

    // Parallel Updates
    updates.forEach(updateInfo => {
      dbOperations.push(withRetry(async () => {
        const { error } = await supabase
          .from('temporary_items')
          .update({
            quantity: updateInfo.quantity,
            total: updateInfo.total,
            updated_at: new Date().toISOString()
          })
          .eq('id', updateInfo.id)
        if (error) throw error
      }))
    })

    // Wait for all operations to complete
    if (dbOperations.length > 0) {
      await Promise.all(dbOperations)
    }

    // Fetch updated items to return to the client
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
