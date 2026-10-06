import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Helper function for retry logic with fast fail
async function withRetry(operation, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (
        error.message?.includes('Connect Timeout Error') || 
        error.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
        error.message?.includes('fetch failed')
      ) {
        if (attempt === maxRetries) {
          throw new Error('Database connection failed after retries.')
        }
        await new Promise(resolve => setTimeout(resolve, attempt * 500))
        continue
      }
      throw error
    }
  }
}

// GET: Fetch temporary items for a table
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
        .eq('table_id', tableId)
        .order('created_at', { ascending: true })
    })

    if (error) throw error

    return NextResponse.json({ data: data || [], error: null }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    return NextResponse.json({ data: [], error: error.message }, { status: 500 })
  }
}

// POST: Atomic Sync / Overwrite temporary items for a table
export async function POST(request) {
  try {
    const body = await request.json()
    const { table_id, table_name, section, items, update_table_status } = body

    if (!table_id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    // 1. Clear existing items for table in 1 quick operation
    const { error: deleteError } = await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .delete()
        .eq('table_id', table_id)
    })

    if (deleteError) {
      console.error('Delete error in POST /temporary-items:', deleteError)
      throw deleteError
    }

    // If items list is empty, update table status if requested and return
    if (!items || items.length === 0) {
      if (update_table_status) {
        await withRetry(async () => {
          return await supabase
            .from('tables')
            .update({ status: update_table_status })
            .eq('id', table_id)
        })
      }
      return NextResponse.json({ success: true, data: [], error: null })
    }

    // 2. Format & group items to prevent DB duplication
    const grouped = {}
    items.forEach(item => {
      const id = item.id || item.item_id
      if (grouped[id]) {
        grouped[id].quantity += (parseInt(item.quantity) || 1)
        grouped[id].total += (parseFloat(item.price || 0) * (parseInt(item.quantity) || 1))
      } else {
        const qty = parseInt(item.quantity) || 1
        const price = parseFloat(item.price) || 0
        grouped[id] = {
          table_id,
          table_name: table_name || null,
          section: section || null,
          item_id: id,
          item_name: item.name || item.item_name || 'Item',
          item_category: item.category || item.item_category || 'General',
          quantity: qty,
          price: price,
          total: price * qty,
          created_at: new Date().toISOString()
        }
      }
    })

    const newRows = Object.values(grouped)

    // 3. Insert items and optionally update table status in parallel (no .select() overhead)
    const operations = [
      withRetry(async () => {
        return await supabase
          .from('temporary_items')
          .insert(newRows)
      })
    ]

    if (update_table_status) {
      operations.push(
        withRetry(async () => {
          return await supabase
            .from('tables')
            .update({ status: update_table_status })
            .eq('id', table_id)
        })
      )
    }

    const [insertResult] = await Promise.all(operations)

    if (insertResult?.error) throw insertResult.error

    return NextResponse.json({ success: true, count: newRows.length, error: null })
  } catch (error) {
    console.error('POST /temporary-items error:', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

// PUT: High-performance atomic update handler (reuses POST logic for fast single batch)
export async function PUT(request) {
  return POST(request)
}

// DELETE: Clear temporary items for a table
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get('table_id')

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }

    const { error } = await withRetry(async () => {
      return await supabase
        .from('temporary_items')
        .delete()
        .eq('table_id', tableId)
    })

    if (error) throw error

    return NextResponse.json({ success: true, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
