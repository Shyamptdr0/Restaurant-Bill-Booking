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
    const limit = parseInt(searchParams.get('limit')) || 5

    let startDate = new Date()
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      startDate = new Date(year, monthNum - 1, 1)
    } else {
      startDate.setDate(startDate.getDate() - 30) // Default to last 30 days
    }
    
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    endDate.setDate(0) // Last day of the month
    endDate.setHours(23, 59, 59, 999)

    // Get bill items for the specified period
    const { data: billItems, error: billItemsError } = await supabase
      .from('bill_items')
      .select(`
        quantity,
        price,
        menu_items!inner(
          id,
          name,
          category
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (billItemsError) throw billItemsError

    // Aggregate sales by menu item
    const itemSales = {}
    
    billItems.forEach(item => {
      const menuItemId = item.menu_items.id
      if (!itemSales[menuItemId]) {
        itemSales[menuItemId] = {
          id: menuItemId,
          name: item.menu_items.name,
          category: item.menu_items.category,
          totalQuantity: 0,
          totalRevenue: 0
        }
      }
      
      itemSales[menuItemId].totalQuantity += item.quantity
      itemSales[menuItemId].totalRevenue += (item.price * item.quantity)
    })

    // Sort by quantity and get top items
    const topItems = Object.values(itemSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit)

    // Add icons based on category
    const categoryIcons = {
      'Main Course': 'UtensilsCrossed',
      'South Indian': 'ChefHat', 
      'Starter': 'Pizza',
      'Dessert': 'IceCream',
      'Beverage': 'Coffee',
      'Chinese': 'Pizza',
      'Fast Food': 'Pizza',
      'Salad': 'UtensilsCrossed'
    }

    const result = topItems.map(item => ({
      ...item,
      icon: categoryIcons[item.category] || 'Utensils'
    }))

    return NextResponse.json({ data: result, error: null })
  } catch (error) {
    console.error('Error fetching top selling items:', error)
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }
}
