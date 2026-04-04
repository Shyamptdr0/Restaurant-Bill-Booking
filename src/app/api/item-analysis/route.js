import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // 1. Fetch bills in the period to match Dashboard logic exactly
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('id, subtotal, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (billsError) throw billsError

    if (!bills || bills.length === 0) {
      return NextResponse.json({
        data: {
          items: [],
          summary: { totalItemsSold: 0, totalRevenue: 0, itemCount: 0, topCategory: 'N/A' },
          categoryBreakdown: []
        },
        error: null
      })
    }

    const billIds = bills.map(b => b.id)
    const totalRevenue = bills.reduce((sum, b) => sum + parseFloat(b.subtotal || 0), 0)

    // 2. Fetch bill items only for these specific bills
    // We fetch in batches if there are many bills
    let allBillItems = []
    const batchSize = 100 
    for (let i = 0; i < billIds.length; i += batchSize) {
      const batch = billIds.slice(i, i + batchSize)
      const { data: items, error: itemsError } = await supabase
        .from('bill_items')
        .select('*')
        .in('bill_id', batch)
      
      if (itemsError) throw itemsError
      allBillItems = allBillItems.concat(items || [])
    }

    // Aggregation Logic
    const itemsMap = {}
    let totalItemsSold = 0

    allBillItems.forEach(item => {
      const name = item.item_name
      if (!itemsMap[name]) {
        itemsMap[name] = {
          name: name,
          category: item.item_category || 'Uncategorized',
          quantity: 0,
          totalRevenue: 0,
          price: parseFloat(item.price) 
        }
      }
      
      const qty = parseInt(item.quantity)
      itemsMap[name].quantity += qty
      itemsMap[name].totalRevenue += parseFloat(item.total)
      totalItemsSold += qty
    })

    const aggregatedItems = Object.values(itemsMap).sort((a, b) => b.quantity - a.quantity)

    // Category breakdown
    const categoryMap = {}
    aggregatedItems.forEach(item => {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = 0
      }
      categoryMap[item.category] += item.totalRevenue
    })

    const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }))

    return NextResponse.json({
      data: {
        items: aggregatedItems,
        summary: {
          totalItemsSold,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)), // Uses Bills table subtotal
          itemCount: aggregatedItems.length,
          topCategory: categoryBreakdown.sort((a,b) => b.value - a.value)[0]?.name || 'N/A'
        },
        categoryBreakdown
      },
      error: null
    })

  } catch (error) {
    console.error('Item Analysis API Error:', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
