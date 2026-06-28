'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatPaymentType } from '@/lib/utils'
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
  Download,
  Filter,
  Edit,
  Trash2,
  Search,
  FileText,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Zap,
  Target,
  Bell,
  Settings,
  TrendingUp as TrendingIcon,
  Eye,
  EyeOff,
  Package,
  Star,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  MoreVertical,
  Grid3x3,
  LayoutGrid,
  LineChart as LineChartIcon,
  AlertTriangle,
  ThumbsUp,
  Heart,
  ShoppingCart as CartIcon,
  CreditCard,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  Legend,
  ComposedChart,
} from 'recharts'

/* ---------------------- SAMPLE DATA ---------------------- */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '₹0.00'
  }
  return `₹${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

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

/* ---------------------- HELPERS ---------------------- */

const generateWeeklySalesFallback = (allBills = []) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const weeklySales = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const dateEnd = new Date(date)
    dateEnd.setHours(23, 59, 59, 999)

    // Calculate actual sales for this day from bills data
    const daySales = allBills.filter(bill => {
      const billDate = new Date(bill.created_at)
      return billDate >= date && billDate <= dateEnd
    }).reduce((sum, bill) => sum + (bill.subtotal || 0), 0)

    weeklySales.push({
      day: days[date.getDay()],
      sales: daySales
    })
  }

  return weeklySales
}

/* ---------------------- COMPONENT ---------------------- */

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const isFirstRender = useRef(true)

  const [periodStats, setPeriodStats] = useState({
    title1: 'Total Volume', value1: 0, label1: '-',
    title2: 'Highest', value2: 0, label2: '-',
    title3: 'Lowest', value3: 0, label3: '-',
    title4: 'Average', value4: 0, label4: '-'
  })
  const [timeframe, setTimeframe] = useState('1M')
  const [chartContextDate, setChartContextDate] = useState(new Date())
  const [chartData, setChartData] = useState([])

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
  const [showDataManagement, setShowDataManagement] = useState(false)
  const [dateFilter, setDateFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState('csv')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [recentBills, setRecentBills] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [allBills, setAllBills] = useState([])
  const [liveData, setLiveData] = useState({})
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30000)
  const [widgetLayout, setWidgetLayout] = useState('grid')
  const [comparisonPeriod, setComparisonPeriod] = useState('day')
  const [alerts, setAlerts] = useState([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [customerInsights, setCustomerInsights] = useState({})
  const [performanceMetrics, setPerformanceMetrics] = useState({})
  const [showMonthlyRevenue, setShowMonthlyRevenue] = useState(false)

  // Initial data fetch on mount
  useEffect(() => {
    fetchDashboardData(true)
    setCurrentDate(new Date())
  }, [])

  // Refetch when month changes (without showing full-screen spinner)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    fetchDashboardData(false)
  }, [currentMonth])

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchDashboardData()
        generateAlerts()
      }, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  // Initialize alerts and insights
  useEffect(() => {
    if (allBills.length > 0) {
      generateAlerts()
      calculateCustomerInsights()
      calculatePerformanceMetrics()
      generateChartData(allBills, timeframe, chartContextDate)
    }
  }, [allBills, timeframe, chartContextDate])

  const handleBarClick = (data) => {
    if (!data || !data.rawDateKey) return;
    
    if (timeframe === '1Y') {
      const [y, m] = data.rawDateKey.split('-')
      setChartContextDate(new Date(parseInt(y), parseInt(m) - 1, 1))
      setTimeframe('1M')
    } else if (timeframe === '1M' || timeframe === '1W') {
      setChartContextDate(new Date(data.rawDateKey))
      setTimeframe('1D')
    }
  }

  const generateChartData = (bills, tf, contextDate = new Date()) => {
    const buckets = {}
    
    // PREFILL BUCKETS FOR TIME SPAN
    if (tf === '1M') {
      const year = contextDate.getFullYear()
      const month = contextDate.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        buckets[dateStr] = { sales: 0, rawDateKey: dateStr }
      }
    } else if (tf === '1W') {
      for (let d = 6; d >= 0; d--) {
        const dDate = new Date(contextDate)
        dDate.setDate(dDate.getDate() - d)
        const dateStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`
        buckets[dateStr] = { sales: 0, rawDateKey: dateStr }
      }
    } else if (tf === '1Y') {
      const year = contextDate.getFullYear()
      for (let m = 1; m <= 12; m++) {
        const dateStr = `${year}-${String(m).padStart(2, '0')}`
        buckets[dateStr] = { sales: 0, rawDateKey: dateStr }
      }
    } else if (tf === '1D') {
      const dateStr = `${contextDate.getFullYear()}-${String(contextDate.getMonth() + 1).padStart(2, '0')}-${String(contextDate.getDate()).padStart(2, '0')}`
      for (let h = 0; h < 24; h++) {
        const hourStr = `${String(h).padStart(2, '0')}:00`
        buckets[hourStr] = { sales: 0, rawDateKey: `${dateStr}T${hourStr}` }
      }
    }
    
    bills.forEach(bill => {
      if (!bill.created_at) return
      const date = new Date(bill.created_at)
      if (isNaN(date.getTime())) return
      const subtotal = Number(bill.subtotal) || 0
      
      let key = ''
      if (tf === '1D') {
        if (date.toDateString() === contextDate.toDateString()) {
          key = `${String(date.getHours()).padStart(2, '0')}:00`
        }
      } else if (tf === '1Y') {
        if (date.getFullYear() === contextDate.getFullYear()) {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        }
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      }
      
      if (key && buckets[key] !== undefined) {
        buckets[key].sales += subtotal
      }
    })

    const sortedKeys = Object.keys(buckets).sort()
    const data = []
    
    let maxBucket = { name: '-', sales: 0 }
    let minBucket = { name: '-', sales: Infinity }
    let totalSales = 0

    for (let i = 0; i < sortedKeys.length; i++) {
      const current = buckets[sortedKeys[i]].sales
      const previous = i > 0 ? buckets[sortedKeys[i-1]].sales : 0
      const rawDateKey = buckets[sortedKeys[i]].rawDateKey
      
      let formattedName = sortedKeys[i]
      if (tf === '1Y') {
        const [y, m] = formattedName.split('-')
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        formattedName = `${monthNames[parseInt(m)-1]} '${y.slice(2)}`
      } else if (tf === '1D') {
        const hour = parseInt(formattedName.split(':')[0])
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        formattedName = `${hour12} ${ampm}`
      }

      totalSales += current
      if (current > maxBucket.sales) maxBucket = { name: formattedName, sales: current }
      if (current < minBucket.sales) minBucket = { name: formattedName, sales: current }

      data.push({
        name: formattedName,
        sales: current,
        trend: current >= previous ? 'up' : 'down',
        rawDateKey
      })
    }

    if (minBucket.sales === Infinity) minBucket.sales = 0
    const avgSales = data.length > 0 ? totalSales / data.length : 0

    let periodLabel = 'Day'
    if (tf === '1D') periodLabel = 'Hour'
    if (tf === '1Y') periodLabel = 'Month'

    setPeriodStats({
      title1: 'Total Volume', value1: totalSales, label1: `${data.length} ${periodLabel}s`,
      title2: `Highest ${periodLabel}`, value2: maxBucket.sales, label2: maxBucket.name,
      title3: `Lowest ${periodLabel}`, value3: minBucket.sales, label3: minBucket.name,
      title4: `Average / ${periodLabel}`, value4: avgSales, label4: '-'
    })

    setChartData(data)
  }

  const fetchDashboardData = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true)
      setRefreshing(true)

      const localYear = currentMonth.getFullYear()
      const localMonthNum = currentMonth.getMonth()
      const localStart = new Date(localYear, localMonthNum, 1)
      const localEnd = new Date(localYear, localMonthNum + 1, 0, 23, 59, 59, 999)
      const monthStr = `${localYear}-${String(localMonthNum + 1).padStart(2, '0')}`
      const startDateIso = localStart.toISOString()
      const endDateIso = localEnd.toISOString()

      let serverData = { dashboard: null, monthly: null, topSelling: null, calendar: null }
      let menuItemsData = null

      if (navigator.onLine) {
        try {
          const [dashboardResponse, monthlyResponse, topSellingResponse, calendarStatusResponse, menuItemsResponse] = await Promise.all([
            fetch('/api/dashboard'),
            fetch(`/api/monthly-stats?month=${monthStr}&startDate=${encodeURIComponent(startDateIso)}&endDate=${encodeURIComponent(endDateIso)}`),
            fetch(`/api/top-selling?month=${monthStr}&startDate=${encodeURIComponent(startDateIso)}&endDate=${encodeURIComponent(endDateIso)}&limit=5`),
            fetch(`/api/calendar-status?month=${monthStr}&startDate=${encodeURIComponent(startDateIso)}&endDate=${encodeURIComponent(endDateIso)}`),
            fetch('/api/menu-items')
          ])

          serverData.dashboard = await dashboardResponse.json()
          serverData.monthly = await monthlyResponse.json()
          serverData.topSelling = await topSellingResponse.json()
          serverData.calendar = await calendarStatusResponse.json()
          menuItemsData = await menuItemsResponse.json()
        } catch (error) {
          console.warn('Failed to fetch server data:', error)
        }
      }

      // Extract menu data safely
      const rawMenuData = menuItemsData?.data
      let menuItemsArray = []
      if (Array.isArray(rawMenuData)) {
        menuItemsArray = rawMenuData
      } else if (rawMenuData && Array.isArray(rawMenuData.data)) {
        menuItemsArray = rawMenuData.data
      }

      const dashData = serverData.dashboard?.data || {}

      const newStats = {
        todaySales: dashData.todaySales || 0,
        todayBills: dashData.todayBills || 0,
        totalItems: 0,
        weeklySales: dashData.weeklySales?.length > 0 
          ? dashData.weeklySales.map(item => ({ ...item, sales: Number(item.sales) || 0 })) 
          : [],
        monthlyRevenue: dashData.monthlyRevenue || 0,
        averageOrderValue: dashData.averageOrderValue || 0,
        totalMenuItems: menuItemsArray.length,
        activeMenuItems: menuItemsArray.filter(i => i.status === 'active').length
      }
      setStats(newStats)

      setRecentBills(dashData.recentBills || [])
      setMenuItems(menuItemsArray)

      setMonthly({
        revenue: serverData.monthly?.data?.revenue || 0,
        bills: serverData.monthly?.data?.bills || 0,
        customers: serverData.monthly?.data?.customers || 0,
        avgOrder: serverData.monthly?.data?.avgOrderValue || 0,
        growth: serverData.monthly?.data?.growth || 0
      })

      setTopSelling(serverData.topSelling?.data || [])
      setCalendarStatus(serverData.calendar?.data || [])
      setDailyData(serverData.monthly?.dailyData || null)
      
      // Async fetch all bills for background insights calculation without blocking UI
      fetch('/api/bills?fetch_all=true')
        .then(res => res.json())
        .then(result => {
           if (result.data) {
             setAllBills(result.data)
           }
        })
        .catch(err => console.error("Failed to fetch all bills for insights", err))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
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

  const handleExportData = async () => {
    try {
      let dataToExport = []
      let filename = ''

      if (exportFormat === 'csv' || exportFormat === 'json') {
        const response = await fetch('/api/bills')
        const result = await response.json()
        dataToExport = result.data || []
        filename = `bills_${new Date().toISOString().split('T')[0]}`
      }

      if (exportFormat === 'csv') {
        const csv = convertToCSV(dataToExport)
        downloadFile(csv, `${filename}.csv`, 'text/csv')
      } else if (exportFormat === 'json') {
        const json = JSON.stringify(dataToExport, null, 2)
        downloadFile(json, `${filename}.json`, 'application/json')
      }

      setShowExportDialog(false)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value
      }).join(',')
    )

    return [csvHeaders, ...csvRows].join('\n')
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDeleteBill = async (billId) => {
    try {
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRecentBills(recentBills.filter(bill => bill.id !== billId))
        setAllBills(allBills.filter(bill => bill.id !== billId))
        setShowDeleteConfirm(false)
        setItemToDelete(null)
        await fetchDashboardData()
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
    }
  }

  const generateAlerts = () => {
    const newAlerts = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todaySales = allBills.filter(bill =>
      new Date(bill.created_at) >= today
    ).reduce((sum, bill) => sum + (bill.subtotal || 0), 0)

    const avgDailySales = allBills.length > 0 ?
      allBills.reduce((sum, bill) => sum + (bill.subtotal || 0), 0) / Math.max(allBills.length / 30, 1) : 0

    // Low sales alert
    if (todaySales < avgDailySales * 0.5) {
      newAlerts.push({
        id: 'low-sales',
        type: 'warning',
        title: 'Low Sales Alert',
        message: `Today's sales (${formatCurrency(todaySales)}) are below average`,
        icon: AlertTriangle,
        action: 'view-details'
      })
    }

    // High sales alert
    if (todaySales > avgDailySales * 1.5) {
      newAlerts.push({
        id: 'high-sales',
        type: 'success',
        title: 'Great Sales Day!',
        message: `Today's sales (${formatCurrency(todaySales)}) are above average`,
        icon: ThumbsUp,
        action: 'celebrate'
      })
    }

    // No recent bills alert
    const recentBillsCount = allBills.filter(bill =>
      new Date(bill.created_at) >= new Date(Date.now() - 2 * 60 * 60 * 1000)
    ).length

    if (recentBillsCount === 0 && new Date().getHours() > 10) {
      newAlerts.push({
        id: 'no-activity',
        type: 'info',
        title: 'No Recent Activity',
        message: 'No bills in the last 2 hours',
        icon: Clock,
        action: 'check-status'
      })
    }

    setAlerts(newAlerts)
  }

  const calculateCustomerInsights = () => {
    const insights = {
      totalCustomers: new Set(allBills.map(bill => bill.customer_id || bill.id)).size,
      returningCustomers: 0,
      averageOrderValue: 0,
      peakHours: [],
      popularPaymentMethods: {},
      customerFrequency: {}
    }

    // Calculate average order value
    insights.averageOrderValue = allBills.length > 0 ?
      allBills.reduce((sum, bill) => sum + (bill.subtotal || 0), 0) / allBills.length : 0

    // Analyze peak hours
    const hourlySales = {}
    allBills.forEach(bill => {
      const hour = new Date(bill.created_at).getHours()
      hourlySales[hour] = (hourlySales[hour] || 0) + 1
    })

    insights.peakHours = Object.entries(hourlySales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`)

    // Popular payment methods
    allBills.forEach(bill => {
      const method = bill.payment_type || 'cash'
      insights.popularPaymentMethods[method] = (insights.popularPaymentMethods[method] || 0) + 1
    })

    setCustomerInsights(insights)
  }

  const calculatePerformanceMetrics = () => {
    const metrics = {
      revenueGrowth: 0,
      orderGrowth: 0,
      efficiency: 0,
      satisfaction: 0,
      targetAchievement: 0
    }

    // Calculate revenue growth (week over week)
    const thisWeek = allBills.filter(bill =>
      new Date(bill.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )
    const lastWeek = allBills.filter(bill => {
      const billDate = new Date(bill.created_at)
      const weekAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
      return billDate >= twoWeeksAgo && billDate < weekAgo
    })

    const thisWeekRevenue = thisWeek.reduce((sum, bill) => sum + (bill.subtotal || 0), 0)
    const lastWeekRevenue = lastWeek.reduce((sum, bill) => sum + (bill.subtotal || 0), 0)

    metrics.revenueGrowth = lastWeekRevenue > 0 ?
      ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0

    metrics.orderGrowth = lastWeek.length > 0 ?
      ((thisWeek.length - lastWeek.length) / lastWeek.length) * 100 : 0

    // Calculate efficiency (orders per hour)
    const operatingHours = 12 // Assuming 12 operating hours
    metrics.efficiency = thisWeek.length / operatingHours

    // Set target achievement (mock data)
    const dailyTarget = 5000 // ₹5000 daily target
    const todayRevenue = allBills.filter(bill =>
      new Date(bill.created_at).toDateString() === new Date().toDateString()
    ).reduce((sum, bill) => sum + (bill.subtotal || 0), 0)

    metrics.targetAchievement = (todayRevenue / dailyTarget) * 100

    setPerformanceMetrics(metrics)
  }

  const filteredBills = recentBills.filter(bill => {
    const matchesSearch = searchQuery === '' ||
      bill.id?.toString().includes(searchQuery) ||
      bill.bill_no?.toString().includes(searchQuery)

    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && new Date(bill.created_at).toDateString() === new Date().toDateString()) ||
      (dateFilter === 'week' && new Date(bill.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

    const matchesPayment = paymentFilter === 'all' || bill.payment_type === paymentFilter

    return matchesSearch && matchesDate && matchesPayment
  })

  // Calculate today's bills for payment breakdown
  const today = new Date().toDateString()
  const todayBills = allBills?.filter(bill =>
    new Date(bill.created_at).toDateString() === today
  ) || []

  // Loading block removed for instant rendering

  const getContextLabel = () => {
    if (timeframe === '1Y') return `Year: ${chartContextDate.getFullYear()}`
    if (timeframe === '1M') return `Month: ${chartContextDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    if (timeframe === '1W') return `Week ending: ${chartContextDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
    if (timeframe === '1D') return `Date: ${chartContextDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
    return ''
  }

  const navigateChartContext = (direction) => {
    const newDate = new Date(chartContextDate)
    if (timeframe === '1D') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (timeframe === '1W') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else if (timeframe === '1M') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (timeframe === '1Y') {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1))
    }
    if (newDate > new Date() && direction === 'next') return
    setChartContextDate(newDate)
  }

  const isNextDisabled = () => {
    const now = new Date()
    if (timeframe === '1D') return chartContextDate.toDateString() === now.toDateString()
    if (timeframe === '1W') return chartContextDate >= now
    if (timeframe === '1M') return chartContextDate.getMonth() === now.getMonth() && chartContextDate.getFullYear() === now.getFullYear()
    if (timeframe === '1Y') return chartContextDate.getFullYear() === now.getFullYear()
    return false
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r flex-shrink-0">
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          <Navbar />

          <main className="flex-1 overflow-auto p-4 lg:p-6 space-y-6 lg:space-y-8">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              {/* LEFT */}
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Dashboard Overview</h1>
                <p className="text-gray-600 text-sm lg:text-base">{formatDate(currentDate)}</p>
              </div>

              {/* RIGHT */}
              <div className="flex gap-2">
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

            {/* TRADER DASHBOARD ANALYTICS */}
            <div className="space-y-6 lg:space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-400 font-medium">{periodStats.title1}</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-400">{formatCurrency(periodStats.value1)}</p>
                  <p className="text-xs text-gray-500 mt-1">{periodStats.label1}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-400 font-medium">{periodStats.title2}</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-400">{formatCurrency(periodStats.value2)}</p>
                  <p className="text-xs text-gray-500 mt-1">{periodStats.label2}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-400 font-medium">{periodStats.title3}</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-400">{formatCurrency(periodStats.value3)}</p>
                  <p className="text-xs text-gray-500 mt-1">{periodStats.label3}</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 text-white border-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-400 font-medium">{periodStats.title4}</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-400">{formatCurrency(periodStats.value4)}</p>
                  <p className="text-xs text-gray-500 mt-1">{periodStats.label4}</p>
                </CardContent>
              </Card>
            </div>

            {/* TRADING CHART */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Market Trend Analysis
                    <span className="flex items-center gap-1 text-xs font-normal text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full ml-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      LIVE
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-gray-500">Viewing Data for: <strong className="text-gray-700">{getContextLabel()}</strong></p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigateChartContext('prev')} className="h-7 w-7 p-0">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigateChartContext('next')} disabled={isNextDisabled()} className="h-7 w-7 p-0">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-md">
                  {['1D', '1W', '1M', '1Y'].map(tf => (
                    <button
                      key={tf}
                      onClick={() => {
                        setTimeframe(tf)
                        setChartContextDate(new Date())
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-sm transition-all ${timeframe === tf ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] w-full p-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{fill: '#6b7280', fontSize: 12}} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', color: '#fff', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value) => [formatCurrency(value), 'Revenue']}
                        />
                        <Bar 
                          dataKey="sales" 
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={40}
                          isAnimationActive={true}
                          animationDuration={1500}
                          animationEasing="ease-out"
                          onClick={handleBarClick}
                          cursor="pointer"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.trend === 'up' ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400 flex-col">
                      <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                      <p>No trading data available for {timeframe}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* FULL MONTH CALENDAR - CONDITIONAL */}
            {showCalendar && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      <div className="flex items-center gap-3">
                        <span>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <div className={`flex items-center transition-all ${refreshing ? 'animate-pulse opacity-50' : ''}`}>
                          <span className="text-xl font-bold text-green-600">
                            {formatCurrency(monthly?.revenue)}
                          </span>
                        </div>
                      </div>
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
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>Has Sales</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-200 rounded-full" />
                      <span>No Sales</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span>Today</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-sm font-semibold text-gray-600">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 35 }, (_, index) => {
                      const date = new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth(),
                        index - new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 1
                      )
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                      const isToday = date.toDateString() === new Date().toDateString()
                      const isFutureDate = date > new Date(new Date().setHours(0, 0, 0, 0))
                      const dateStr = date.getFullYear() + '-' +
                        String(date.getMonth() + 1).padStart(2, '0') + '-' +
                        String(date.getDate()).padStart(2, '0')
                      const daySales = allBills?.filter(bill => {
                        if (!bill.created_at) return false
                        const billDate = new Date(bill.created_at)
                        const billDateStr = billDate.getFullYear() + '-' +
                          String(billDate.getMonth() + 1).padStart(2, '0') + '-' +
                          String(billDate.getDate()).padStart(2, '0')
                        return billDateStr === dateStr
                      }).reduce((sum, bill) => sum + (bill.subtotal || 0), 0) || 0

                      if (!isCurrentMonth) {
                        return <div key={index} className="p-2" />
                      }

                      return (
                        <div
                          key={index}
                          onClick={() => {
                            if (isFutureDate) return // Don't allow clicking future dates

                            setSelectedDate(date)
                            const dayBills = allBills?.filter(bill => {
                              if (!bill.created_at) return false
                              const billDate = new Date(bill.created_at)
                              const billDateStr = billDate.getFullYear() + '-' +
                                String(billDate.getMonth() + 1).padStart(2, '0') + '-' +
                                String(billDate.getDate()).padStart(2, '0')
                              return billDateStr === dateStr
                            }) || []
                            setDailyData({
                              date: dateStr,
                              bills: dayBills,
                              totalSales: dayBills.reduce((sum, bill) => sum + (bill.subtotal || 0), 0),
                              totalBills: dayBills.length
                            })
                            setShowDailyDetails(true)
                          }}
                          className={`p-2 rounded text-sm transition-colors ${isFutureDate
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                              : isToday
                                ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                                : daySales > 0
                                  ? 'bg-green-100 hover:bg-green-200 cursor-pointer'
                                  : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
                            }`}
                        >
                          <div className="text-center">
                            <div>{date.getDate()}</div>
                            {daySales > 0 && !isFutureDate && (
                              <div className="text-xs mt-1">
                                {formatCurrency(daySales)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* DAILY DETAILS DIALOG */}
            <Dialog open={showDailyDetails} onOpenChange={setShowDailyDetails}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {selectedDate && formatDate(selectedDate)} - Daily Details
                  </DialogTitle>
                  <DialogDescription>
                    View detailed information for this date
                  </DialogDescription>
                </DialogHeader>
                {dailyData && (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(dailyData.totalSales)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Bills</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {dailyData.totalBills}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Avg Order</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(dailyData.totalBills > 0 ? dailyData.totalSales / dailyData.totalBills : 0)}
                        </p>
                      </div>
                    </div>

                    {/* Bills List */}
                    <div>
                      <h4 className="font-semibold mb-3">Bills for this date</h4>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {dailyData.bills.length > 0 ? (
                          dailyData.bills.map((bill) => (
                            <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium">#{bill.bill_no || bill.id}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(bill.created_at).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(bill.subtotal)}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 rounded text-sm capitalize">
                                  {formatPaymentType(bill.payment_type)}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>No bills found for this date</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={() => setShowDailyDetails(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* MONTHLY SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <SummaryCard
                title={`Revenue for ${currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}
                value={showMonthlyRevenue ? formatCurrency(monthly?.revenue) : '••••••'}
                icon={IndianRupee}
                growth={monthly?.growth}
                showToggle={true}
                isHidden={!showMonthlyRevenue}
                onToggle={() => setShowMonthlyRevenue(!showMonthlyRevenue)}
                loading={refreshing}
              />
              <SummaryCard
                title={`Bills for ${currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`}
                value={monthly?.bills}
                icon={ShoppingCart}
                loading={refreshing}
              />
              <SummaryCard
                title="Menu Items"
                value={stats.totalMenuItems}
                icon={Utensils}
              />
            </div>


            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

function SummaryCard({ title, value, icon: Icon, growth, showToggle, isHidden, onToggle, loading }) {
  return (
    <Card className={showToggle ? 'cursor-pointer' : ''}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-center gap-2">
            {showToggle && (
              <button
                onClick={onToggle}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-all group"
                aria-label={isHidden ? 'Show amount' : 'Hide amount'}
              >
                {isHidden ? (
                  <EyeOff className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                )}
              </button>
            )}
            <div className="p-2 bg-gray-50 rounded-lg">
              <Icon className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        {loading && !value ? (
          <div className="h-9 w-3/4 bg-gray-200 animate-pulse rounded-md mt-1" />
        ) : (
          <h3 className={`text-3xl font-bold tracking-tight transition-all duration-300 ${loading ? 'animate-pulse opacity-70' : 'opacity-100'}`}>
            {value}
          </h3>
        )}

        {growth !== undefined && (
          <div className={`flex items-center gap-1.5 text-sm font-medium ${growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {growth >= 0 ? <TrendingUp size={16} strokeWidth={2.5} /> : <TrendingDown size={16} strokeWidth={2.5} />}
            <span>{Math.abs(growth)}% vs last month</span>
          </div>
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
