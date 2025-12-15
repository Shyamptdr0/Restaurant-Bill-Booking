'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  IndianRupee,
  ShoppingCart,
  Utensils,
  PlusCircle,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Pizza,
  IceCream,
  ChefHat,
  UtensilsCrossed,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

/* ---------------------- SAMPLE DATA ---------------------- */

const topSellingItems = [
  { name: 'Butter Chicken', qty: 128, icon: UtensilsCrossed },
  { name: 'Masala Dosa', qty: 98, icon: ChefHat },
  { name: 'Paneer Tikka', qty: 87, icon: Pizza },
  { name: 'Gulab Jamun', qty: 76, icon: IceCream },
  { name: 'Masala Chai', qty: 152, icon: Coffee },
]

/* ---------------------- HELPERS ---------------------- */

const formatDate = (date) =>
  date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

const formatMonth = (date) =>
  date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

const formatYear = (date) =>
  date.toLocaleDateString('en-IN', {
    year: 'numeric',
  })

/* ---------------------- COMPONENT ---------------------- */

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const [stats, setStats] = useState({
    todaySales: 0,
    todayBills: 0,
    totalItems: 0,
    weeklySales: [],
    monthlyRevenue: 0,
    averageOrderValue: 0,
    activeMenuItems: 0,
  })

  const [monthly, setMonthly] = useState({
    revenue: 0,
    bills: 0,
    customers: 0,
    avgOrder: 0,
    growth: 0,
  })

  const [topSelling, setTopSelling] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [dailyData, setDailyData] = useState(null)
  const [showDailyDetails, setShowDailyDetails] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarStatus, setCalendarStatus] = useState([])

  useEffect(() => {
    fetchDashboardData()
    setCurrentDate(new Date()) // Update current date when component mounts
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [currentMonth])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const month = currentMonth.toISOString().slice(0, 7) // YYYY-MM format

      // Fetch all data in parallel for better performance
      const [dashboardResponse, monthlyResponse, topSellingResponse, calendarStatusResponse] = await Promise.all([
        fetch('/api/dashboard'),
        fetch(`/api/monthly-stats?month=${month}`),
        fetch(`/api/top-selling?month=${month}&limit=5`),
        fetch(`/api/calendar-status?month=${month}`)
      ])

      const [dashboardResult, monthlyResult, topSellingResult, calendarStatusResult] = await Promise.all([
        dashboardResponse.json(),
        monthlyResponse.json(),
        topSellingResponse.json(),
        calendarStatusResponse.json()
      ])

      // Handle dashboard data
      if (dashboardResult.error) {
        throw new Error(dashboardResult.error)
      }

      const data = dashboardResult.data
      setStats({
        todaySales: data.todaySales || 0,
        todayBills: data.todayBills || 0,
        totalItems: data.totalMenuItems || 0,
        weeklySales: data.weeklySales || [],
        monthlyRevenue: data.monthlyRevenue || 0,
        averageOrderValue: data.averageOrderValue || 0,
        activeMenuItems: data.activeMenuItems || 0,
      })

      // Handle monthly data
      if (!monthlyResult.error && monthlyResult.data) {
        const monthlyData = monthlyResult.data
        setMonthly({
          revenue: monthlyData.revenue || 0,
          bills: monthlyData.bills || 0,
          customers: monthlyData.customers || 0,
          avgOrder: monthlyData.avgOrderValue || 0,
          growth: monthlyData.growth || 0,
        })
      }

      // Handle top selling items
      if (topSellingResult.error) {
        console.error('Error fetching top selling items:', topSellingResult.error)
        setTopSelling(topSellingItems) // Fallback to dummy data
      } else {
        setTopSelling(topSellingResult.data || [])
      }

      // Handle calendar status
      if (calendarStatusResult.error) {
        console.error('Error fetching calendar status:', calendarStatusResult.error)
        setCalendarStatus([])
      } else {
        setCalendarStatus(calendarStatusResult.data || [])
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }


  const fetchDailySales = async (date) => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(`/api/daily-sales?date=${date}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Handle case where there's no sales data
      if (!result.data || result.data.totalBills === 0) {
        setDailyData({
          date: date,
          summary: {
            totalRevenue: 0,
            totalBills: 0,
            uniqueCustomers: 0,
            avgOrderValue: 0,
            paymentBreakdown: {}
          },
          topItems: [],
          bills: []
        })
      } else {
        setDailyData(result.data)
      }
      setShowDailyDetails(true)
    } catch (error) {
      console.error('Error fetching daily sales:', error)
      // Show "no sales" message on error
      setDailyData({
        date: date,
        summary: {
          totalRevenue: 0,
          totalBills: 0,
          uniqueCustomers: 0,
          avgOrderValue: 0,
          paymentBreakdown: {}
        },
        topItems: [],
        bills: []
      })
      setShowDailyDetails(true)
    }
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    fetchDailySales(date)
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(
        direction === 'prev'
          ? newDate.getMonth() - 1
          : newDate.getMonth() + 1
      )
      // Clear selected date and daily data when navigating months
      setSelectedDate(null)
      setDailyData(null)
      setShowDailyDetails(false)
      return newDate
    })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setCurrentDate(new Date()) // Update current date when refreshing
    await fetchDashboardData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-600" />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />

        <div className="flex flex-1 flex-col">
          <Navbar />

          <main className="flex-1 space-y-8 overflow-auto p-6">
            {/* HEADER */}
            <div className="flex items-start justify-between">
              {/* LEFT */}
              <div>
                <h1 className="text-3xl font-bold">Dashboard Overview</h1>
                <p className="text-gray-600">{formatDate(currentDate)}</p>
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-2">
                <Button onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>

                <Button
                  onClick={() => setShowCalendar(!showCalendar)}
                  variant={showCalendar ? 'default' : 'outline'}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Calendar
                </Button>
              </div>
            </div>


            {/* FULL MONTH CALENDAR - CONDITIONAL */}
            {showCalendar && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {formatYear(currentMonth)}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Open with Sales</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>Open (No Sales)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-400 rounded"></div>
                      <span>Upcoming</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth(currentMonth).map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="p-2"></div>
                      }
                      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                      const isSelected = selectedDate === dateStr
                      const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString()

                      // Get calendar status for this day
                      const dayStatus = calendarStatus.find(status => status.date === dateStr)
                      let dayColor = 'bg-gray-100'
                      let disabledColor = 'bg-gray-100'
                      let isDisabled = false

                      // Today should always be enabled with hover effects
                      if (isToday) {
                        dayColor = 'bg-yellow-100 hover:bg-yellow-200'
                        disabledColor = 'bg-yellow-100'
                        isDisabled = false
                      } else if (dayStatus) {
                        if (dayStatus.status === 'open') {
                          dayColor = 'bg-green-100 hover:bg-green-200'
                          disabledColor = 'bg-green-100'
                        } else if (dayStatus.status === 'open-no-sales') {
                          dayColor = 'bg-yellow-100 hover:bg-yellow-200'
                          disabledColor = 'bg-yellow-100'
                        } else if (dayStatus.status === 'upcoming') {
                          dayColor = 'bg-gray-100'
                          disabledColor = 'bg-gray-100'
                          isDisabled = true
                        }
                      } else {
                        // If no status data, past days are open with no sales, future days are upcoming
                        const date = new Date(dateStr)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        if (date <= today) {
                          dayColor = 'bg-yellow-100 hover:bg-yellow-200'
                          disabledColor = 'bg-yellow-100'
                        } else {
                          dayColor = 'bg-gray-100'
                          disabledColor = 'bg-gray-100'
                          isDisabled = true
                        }
                      }

                      return (
                        <button
                          key={day}
                          onClick={() => !isDisabled && handleDateClick(dateStr)}
                          disabled={isDisabled}
                          className={`p-2 text-center rounded-lg transition-colors ${isSelected ? 'bg-orange-500 text-white hover:bg-orange-600' :
                              isDisabled ? disabledColor : dayColor
                            } ${isToday && !isSelected ? 'font-bold ring-2 ring-orange-400' : ''} ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* DAILY SALES DETAILS */}
            {showDailyDetails && dailyData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Daily Sales Details
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDailyDetails(false)
                        setSelectedDate(null)
                        setDailyData(null)
                      }}
                    >
                      Close
                    </Button>
                  </div>
                  <CardDescription>
                    {formatDate(new Date(dailyData.date + 'T00:00:00'))}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{(dailyData.summary?.totalRevenue || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Bills</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {dailyData.summary?.totalBills || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Customers</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {dailyData.summary?.uniqueCustomers || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Avg Order Value</p>
                      <p className="text-2xl font-bold text-orange-600">
                        ₹{(dailyData.summary?.avgOrderValue || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {dailyData.topItems && dailyData.topItems.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3">Top Selling Items</h4>
                      <div className="space-y-2">
                        {dailyData.topItems.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-sm text-gray-600">{item.quantity} orders</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dailyData.bills && dailyData.bills.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Recent Bills</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {dailyData.bills.slice(0, 10).map((bill) => (
                          <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-4">
                              <div className="text-left">
                                <div className="font-semibold text-gray-900">#{bill.bill_no || bill.id}</div>
                                <div className="text-sm text-gray-600">
                                  {new Date(bill.time).toLocaleDateString()} • 
                                  {new Date(bill.time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-green-600">
                                ₹{(bill.amount || 0).toFixed(2)}
                              </span>
                              <span className="capitalize px-2 py-1 bg-gray-100 rounded text-sm">
                                {bill.paymentType || 'cash'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dailyData.summary.totalBills === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg">No sales recorded for this date</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            {/* MONTHLY SUMMARY */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <SummaryCard
                title="Monthly Revenue"
                value={`₹${monthly.revenue.toFixed(2)}`}
                icon={IndianRupee}
                growth={monthly.growth}
              />
              <SummaryCard
                title="Total Bills"
                value={monthly.bills}
                icon={ShoppingCart}
              />
              <SummaryCard
                title="Menu Items"
                value={stats.totalItems}
                icon={Utensils}
              />
              <SummaryCard
                title="Avg Order Value"
                value={`₹${stats.averageOrderValue.toFixed(2)}`}
                icon={IndianRupee}
              />
            </div>

            {/* WEEKLY SALES */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Sales</CardTitle>
                <CardDescription>Last 7 days revenue</CardDescription>
              </CardHeader>

              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.weeklySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value}`} />
                    <Bar dataKey="sales" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* TOP SELLING ITEMS */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>
                  Most ordered items this month
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {topSelling.map((item, index) => {
                  const iconMap = {
                    UtensilsCrossed: UtensilsCrossed,
                    ChefHat: ChefHat,
                    Pizza: Pizza,
                    IceCream: IceCream,
                    Coffee: Coffee,
                    Utensils: Utensils
                  }
                  const Icon = iconMap[item.icon] || Utensils
                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {item.totalQuantity} orders
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <QuickAction
                title="Create Bill"
                icon={IndianRupee}
                href="/billing/create"
              />
              <QuickAction
                title="Add Menu Item"
                icon={PlusCircle}
                href="/menu/add"
              />
              <QuickAction
                title="View Menu"
                icon={Utensils}
                href="/menu/list"
              />
              <QuickAction
                title="Bill History"
                icon={Calendar}
                href="/billing/history"
              />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

/* ---------------------- SMALL COMPONENTS ---------------------- */

function SummaryCard({ title, value, icon: Icon, growth }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{title}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>

        <h3 className="text-2xl font-bold">{value}</h3>

        {growth !== undefined && (
          <p
            className={`flex items-center gap-1 text-sm ${growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
          >
            {growth >= 0 ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            {growth}% vs last month
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function QuickAction({ title, icon: Icon, href }) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-6">
          <Icon className="h-6 w-6 text-orange-600" />
          <span className="font-medium">{title}</span>
        </CardContent>
      </Card>
    </Link>
  )
}
