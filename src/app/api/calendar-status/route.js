import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM

    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 })
    }

    let startDate = new Date()
    const [year, monthNum] = month.split('-').map(Number)
    startDate = new Date(year, monthNum - 1, 1)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0) // Last day of the month
    endDate.setHours(23, 59, 59, 999)

    // Get all bills for the month to determine which days had sales
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('id, created_at, total_amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (billsError) throw billsError

    // Create a map of days with sales data
    const dayStatus = {}
    
    // Initialize all days in the month
    for (let day = 1; day <= endDate.getDate(); day++) {
      const date = new Date(year, monthNum - 1, day)
      const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
      
      // Check if this is an upcoming day (future date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const isUpcoming = date > today
      
      dayStatus[dateStr] = {
        day,
        date: dateStr,
        isUpcoming,
        hasSales: false,
        totalRevenue: 0,
        totalBills: 0,
        status: isUpcoming ? 'upcoming' : 'open-no-sales' // Default status for today and past days
      }
    }

    // Process bills to update day status
    bills.forEach(bill => {
      const billDate = new Date(bill.created_at).toISOString().split('T')[0]
      if (dayStatus[billDate]) {
        dayStatus[billDate].hasSales = true
        dayStatus[billDate].totalRevenue += parseFloat(bill.total_amount)
        dayStatus[billDate].totalBills += 1
        dayStatus[billDate].status = 'open' // Restaurant was open and had sales
      }
    })

    // For past days without sales, assume hotel was open but had no sales
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    Object.keys(dayStatus).forEach(dateStr => {
      const day = dayStatus[dateStr]
      const date = new Date(dateStr)
      
      if (!day.isUpcoming && date <= today && !day.hasSales) {
        // Past day or today with no sales - hotel was open but no sales
        day.status = 'open-no-sales'
      }
    })

    return NextResponse.json({ 
      data: Object.values(dayStatus),
      error: null 
    })
  } catch (error) {
    console.error('Error fetching calendar status:', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
