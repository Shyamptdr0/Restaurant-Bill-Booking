import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get today's bills
    const { data: todayBills, error: todayError } = await supabase
      .from('bills')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (todayError) throw todayError

    // Get weekly sales data
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { data: weeklyBills, error: weeklyError } = await supabase
      .from('bills')
      .select('*')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: true })

    if (weeklyError) throw weeklyError

    // Calculate weekly sales by day
    const weeklySales = []
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date()
      dayDate.setDate(dayDate.getDate() - (6 - i))
      dayDate.setHours(0, 0, 0, 0)
      
      const dayEnd = new Date(dayDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dayBills = weeklyBills.filter(bill => {
        const billDate = new Date(bill.created_at)
        return billDate >= dayDate && billDate <= dayEnd
      })
      
      const daySales = dayBills.reduce((sum, bill) => sum + parseFloat(bill.subtotal || 0), 0)
      
      weeklySales.push({
        day: days[dayDate.getDay()],
        sales: daySales
      })
    }

    // Get total menu items
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('*')

    if (menuError) throw menuError

    // Get recent bills
    const { data: recentBills, error: recentError } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    // Calculate today's sales and bills
    const todaySales = todayBills.reduce((sum, bill) => sum + parseFloat(bill.subtotal || 0), 0)
    const todayBillsCount = todayBills.length

    // Get monthly revenue
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    
    const { data: monthlyBills, error: monthlyError } = await supabase
      .from('bills')
      .select('subtotal')
      .gte('created_at', monthAgo.toISOString())

    if (monthlyError) throw monthlyError

    const monthlyRevenue = monthlyBills.reduce((sum, bill) => sum + parseFloat(bill.subtotal || 0), 0)

    // Calculate average order value
    const averageOrderValue = todayBillsCount > 0 ? todaySales / todayBillsCount : 0

    // Get payment statistics
    const paymentStats = todayBills.reduce((stats, bill) => {
      const paymentType = bill.payment_type.toLowerCase()
      stats[paymentType] = (stats[paymentType] || 0) + 1
      return stats
    }, {})

    const totalPayments = Object.values(paymentStats).reduce((sum, count) => sum + count, 0)
    const paymentPercentages = Object.keys(paymentStats).reduce((percentages, type) => {
      percentages[type] = totalPayments > 0 ? Math.round((paymentStats[type] / totalPayments) * 100) : 0
      return percentages
    }, {})

    const dashboardData = {
      todaySales,
      todayBills: todayBillsCount,
      weeklySales,
      totalMenuItems: menuItems.length,
      activeMenuItems: menuItems.filter(item => item.status === 'active').length,
      monthlyRevenue,
      averageOrderValue,
      paymentStats: paymentPercentages,
      recentBills: recentBills.map(bill => ({
        ...bill,
        items_count: 0 // Will be populated when we join with bill_items
      }))
    }

    return NextResponse.json({ data: dashboardData, error: null })
  } catch (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
