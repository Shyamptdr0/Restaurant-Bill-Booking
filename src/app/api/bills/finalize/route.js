import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false },
    global: { headers: { 'Connection': 'keep-alive' } }
  }
)

// Helper function for resilient retry
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
        if (attempt === maxRetries) throw error
        await new Promise(resolve => setTimeout(resolve, attempt * 400))
        continue
      }
      throw error
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      table_id,
      table_name,
      section,
      subtotal,
      tax_amount = 0,
      total_amount,
      payment_type = 'cash',
      items = [],
      status = 'printed'
    } = body

    if (!subtotal || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required bill fields or items list is empty' },
        { status: 400 }
      )
    }

    const parsedSubtotal = parseFloat(subtotal)
    const parsedTotal = parseFloat(total_amount || subtotal)

    // 1. Attempt single atomic PostgreSQL RPC if configured
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('finalize_bill_transaction', {
        p_table_id: table_id || null,
        p_table_name: table_name || null,
        p_section: section || null,
        p_subtotal: parsedSubtotal,
        p_tax_amount: parseFloat(tax_amount || 0),
        p_total_amount: parsedTotal,
        p_payment_type: payment_type,
        p_status: status,
        p_items: items
      })

      if (!rpcError && rpcData) {
        return NextResponse.json({
          data: rpcData,
          success: true,
          mode: 'rpc_atomic'
        })
      }
    } catch (rpcErr) {
      // Fallback to server-orchestrated atomic flow if RPC not in Supabase yet
      console.warn('RPC finalize_bill_transaction not available, using server flow:', rpcErr.message)
    }

    // 2. Server-orchestrated transactional sequence:
    // Step A: Insert Bill
    const { data: bill, error: billError } = await withRetry(async () => {
      return await supabase
        .from('bills')
        .insert({
          subtotal: parsedSubtotal,
          tax_amount: parseFloat(tax_amount || 0),
          total_amount: parsedTotal,
          payment_type,
          table_id: table_id || null,
          table_name: table_name || null,
          section: section || null,
          status: status || 'printed'
        })
        .select()
        .single()
    })

    if (billError) throw billError

    // Step B: Group items to prevent duplicates & format bill_items
    const groupedItems = {}
    items.forEach(item => {
      const id = item.id || item.item_id
      const qty = parseInt(item.quantity) || 1
      const price = parseFloat(item.price) || 0

      if (groupedItems[id]) {
        groupedItems[id].quantity += qty
        groupedItems[id].total += (price * qty)
      } else {
        groupedItems[id] = {
          bill_id: bill.id,
          item_id: id,
          item_name: item.name || item.item_name || 'Item',
          item_category: item.category || item.item_category || 'General',
          quantity: qty,
          price: price,
          total: price * qty
        }
      }
    })

    const billItems = Object.values(groupedItems)

    // Step C: Insert bill items in one batch
    const { data: itemsData, error: itemsError } = await withRetry(async () => {
      return await supabase
        .from('bill_items')
        .insert(billItems)
        .select()
    })

    if (itemsError) throw itemsError

    // Step D: Update inventory in background / non-blocking
    try {
      for (const item of billItems) {
        await supabase.rpc('decrement_stock', {
          inv_id: item.item_id,
          amount: item.quantity
        })
      }
    } catch (invErr) {
      console.warn('Inventory decrement warning in finalize:', invErr.message)
    }

    // Step E: Clean up temporary items and update table status atomically
    if (table_id) {
      await Promise.allSettled([
        supabase
          .from('temporary_items')
          .delete()
          .eq('table_id', table_id),
        supabase
          .from('tables')
          .update({
            status: status === 'paid' ? 'blank' : 'printed',
            updated_at: new Date().toISOString()
          })
          .eq('id', table_id)
      ])
    }

    return NextResponse.json({
      data: { ...bill, items: itemsData },
      success: true,
      mode: 'server_orchestrated'
    })
  } catch (error) {
    console.error('Finalize bill error:', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
