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
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let startDate, endDate;
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      endDate = new Date(endDateParam)
    } else if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      startDate = new Date(year, monthNum - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0) // Last day of the month
      endDate.setHours(23, 59, 59, 999)
    } else {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 30) // Default to last 30 days
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
      endDate.setHours(23, 59, 59, 999)
    }

    // Get bills for the specified period in batches
    let bills = []
    let hasMore = true
    let offset = 0
    const batchSize = 1000

    while (hasMore) {
      const { data, error: billsError } = await supabase
        .from('bills')
        .select('subtotal')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .range(offset, offset + batchSize - 1)

      if (billsError) throw billsError

      if (data && data.length > 0) {
        bills = bills.concat(data)
        offset += batchSize
        hasMore = data.length === batchSize
      } else {
        hasMore = false
      }
    }

    // Calculate metrics
    const totalRevenue = bills.reduce((sum, bill) => sum + parseFloat(bill.subtotal || 0), 0)
    const totalBills = bills.length
    const uniqueCustomers = totalBills // Use total bills as customer count since customer_id doesn't exist
    const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0

    // Calculate growth percentage (compare with previous month)
    const prevMonthStart = new Date(startDate)
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
    const prevMonthEnd = new Date(startDate)
    prevMonthEnd.setDate(0)
    prevMonthEnd.setHours(23, 59, 59, 999)

    let prevBills = []
    let prevHasMore = true
    let prevOffset = 0
    let prevError = null

    try {
      while (prevHasMore) {
        const { data, error } = await supabase
          .from('bills')
          .select('subtotal')
          .gte('created_at', prevMonthStart.toISOString())
          .lte('created_at', prevMonthEnd.toISOString())
          .range(prevOffset, prevOffset + batchSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          prevBills = prevBills.concat(data)
          prevOffset += batchSize
          prevHasMore = data.length === batchSize
        } else {
          prevHasMore = false
        }
      }
    } catch (err) {
      prevError = err
    }

    let growth = 0
    if (!prevError && prevBills && prevBills.length > 0) {
      const prevRevenue = prevBills.reduce((sum, bill) => sum + parseFloat(bill.subtotal || 0), 0)
      growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    }

    const monthlyStats = {
      revenue: totalRevenue,
      bills: totalBills,
      customers: uniqueCustomers,
      avgOrderValue: avgOrderValue,
      growth: parseFloat(growth.toFixed(2)),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        month: month || startDate.toISOString().slice(0, 7)
      }
    }

    return NextResponse.json({ data: monthlyStats, error: null })
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
