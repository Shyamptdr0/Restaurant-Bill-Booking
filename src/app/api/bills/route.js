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
    const paymentType = searchParams.get('payment_type')
    const dateFilter = searchParams.get('date_filter')
    const tableId = searchParams.get('table_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 1000

    // First, get the total count
    let countQuery = supabase.from('bills').select('id', { count: 'exact', head: true })
    
    if (paymentType && paymentType !== 'all') {
      countQuery = countQuery.eq('payment_type', paymentType)
    }
    if (tableId) {
      countQuery = countQuery.eq('table_id', tableId)
    }
    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count: totalCount, error: countError } = await countQuery
    if (countError) throw countError

    // Now fetch all records in batches if needed
    let allData = []
    let hasMore = true
    let offset = 0
    const batchSize = 1000

    while (hasMore) {
      let query = supabase.from('bills').select('*').order('created_at', { ascending: false }).range(offset, offset + batchSize - 1)

      if (paymentType && paymentType !== 'all') {
        query = query.eq('payment_type', paymentType)
      }
      if (tableId) {
        query = query.eq('table_id', tableId)
      }
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await withRetry(async () => {
        return await query
      })

      if (error) throw error

      if (data && data.length > 0) {
        allData = allData.concat(data)
        offset += batchSize
        hasMore = data.length === batchSize
      } else {
        hasMore = false
      }
    }

    console.log(`Fetched ${allData.length} total records in batches`)

    // Apply date filtering if needed
    let filteredData = allData
    if (dateFilter && dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      filteredData = allData.filter(bill => {
        const billDate = new Date(bill.created_at)
        
        switch (dateFilter) {
          case 'today':
            return billDate >= today
          case 'week':
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return billDate >= weekAgo
          case 'month':
            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return billDate >= monthAgo
          default:
            return true
        }
      })
    }

    return NextResponse.json({ data: filteredData, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { subtotal, tax_amount, total_amount, payment_type, items, table_id, table_name, section, status } = body

    if (!subtotal || !total_amount || !payment_type || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create bill with table information
    const { data: bill, error: billError } = await withRetry(async () => {
      return await supabase
        .from('bills')
        .insert({
          subtotal: parseFloat(subtotal),
          tax_amount: 0, // No tax
          total_amount: parseFloat(subtotal), // Total equals subtotal
          payment_type,
          table_id: table_id || null,
          table_name: table_name || null,
          section: section || null,
          status: status || 'running'
        })
        .select()
        .single()
    })

    if (billError) throw billError

    // Create bill items with snapshots - group by item_id to prevent duplicates
    const groupedItems = {}
    items.forEach(item => {
      const id = item.id || item.item_id
      if (groupedItems[id]) {
        groupedItems[id].quantity += item.quantity
        groupedItems[id].total += (item.price * item.quantity)
      } else {
        groupedItems[id] = {
          bill_id: bill.id,
          item_id: id,
          item_name: item.name || item.item_name, // Store item name as snapshot
          item_category: item.category || item.item_category, // Store item category as snapshot
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        }
      }
    })

    const billItems = Object.values(groupedItems)

    const { data: itemsData, error: itemsError } = await withRetry(async () => {
      return await supabase
        .from('bill_items')
        .insert(billItems)
        .select()
    })

    if (itemsError) throw itemsError

    return NextResponse.json({ 
      data: { ...bill, items: itemsData }, 
      error: null 
    })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, payment_type, status, subtotal, tax_amount, total_amount } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      )
    }

    const updateData = {}
    if (payment_type) updateData.payment_type = payment_type
    if (status) updateData.status = status
    if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal)
    if (tax_amount !== undefined) updateData.tax_amount = parseFloat(tax_amount) || 0
    if (total_amount !== undefined) updateData.total_amount = parseFloat(total_amount)

    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('bills')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    })

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    return NextResponse.json({ 
      data: data, 
      error: null 
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      data: null, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
