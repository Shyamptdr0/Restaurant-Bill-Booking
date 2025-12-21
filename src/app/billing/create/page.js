'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { ArrowLeft, Plus, Minus, Search, Trash2, Receipt } from 'lucide-react'
import Link from 'next/link'

export default function CreateBill() {
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [paymentType, setPaymentType] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchMenuItems()
  }, [])

  useEffect(() => {
    filterItems()
  }, [menuItems, searchTerm, categoryFilter])

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu-items')
      const result = await response.json()
      const allMenuItems = result.data || []
      
      // Filter out inactive items - only show active items in create bill
      const activeMenuItems = allMenuItems.filter(item => item.status !== 'inactive')
      setMenuItems(activeMenuItems)
      
      // Extract unique categories from active items
      const uniqueCategories = [...new Set(activeMenuItems?.map(item => item.category) || [])]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching menu items:', error)
    } finally {
      setLoadingItems(false)
    }
  }

  const filterItems = () => {
    let filtered = menuItems

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    setFilteredItems(filtered)
  }

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id)
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCart([...cart, { ...item, quantity: 1 }])
    }
  }

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
    } else {
      setCart(cart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ))
    }
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const calculateTax = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity
      const sgstAmount = item.sgst ? (itemTotal * item.sgst / 100) : 0
      const cgstAmount = item.cgst ? (itemTotal * item.cgst / 100) : 0
      return sum + sgstAmount + cgstAmount
    }, 0)
  }

  const calculateSgst = () => {
    return cart.reduce((sum, item) => {
      if (!item.sgst) return sum
      return sum + (item.price * item.quantity * item.sgst / 100)
    }, 0)
  }

  const calculateCgst = () => {
    return cart.reduce((sum, item) => {
      if (!item.cgst) return sum
      return sum + (item.price * item.quantity * item.cgst / 100)
    }, 0)
  }

  const calculateServiceTax = () => {
    // Fixed service tax rate of 5% as shown in the image
    const serviceTaxRate = 0.05
    return cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity
      return sum + (itemTotal * serviceTaxRate)
    }, 0)
  }

  const calculateServiceTaxPerItem = (item) => {
    const serviceTaxRate = 0.05
    const itemTotal = item.price * item.quantity
    return itemTotal * serviceTaxRate
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateServiceTax()
  }

  const generateBill = async () => {
    if (cart.length === 0) {
      alert('Please add items to the bill')
      return
    }

    setLoading(true)

    try {
      const subtotal = calculateSubtotal()
      const taxAmount = calculateTax()
      const serviceTaxAmount = calculateServiceTax()
      const totalAmount = calculateTotal()

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtotal,
          sgst_amount: calculateSgst(),
          cgst_amount: calculateCgst(),
          tax_amount: taxAmount,
          service_tax_amount: serviceTaxAmount,
          total_amount: totalAmount,
          payment_type: paymentType,
          items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            service_tax: calculateServiceTaxPerItem(item)
          }))
        })
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Redirect to print page
      const billId = result.data.id
      router.push(`/billing/print/${billId}`)
    } catch (error) {
      console.error('Error generating bill:', error)
      alert('Error generating bill: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingItems) {
    return (
      <AuthGuard>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <img src="/PM-logo.png" alt="ParamMitra Restaurant" className="h-16 w-auto animate-pulse" />
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r">
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="mb-4 lg:mb-6">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Create Bill</h1>
              <p className="text-gray-600 text-sm lg:text-base">Add items and generate customer bill</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              {/* Menu Items Section */}
              <div className="flex-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Receipt className="h-5 w-5 mr-2" />
                      Menu Items
                    </CardTitle>
                    <CardDescription>Select items to add to bill</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search menu items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Menu Items Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 max-h-96 overflow-y-auto">
                      {filteredItems.length === 0 ? (
                        <div className="col-span-2 text-center py-8">
                          <p className="text-gray-500">No menu items found</p>
                        </div>
                      ) : (
                        filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{item.name}</h4>
                                <p className="text-sm text-gray-600">{item.category}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addToCart(item)}
                                className="flex items-center"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                            <div className=" justify-between items-center">
                              <span className="font-semibold">₹{item.price.toFixed(2)}</span>
                              <div className=" ">
                                {item.tax > 0 && (
                                  <span className="text-xs text-gray-500">{item.tax}% GST</span>
                                )}
                                {item.sgst > 0 && item.cgst > 0 && (
                                  <span className="text-xs text-gray-500">
                                    (SGST: {item.sgst}% + CGST: {item.cgst}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bill Summary Section */}
              <div className="min-h-[600px] w-[450px] ">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Bill Summary</CardTitle>
                    <CardDescription>Review and generate bill</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cart.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No items in cart</p>
                        <p className="text-sm text-gray-400 mt-2">Add items from the menu to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Cart Items */}
                        <div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>SGST</TableHead>
                                <TableHead>CGST</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cart.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-8 text-center">{item.quantity}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell>₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                                  <TableCell>
                                    {item.sgst ? `₹${(item.price * item.quantity * item.sgst / 100).toFixed(2)}` : '-'}
                                    {item.sgst && <div className="text-xs text-gray-500">({item.sgst}%)</div>}
                                  </TableCell>
                                  <TableCell>
                                    {item.cgst ? `₹${(item.price * item.quantity * item.cgst / 100).toFixed(2)}` : '-'}
                                    {item.cgst && <div className="text-xs text-gray-500">({item.cgst}%)</div>}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => removeFromCart(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Totals */}
                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{calculateSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST:</span>
                            <span>₹{calculateSgst().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CGST:</span>
                            <span>₹{calculateCgst().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Total Tax:</span>
                            <span>₹{calculateTax().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span>₹{calculateTotal().toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Payment Type */}
                        <div className="space-y-2">
                          <Label htmlFor="payment">Payment Type</Label>
                          <Select value={paymentType} onValueChange={setPaymentType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Generate Bill Button */}
                        <Button
                          onClick={generateBill}
                          disabled={loading || cart.length === 0}
                          className="w-full"
                        >
                          {loading ? 'Generating...' : 'Generate Bill'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
