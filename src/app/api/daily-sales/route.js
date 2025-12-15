import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // Format: YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    // Parse date and set time range for the entire day
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    // Get bills for the specified date
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (billsError) throw billsError

    // Get bill items for detailed analysis
    const billIds = bills.map(bill => bill.id)
    const { data: billItems, error: billItemsError } = await supabase
      .from('bill_items')
      .select(`
        quantity,
        price,
        bills!inner(
          id,
          created_at,
          total_amount,
          payment_type
        ),
        menu_items!inner(
          id,
          name,
          category
        )
      `)
      .in('bill_id', billIds)

    if (billItemsError) throw billItemsError

    // Calculate daily statistics
    const totalRevenue = bills.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0)
    const totalBills = bills.length
    const uniqueCustomers = totalBills // Use total bills as customer count since customer_id doesn't exist
    const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0

    // Aggregate item sales
    const itemSales = {}
    billItems.forEach(item => {
      const itemId = item.menu_items.id
      if (!itemSales[itemId]) {
        itemSales[itemId] = {
          id: itemId,
          name: item.menu_items.name,
          category: item.menu_items.category,
          totalQuantity: 0,
          totalRevenue: 0,
          orders: []
        }
      }
      
      itemSales[itemId].totalQuantity += item.quantity
      itemSales[itemId].totalRevenue += (item.price * item.quantity)
      itemSales[itemId].orders.push({
        billId: item.bills.id,
        quantity: item.quantity,
        price: item.price,
        time: item.bills.created_at
      })
    })

    // Sort items by quantity
    const topItems = Object.values(itemSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)

    // Payment breakdown
    const paymentBreakdown = bills.reduce((breakdown, bill) => {
      const type = bill.payment_type || 'cash'
      breakdown[type] = (breakdown[type] || 0) + 1
      return breakdown
    }, {})

    const dailyData = {
      date: date,
      summary: {
        totalRevenue,
        totalBills,
        uniqueCustomers,
        avgOrderValue,
        paymentBreakdown
      },
      topItems,
      bills: bills.map(bill => ({
        id: bill.id,
        amount: parseFloat(bill.total_amount),
        paymentType: bill.payment_type,
        time: bill.created_at
      }))
    }

    return NextResponse.json({ data: dailyData, error: null })
  } catch (error) {
    console.error('Error fetching daily sales:', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
