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

export async function GET(request, { params }) {
  try {
    const { id } = await params

    // Fetch bill details with retry logic
    const { data: bill, error: billError } = await withRetry(async () => {
      return await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .single()
    })

    if (billError) throw billError

    // Fetch bill items using stored snapshot data with retry logic
    const { data: items, error: itemsError } = await withRetry(async () => {
      return await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', id)
    })

    if (itemsError) throw itemsError

    // Calculate item totals without tax
    const itemsWithTaxes = (items || []).map(item => {
      const itemTotal = item.price * item.quantity;
      
      return {
        ...item,
        name: item.item_name || `Item ${item.id}`,
        sgst_amount: 0, // No SGST
        cgst_amount: 0, // No CGST
        total_tax: 0, // No tax
        total_amount: itemTotal // Only item total
      };
    });

    // Calculate totals without tax
    const subtotal = bill.subtotal || 0;

    return NextResponse.json({ 
      data: { 
        ...bill, 
        items: itemsWithTaxes,
        total_sgst: 0, // No SGST
        total_cgst: 0  // No CGST
      }, 
      error: null 
    })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { payment_type, status, subtotal, tax_amount, total_amount } = body

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

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('bills')
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
