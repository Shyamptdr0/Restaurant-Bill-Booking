'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { ArrowLeft, Plus, Minus, Search, Trash2, Receipt, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRealtimeItemsSync } from '@/hooks/useWebSocket'

function CreateBillContent() {
  const searchParams = useSearchParams()
  const tableId = searchParams.get('tableId')
  const tableName = searchParams.get('tableName')
  const section = searchParams.get('section')
  
  const [menuItems, setMenuItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [cart, setCart] = useState([])
  const [existingBill, setExistingBill] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [paymentType, setPaymentType] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(true)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchMenuItems()
    if (tableId) {
      fetchTemporaryItems()
    }
  }, [tableId])

  useEffect(() => {
    filterItems()
  }, [menuItems, searchTerm, categoryFilter])

  // Real-time synchronization - temporarily disabled to fix duplicate issues
  // useRealtimeItemsSync(tableId, (updatedItems) => {
  //   // Only update cart if it's not a local update (to prevent interference)
  //   if (!isLocalUpdate) {
  //     setCart(updatedItems)
  //   }
  // })

  const fetchTemporaryItems = async () => {
    try {
      const response = await fetch(`/api/temporary-items?table_id=${tableId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          // Group items by item_id to handle potential duplicates
          const groupedItems = {}
          data.data.forEach(item => {
            const itemId = item.item_id
            if (groupedItems[itemId]) {
              // If item already exists, add quantity
              groupedItems[itemId].quantity += item.quantity
            } else {
              // Create new item entry with unique identifier
              groupedItems[itemId] = {
                cartId: `${itemId}_${Date.now()}_${Math.random()}`, // Unique identifier for cart
                id: item.item_id,
                name: item.item_name,
                category: item.item_category,
                price: item.price,
                quantity: item.quantity
              }
            }
          })
          
          // Convert grouped items back to array
          setCart(Object.values(groupedItems))
        }
      }
    } catch (error) {
      console.error('Error fetching temporary items:', error)
    }
  }

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
      // Update existing item quantity, keep the same cartId
      const newCart = cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      )
      setCart(newCart)
      syncToDatabase(newCart)
    } else {
      // Add new item with unique cartId
      const newCart = [...cart, { 
        ...item, 
        quantity: 1,
        cartId: `${item.id}_${Date.now()}_${Math.random()}` // Unique identifier for cart
      }]
      setCart(newCart)
      syncToDatabase(newCart)
    }
  }

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
    } else {
      const newCart = cart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
      setCart(newCart)
      syncToDatabase(newCart)
    }
  }

  const removeFromCart = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId)
    setCart(newCart)
    syncToDatabase(newCart)
  }

  const syncToDatabase = async (cartItems) => {
    if (!tableId) return
    
    try {
      const response = await fetch('/api/temporary-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity
          }))
        })
      })
      
      if (!response.ok) {
        console.error('Failed to sync items to database')
      }
    } catch (error) {
      console.error('Error syncing items:', error)
    }
  }

  // Helper function to round up to next integer
  const roundUpToNext = (amount) => {
    return Math.ceil(amount)
  }

  const calculateSubtotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    return subtotal // No rounding for subtotal
  }

  const calculateTax = () => {
    // Calculate 5% GST on total subtotal and split equally
    const subtotal = calculateSubtotal()
    const totalGst = subtotal * 0.05 // 5% of subtotal
    return totalGst
  }

  const calculateSgst = () => {
    // Calculate 2.5% SGST on total subtotal
    const subtotal = calculateSubtotal()
    return subtotal * 0.025 // 2.5% of subtotal
  }

  const calculateCgst = () => {
    // Calculate 2.5% CGST on total subtotal
    const subtotal = calculateSubtotal()
    return subtotal * 0.025 // 2.5% of subtotal
  }

  const calculateServiceTax = () => {
    // Fixed service tax rate of 5% as shown in the image
    const serviceTaxRate = 0.05
    return cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity
      return sum + (itemTotal * serviceTaxRate)
    }, 0) // No rounding for service tax
  }

  const calculateServiceTaxPerItem = (item) => {
    const serviceTaxRate = 0.05
    const itemTotal = item.price * item.quantity
    return itemTotal * serviceTaxRate // No rounding for service tax per item
  }

  const calculateTotal = () => {
    // Only include subtotal (no tax calculations)
    const total = calculateSubtotal()
    return roundUpToNext(total) // Only round the total amount
  }

  const resetTable = () => {
    setIsResetConfirmOpen(true)
  }

  const confirmResetTable = async () => {
    setLoading(true)
    try {
      // Clear temporary items from database
      if (tableId) {
        await fetch(`/api/temporary-items?table_id=${tableId}`, {
          method: 'DELETE'
        })
      }
      
      if (existingBill) {
        // Delete all bill items
        await fetch(`/api/bills/${existingBill.id}/items`, {
          method: 'DELETE'
        })

        // Update bill status to cancelled
        await fetch(`/api/bills/${existingBill.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'cancelled'
          }),
        })
      }

      // Update table status to blank
      await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tableName,
          section: section,
          status: 'blank'
        }),
      })

      // Navigate back to tables
      router.push('/tables')
    } catch (error) {
      console.error('Error resetting table:', error)
      alert('Failed to reset table')
    } finally {
      setLoading(false)
      setIsResetConfirmOpen(false)
    }
  }

  const saveItems = async () => {
    if (cart.length === 0) {
      alert('Please add items to save')
      return
    }

    setLoading(true)

    try {
      // Save items to temporary storage in database
      const response = await fetch('/api/temporary-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          table_name: tableName,
          section: section,
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity
          }))
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save items to database')
      }
      
      // Update table status to running if we have a tableId
      if (tableId) {
        await fetch(`/api/tables/${tableId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: tableName,
            section: section,
            status: 'running'
          }),
        })
      }
      
      console.log('Items saved to temporary storage')
      
      // Navigate back to tables
      router.push('/tables')
    } catch (error) {
      console.error('Error saving items:', error)
      alert('Error saving items: ' + error.message)
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
              <div className="flex items-center justify-between mb-2">
                <Link href="/tables" className="flex items-center text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Tables
                </Link>
                {tableId && (
                  <Button 
                    onClick={resetTable}
                    disabled={loading}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Table
                  </Button>
                )}
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {tableName ? `${tableName} - ${section}` : 'Create Bill'}
                </h1>
                <p className="text-gray-600 text-sm lg:text-base">
                  {tableName ? 'Add items and update order' : 'Add items and generate customer bill'}
                </p>
              </div>
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
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cart.map((item) => (
                                <TableRow key={item.cartId || item.id}>
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
                          <div className="flex justify-between font-bold text-lg">
                            <span>Total:</span>
                            <span>₹{calculateTotal().toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Save Items Button */}
                        <Button
                          onClick={saveItems}
                          disabled={loading || cart.length === 0}
                          className="w-full"
                        >
                          {loading ? 'Saving...' : 'Save Items'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>

        {/* Reset Confirmation Dialog */}
        <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <DialogContent className="sm:max-w-[350px] border-0 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                Reset Table Confirmation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-700">Are you sure you want to reset this table?</p>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmResetTable}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Table'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}

export default function CreateBill() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateBillContent />
    </Suspense>
  )
}
