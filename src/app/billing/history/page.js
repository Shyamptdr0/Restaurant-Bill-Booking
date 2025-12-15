'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { ArrowLeft, Search, Eye, Printer, Calendar, IndianRupee } from 'lucide-react'
import Link from 'next/link'

export default function BillHistory() {
  const [bills, setBills] = useState([])
  const [filteredBills, setFilteredBills] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalBills: 0,
    totalRevenue: 0,
    todayRevenue: 0
  })

  useEffect(() => {
    fetchBills()
  }, [])

  useEffect(() => {
    filterBills()
  }, [bills, searchTerm, paymentFilter, dateFilter])

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/bills')
      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }
      
      setBills(result.data || [])
      
      // Calculate stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayBills = result.data?.filter(bill => {
        const billDate = new Date(bill.created_at)
        return billDate >= today
      }) || []
      
      setStats({
        totalBills: result.data?.length || 0,
        totalRevenue: result.data?.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0) || 0,
        todayRevenue: todayBills.reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0)
      })
    } catch (error) {
      console.error('Error fetching bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBills = () => {
    let filtered = bills

    // Search filter (by bill number)
    if (searchTerm) {
      filtered = filtered.filter(bill =>
        bill.bill_no.toString().includes(searchTerm)
      )
    }

    // Payment type filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(bill => bill.payment_type === paymentFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.created_at)
        
        switch (dateFilter) {
          case 'today':
            return billDate >= today
          case 'week':
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return billDate >= weekAgo
          case 'month':
            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return billDate >= monthAgo
          default:
            return true
        }
      })
    }

    setFilteredBills(filtered)
  }

  const handlePrint = (billId) => {
    window.open(`/billing/print/${billId}`, '_blank')
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Bill History</h1>
              <p className="text-gray-600">View and search previous bills</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBills}</div>
                  <p className="text-xs text-muted-foreground">
                    All time bills generated
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    All time revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{stats.todayRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Revenue generated today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by bill number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bills Table */}
            <Card>
              <CardHeader>
                <CardTitle>Bill History ({filteredBills.length})</CardTitle>
                <CardDescription>
                  {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredBills.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No bills found</p>
                    <Link href="/billing/create" className="mt-4 inline-block">
                      <Button>Create your first bill</Button>
                    </Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">#{bill.bill_no}</TableCell>
                          <TableCell>
                            {new Date(bill.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(bill.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₹{parseFloat(bill.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className="capitalize px-2 py-1 bg-gray-100 rounded text-sm">
                              {bill.payment_type}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Link href={`/billing/print/${bill.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrint(bill.id)}
                              >
                                <Printer className="h-4 w-4 mr-1" />
                                Print
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
