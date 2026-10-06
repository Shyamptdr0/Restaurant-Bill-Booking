import { NextResponse } from 'next/server'
import { GET as getDashboard } from '@/app/api/dashboard/route'
import { GET as getMonthlyStats } from '@/app/api/monthly-stats/route'
import { GET as getTopSelling } from '@/app/api/top-selling/route'
import { GET as getCalendarStatus } from '@/app/api/calendar-status/route'
import { GET as getMenuItems } from '@/app/api/menu-items/route'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams.toString()
    const baseUrl = `${url.protocol}//${url.host}`

    // Run all 5 dashboard operations in parallel in-process on the server
    const [dashRes, monthlyRes, topRes, calRes, menuRes] = await Promise.all([
      getDashboard(new Request(`${baseUrl}/api/dashboard`)),
      getMonthlyStats(new Request(`${baseUrl}/api/monthly-stats?${searchParams}`)),
      getTopSelling(new Request(`${baseUrl}/api/top-selling?${searchParams}&limit=5`)),
      getCalendarStatus(new Request(`${baseUrl}/api/calendar-status?${searchParams}`)),
      getMenuItems(new Request(`${baseUrl}/api/menu-items`))
    ])

    const [dashboard, monthly, topSelling, calendar, menuItems] = await Promise.all([
      dashRes.json().catch(() => null),
      monthlyRes.json().catch(() => null),
      topRes.json().catch(() => null),
      calRes.json().catch(() => null),
      menuRes.json().catch(() => null)
    ])

    return NextResponse.json({
      dashboard,
      monthly,
      topSelling,
      calendar,
      menuItems
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('GET /api/dashboard/summary error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
