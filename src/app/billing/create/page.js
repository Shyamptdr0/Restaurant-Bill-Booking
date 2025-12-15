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
      const response = await fetch('/api/menu-items?status=active')
      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }
      
      setMenuItems(result.data || [])
      
      // Extract unique categories
      const uniqueCategories = [...new Set(result.data?.map(item => item.category) || [])]
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
      return sum + (itemTotal * item.tax / 100)
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
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
      const totalAmount = calculateTotal()

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_type: paymentType,
          items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        }),
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Redirect to print page
      router.push(`/billing/print/${result.data.id}`)
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
              <h1 className="text-3xl font-bold text-gray-900">Create Bill</h1>
              <p className="text-gray-600">Add items and generate customer bill</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu Items Section */}
              <div className="lg:col-span-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
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
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">₹{item.price.toFixed(2)}</span>
                              {item.tax > 0 && (
                                <span className="text-xs text-gray-500">{item.tax}% tax</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bill Summary Section */}
              <div>
                <Card>
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
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
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
                            <span>Tax:</span>
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
