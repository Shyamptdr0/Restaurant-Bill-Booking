'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { 
  Calendar, 
  Search, 
  Filter, 
  TrendingUp, 
  Package, 
  IndianRupee, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  Utensils,
  LayoutGrid,
  List,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { AuthGuard } from '@/components/auth-guard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth, startOfToday, endOfToday, subMonths, eachDayOfInterval } from 'date-fns'

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']

export default function ItemAnalysis() {
  const [viewType, setViewType] = useState('daily') // 'daily' or 'monthly'
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ items: [], summary: {}, categoryBreakdown: [] })
  const [sortConfig, setSortConfig] = useState({ key: 'quantity', direction: 'desc' })
  const [layoutMode, setLayoutMode] = useState('grid') // 'table' or 'grid'

  useEffect(() => {
    fetchAnalysisData()
  }, [viewType, selectedDate, selectedMonth])

  const fetchAnalysisData = async () => {
    setLoading(true)
    try {
      let start, end
      if (viewType === 'daily') {
        const d = new Date(selectedDate)
        d.setHours(0, 0, 0, 0)
        start = d.toISOString()
        
        const de = new Date(selectedDate)
        de.setHours(23, 59, 59, 999)
        end = de.toISOString()
      } else {
        const [year, month] = selectedMonth.split('-').map(Number)
        const d = new Date(year, month - 1, 1)
        d.setHours(0, 0, 0, 0)
        start = d.toISOString()
        
        const de = new Date(year, month, 0) // last day of month
        de.setHours(23, 59, 59, 999)
        end = de.toISOString()
      }

      const response = await fetch(`/api/item-analysis?startDate=${start}&endDate=${end}`)
      const result = await response.json()
      
      if (result.error) throw new Error(result.error)
      setData(result.data)
    } catch (error) {
      console.error('Error fetching analysis:', error)
      toast.error('Failed to load analysis data')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (key) => {
    let direction = 'desc'
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  const filteredItems = useMemo(() => {
    let items = [...data.items]
    
    if (searchTerm) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter)
    }

    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })

    return items
  }, [data.items, searchTerm, categoryFilter, sortConfig])

  const categories = useMemo(() => {
    const cats = new Set(data.items.map(item => item.category))
    return ['all', ...Array.from(cats)]
  }, [data.items])


  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50/50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Item Sales Analysis</h1>
                <p className="text-gray-500 mt-1">Detailed performance report of your menu items</p>
              </div>
            </div>

            {/* Filter Section */}
            <Card className="no-print border-none shadow-sm bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Analysis Type</label>
                    <Select value={viewType} onValueChange={setViewType}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily Report</SelectItem>
                        <SelectItem value="monthly">Monthly Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {viewType === 'daily' ? (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Select Date</label>
                      <Input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Select Month</label>
                      <Input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Category Filter</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Search Item</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="Search menu name..." 
                        className="pl-9 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Items Sold</p>
                      <h3 className="text-2xl font-bold mt-1">{loading ? '...' : data.summary.totalItemsSold}</h3>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                      <h3 className="text-2xl font-bold mt-1 text-green-600">
                        {loading ? '...' : formatCurrency(data.summary.totalRevenue)}
                      </h3>
                    </div>
                    <div className="p-3 bg-green-100 rounded-xl">
                      <IndianRupee className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Unique Items</p>
                      <h3 className="text-2xl font-bold mt-1">{loading ? '...' : data.summary.itemCount}</h3>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <List className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Top Category</p>
                      <h3 className="text-2xl font-bold mt-1 truncate max-w-[150px]">
                        {loading ? '...' : data.summary.topCategory}
                      </h3>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Top 10 Selling Items</CardTitle>
                  <CardDescription>By quantity sold in selected period</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center animate-pulse bg-gray-50 rounded" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.items.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={100} 
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                          dataKey="quantity" 
                          fill="#ea580c" 
                          radius={[0, 4, 4, 0]} 
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Revenue by Category</CardTitle>
                  <CardDescription>Financial distribution across menu groups</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {loading ? (
                    <div className="h-full flex items-center justify-center animate-pulse bg-gray-50 rounded" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           formatter={(value) => formatCurrency(value)}
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Sales Report */}
            <Card className="border-none shadow-sm overflow-hidden bg-transparent shadow-none">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 no-print px-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detailed Item Sales Report</h2>
                  <p className="text-sm text-gray-500">Complete itemized breakdown for {viewType === 'daily' ? selectedDate : selectedMonth}</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                  <Button 
                    variant={layoutMode === 'table' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setLayoutMode('table')}
                    className="px-3"
                  >
                    <List className="w-4 h-4 mr-2" />
                    Table
                  </Button>
                  <Button 
                    variant={layoutMode === 'grid' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setLayoutMode('grid')}
                    className="px-3"
                  >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Grid
                  </Button>
                </div>
              </div>

              {layoutMode === 'table' ? (
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-gray-50/80">
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:text-orange-600 transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            Item Name <ArrowUpDown className="inline w-3 h-3 ml-1" />
                          </TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:text-orange-600 transition-colors"
                            onClick={() => handleSort('quantity')}
                          >
                            Qty Sold <ArrowUpDown className="inline w-3 h-3 ml-1" />
                          </TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:text-orange-600 transition-colors"
                            onClick={() => handleSort('totalRevenue')}
                          >
                            Total Revenue <ArrowUpDown className="inline w-3 h-3 ml-1" />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          [...Array(5)].map((_, i) => (
                            <TableRow key={i} className="animate-pulse">
                              <TableCell colSpan={5} className="h-12 bg-gray-50/50" />
                            </TableRow>
                          ))
                        ) : filteredItems.length > 0 ? (
                          filteredItems.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal capitalize bg-gray-100/50">
                                  {item.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                              <TableCell className="text-right text-gray-500">₹{item.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-bold text-gray-900">
                                {formatCurrency(item.totalRevenue)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="w-8 h-8 opacity-20" />
                                <p>No sales found for this period</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <div key={i} className="h-32 animate-pulse bg-white border rounded-lg shadow-sm" />
                    ))
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors flex flex-col justify-between shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">{item.name}</h4>
                            <p className="text-sm text-gray-500 mt-0.5 capitalize">{item.category}</p>
                          </div>
                          <div className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
                            Sold: {item.quantity}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-50">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Revenue</span>
                            <span className="font-bold text-green-600">{formatCurrency(item.totalRevenue)}</span>
                          </div>
                          <div className="text-right flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Price</span>
                            <span className="font-medium text-gray-900 text-sm">₹{item.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-200 flex flex-col items-center gap-3 text-gray-400">
                       <AlertCircle className="w-10 h-10 opacity-20" />
                       <p className="font-medium">No results to display in grid</p>
                    </div>
                  )}
                </div>
              )}
            </Card>


            {/* Extra spacing for footer */}
            <div className="h-10 no-print" />
          </main>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          main {
            padding: 0 !important;
            overflow: visible !important;
          }
          .flex-1 {
             overflow: visible !important;
          }
          .h-screen {
            height: auto !important;
          }
          aside, nav {
            display: none !important;
          }
        }
      `}</style>
    </AuthGuard>
  )
}
