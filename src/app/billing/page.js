'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AuthGuard } from '@/components/auth-guard'
import { Sidebar } from '@/components/sidebar'
import { Navbar } from '@/components/navbar'
import { Plus, Minus, Trash2, Save, ArrowLeft, Utensils, RotateCcw } from 'lucide-react'

function BillingPageContent() {
  const searchParams = useSearchParams()
  const tableId = searchParams.get('tableId')
  const tableName = searchParams.get('tableName')
  const section = searchParams.get('section')

  const [menuItems, setMenuItems] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [existingBill, setExistingBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchMenuItems()
    if (tableId) {
      fetchExistingBill()
    }
  }, [tableId])

  const fetchExistingBill = async () => {
    try {
      const response = await fetch(`/api/bills?table_id=${tableId}&status=running&_t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          const bill = data.data[0]
          setExistingBill(bill)
          // Load existing bill items
          const itemsResponse = await fetch(`/api/bills/${bill.id}/items?_t=${Date.now()}`)
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json()
            if (itemsData.data) {
              setCartItems(itemsData.data.map(item => ({
                ...item,
                id: item.item_id,
                name: item.item_name,
                category: item.item_category,
                price: item.price,
                quantity: item.quantity
              })))
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching existing bill:', error)
    }
  }

  const fetchMenuItems = async () => {
    try {
      const response = await fetch('/api/menu-items')
      if (response.ok) {
        const data = await response.json()
        setMenuItems(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (menuItem) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => String(item.id) === String(menuItem.id))
      if (existingItem) {
        // Update quantity of existing item
        return prev.map(item =>
          String(item.id) === String(menuItem.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      // Add new item
      return [...prev, { ...menuItem, quantity: 1 }]
    })
  }

  const updateQuantity = (itemId, change) => {
    setCartItems(prev => {
      console.log('Updating quantity for item:', itemId, 'change:', change)
      const updatedItems = prev.map(item => {
        if (String(item.id) === String(itemId)) {
          const newQuantity = item.quantity + change
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
        }
        return item
      }).filter(Boolean) // Filter out null items
      
      console.log('Updated cart:', updatedItems)
      return updatedItems
    })
  }

  const removeFromCart = (itemId) => {
    setCartItems(prev => {
      const updatedItems = prev.filter(item => String(item.id) !== String(itemId))
      console.log('Removing item:', itemId, 'Remaining items:', updatedItems)
      return updatedItems
    })
  }

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subtotal * 0.05 // 5% tax
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const resetTable = async () => {
    if (!confirm('Are you sure you want to reset this table? This will clear all items and reset the table to blank status.')) {
      return
    }

    setSaving(true)
    try {
      if (existingBill) {
        // Delete all bill items
        await fetch(`/api/bills/${existingBill.id}/items`, {
          method: 'DELETE'
        })

        // Update bill status to cancelled or delete the bill
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
      window.location.href = '/tables'
    } catch (error) {
      console.error('Error resetting table:', error)
      alert('Failed to reset table')
    } finally {
      setSaving(false)
    }
  }

  const saveBill = async () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item')
      return
    }

    setSaving(true)
    try {
      const { subtotal, tax, total } = calculateTotals()
      
      if (existingBill) {
        // Get existing bill items
        const existingItemsResponse = await fetch(`/api/bills/${existingBill.id}/items`)
        const existingItemsData = await existingItemsResponse.json()
        const existingItems = existingItemsData.data || []

        // Clear existing bill items
        await fetch(`/api/bills/${existingBill.id}/items`, {
          method: 'DELETE'
        })

        // Add all current cart items as new items
        const itemsResponse = await fetch('/api/bill-items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bill_id: existingBill.id,
            items: cartItems.map(item => ({
              item_id: item.id,
              item_name: item.name,
              item_category: item.category,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity
            }))
          }),
        })

        if (itemsResponse.ok) {
          // Update bill totals
          await fetch(`/api/bills/${existingBill.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subtotal,
              tax_amount: tax,
              total_amount: total
            }),
          })
        }
      } else {
        // Create new bill
        const response = await fetch('/api/bills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table_id: tableId,
            table_name: tableName,
            section: section,
            status: 'running',
            subtotal,
            tax_amount: tax,
            total_amount: total,
            payment_type: 'cash',
            items: cartItems.map(item => ({
              id: item.id,
              name: item.name,
              category: item.category,
              price: item.price,
              quantity: item.quantity
            }))
          }),
        })

        if (!response.ok) {
          alert('Failed to save bill')
          return
        }
      }

      // Navigate back to tables
      window.location.href = '/tables'
    } catch (error) {
      console.error('Error saving bill:', error)
      alert('Failed to save bill')
    } finally {
      setSaving(false)
    }
  }

  const { subtotal, tax, total } = calculateTotals()

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex h-screen bg-gray-100">
          <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r flex-shrink-0">
            <Sidebar />
          </div>
          <div className="flex flex-1 flex-col min-w-0">
            <Navbar />
            <main className="flex-1 overflow-auto bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading menu...</p>
              </div>
            </main>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        <div className="hidden lg:flex h-full w-64 flex-col bg-gray-50 border-r flex-shrink-0">
          <Sidebar />
        </div>

        <div className="flex flex-1 flex-col min-w-0">
          <Navbar />

          <main className="flex-1 overflow-auto bg-white">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tables
                  </Button>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-800">
                      {tableName} - {section}
                    </h1>
                    <p className="text-sm text-gray-600">Add items to order</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={resetTable}
                    disabled={saving}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Table
                  </Button>
                  <Button 
                    onClick={saveBill}
                    disabled={saving || cartItems.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Order'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Menu Items */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Utensils className="w-5 h-5" />
                        Menu Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {menuItems.map((item) => (
                          <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div>
                                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                                  <p className="text-sm text-gray-600">{item.category}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-blue-600">
                                    ₹{item.price}
                                  </span>
                                  <Button 
                                    size="sm"
                                    onClick={() => addToCart(item)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cart */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {cartItems.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No items added yet
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {cartItems.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{item.name}</h4>
                                <p className="text-sm text-gray-600">₹{item.price} x {item.quantity}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax (5%):</span>
                              <span>₹{tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                              <span>Total:</span>
                              <span>₹{total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillingPageContent />
    </Suspense>
  )
}
