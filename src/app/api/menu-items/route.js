import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    let query = supabase.from('menu_items').select('*').order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await withRetry(async () => {
      return await query
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
    const { name, category, price, status } = body

    if (!name || !category || !price) {
      return NextResponse.json(
        { error: 'Name, category, and price are required' },
        { status: 400 }
      )
    }

    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('menu_items')
        .insert({
          name,
          category,
          price: parseFloat(price),
          tax: 5, // Default 5% total tax
          sgst: 2.5, // Default 2.5% SGST
          cgst: 2.5, // Default 2.5% CGST
          status: status || 'active',
          track_inventory: body.track_inventory || false,
          stock_quantity: parseInt(body.stock_quantity) || 0
        })
        .select()
        .single()
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
    const { id, name, category, price, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await withRetry(async () => {
      const updatePayload = {
        name,
        category,
        price: parseFloat(price),
        tax: 5, // Default 5% total tax
        sgst: 2.5, // Default 2.5% SGST
        cgst: 2.5, // Default 2.5% CGST
        status: status || 'active'
      }

      if (body.track_inventory !== undefined) updatePayload.track_inventory = body.track_inventory
      if (body.stock_quantity !== undefined) updatePayload.stock_quantity = parseInt(body.stock_quantity) || 0

      return await supabase
        .from('menu_items')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()
    })

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    // Hard delete since foreign key constraint is removed from bill_items
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)
        .select()
        .single()
    })

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
