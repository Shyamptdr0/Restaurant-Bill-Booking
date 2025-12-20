import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days')) || 7 // Default to 7 days
    
    // Calculate date range
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    console.log(`Weekly Sales: Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Get bills for the specified period
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (billsError) {
      console.error('Weekly Sales: Error fetching bills:', billsError)
      throw billsError
    }

    console.log(`Weekly Sales: Found ${bills?.length || 0} bills`)

    // Generate daily sales data
    const weeklySales = []
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      currentDate.setHours(0, 0, 0, 0)
      
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      // Filter bills for this specific day
      const dayBills = bills.filter(bill => {
        const billDate = new Date(bill.created_at)
        return billDate >= currentDate && billDate <= dayEnd
      })
      
      // Calculate total sales for this day
      const daySales = dayBills.reduce((sum, bill) => {
        const amount = parseFloat(bill.total_amount) || 0
        return sum + amount
      }, 0)
      
      // Calculate bill count for this day
      const billCount = dayBills.length
      
      // Calculate average order value for this day
      const avgOrderValue = billCount > 0 ? daySales / billCount : 0
      
      weeklySales.push({
        date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
        day: daysOfWeek[currentDate.getDay()],
        sales: Number(daySales.toFixed(2)),
        billCount: billCount,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        formattedDate: currentDate.toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        })
      })
    }

    // Calculate summary statistics
    const totalSales = weeklySales.reduce((sum, day) => sum + day.sales, 0)
    const totalBills = weeklySales.reduce((sum, day) => sum + day.billCount, 0)
    const avgDailySales = totalSales / days
    const bestDay = weeklySales.reduce((best, day) => 
      day.sales > (best?.sales || 0) ? day : best, null
    )
    const worstDay = weeklySales.reduce((worst, day) => 
      day.sales < (worst?.sales || Infinity) ? day : worst, null
    )

    const responseData = {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: days
      },
      data: weeklySales,
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        totalBills: totalBills,
        avgDailySales: Number(avgDailySales.toFixed(2)),
        avgOrderValue: totalBills > 0 ? Number((totalSales / totalBills).toFixed(2)) : 0,
        bestDay: bestDay ? {
          date: bestDay.date,
          day: bestDay.day,
          sales: bestDay.sales
        } : null,
        worstDay: worstDay ? {
          date: worstDay.date,
          day: worstDay.day,
          sales: worstDay.sales
        } : null
      }
    }

    console.log('Weekly Sales: Generated response with', weeklySales.length, 'days of data')
    
    return NextResponse.json({ 
      data: responseData, 
      error: null 
    })

  } catch (error) {
    console.error('Weekly Sales API Error:', error)
    return NextResponse.json({ 
      data: null, 
      error: error.message 
    }, { status: 500 })
  }
}
